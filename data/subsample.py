import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from itertools import combinations
from collections import defaultdict

DATA_DIR = Path(__file__).parent.resolve()
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

TARGET_ARTICLES = 4000
TARGET_CUSTOMERS = 3000
SEED = 42


def format_article_id(val) -> str:
    """Ensure article_id is a 10-digit string with leading zeros."""
    val_str = str(val).split('.')[0]
    return val_str.zfill(10)


def generate_synthetic_data():
    """Generates synthetic data matching H&M schema if raw dataset is not present."""
    print("[INFO] Raw dataset files not found in /data/raw. Generating synthetic sample dataset...")
    np.random.seed(SEED)

    # 1. Articles
    categories = ["Tops", "Trousers", "Dresses", "Shoes", "Jackets", "Accessories", "Knitwear", "Skirts"]
    colors = ["Black", "White", "Blue", "Red", "Beige", "Green", "Grey", "Pink"]
    departments = ["Womenswear", "Menswear", "Baby/Children", "Sportswear", "Divided"]

    article_rows = []
    for i in range(1, TARGET_ARTICLES + 1):
        art_id = str(i).zfill(10)
        cat = np.random.choice(categories)
        col = np.random.choice(colors)
        dept = np.random.choice(departments)
        art_rows_dict = {
            "article_id": art_id,
            "product_code": str(100000 + i // 3),
            "prod_name": f"{col} {cat} {i}",
            "product_type_no": str(200 + hash(cat) % 50),
            "product_type_name": cat,
            "graphical_appearance_no": "1010016",
            "graphical_appearance_name": "Solid",
            "colour_group_code": str(10 + hash(col) % 20),
            "colour_group_name": col,
            "perceived_colour_value_id": "4",
            "perceived_colour_value_name": "Dark",
            "perceived_colour_master_id": "5",
            "perceived_colour_master_name": col,
            "department_no": str(1000 + hash(dept) % 100),
            "department_name": dept,
            "index_code": "A",
            "index_name": "Ladieswear",
            "index_group_no": "1",
            "index_group_name": "Ladieswear",
            "section_no": "15",
            "section_name": "Womens Every Day",
            "garment_group_no": "1002",
            "garment_group_name": "Jersey Fancy",
            "detail_desc": f"Stylish {col.lower()} {cat.lower()} suitable for daily wear.",
            "image_path": f"images/{art_id[:3]}/{art_id}.jpg"
        }
        article_rows.append(art_rows_dict)
    articles_df = pd.DataFrame(article_rows)

    # 2. Customers
    cust_rows = []
    for c in range(1, TARGET_CUSTOMERS + 1):
        cust_id = f"cust_{str(c).zfill(6)}"
        cust_rows.append({
            "customer_id": cust_id,
            "FN": 1.0 if np.random.rand() > 0.5 else np.nan,
            "Active": 1.0 if np.random.rand() > 0.3 else np.nan,
            "club_member_status": "ACTIVE" if np.random.rand() > 0.2 else "PRE-CREATE",
            "fashion_news_frequency": "Regularly" if np.random.rand() > 0.6 else "NONE",
            "age": int(np.random.randint(18, 70)),
            "postal_code": f"zip_{np.random.randint(1000, 9999)}"
        })
    customers_df = pd.DataFrame(cust_rows)

    # 3. Transactions
    dates = pd.date_range("2020-01-01", "2020-09-01", freq="D").strftime("%Y-%m-%d").tolist()
    tx_rows = []
    # Create ~20,000 transactions with basket co-purchases
    cust_ids = customers_df["customer_id"].tolist()
    art_ids = articles_df["article_id"].tolist()

    for _ in range(5000):  # 5000 baskets
        cust = np.random.choice(cust_ids)
        t_dat = np.random.choice(dates)
        basket_size = np.random.choice([1, 2, 3, 4, 5], p=[0.3, 0.4, 0.15, 0.1, 0.05])
        chosen_arts = np.random.choice(art_ids, size=basket_size, replace=False)
        for art in chosen_arts:
            tx_rows.append({
                "t_dat": t_dat,
                "customer_id": cust,
                "article_id": art,
                "price": round(float(np.random.uniform(0.005, 0.1)), 4),
                "sales_channel_id": int(np.random.choice([1, 2]))
            })
    transactions_df = pd.DataFrame(tx_rows)

    return articles_df, customers_df, transactions_df


def process_subsample():
    """Subsamples raw dataset or creates synthetic working dataset."""
    articles_csv = RAW_DIR / "articles.csv"
    customers_csv = RAW_DIR / "customers.csv"
    transactions_csv = RAW_DIR / "transactions_train.csv"

    has_raw = articles_csv.exists() and customers_csv.exists() and transactions_csv.exists()

    if has_raw:
        print(f"[INFO] Reading raw dataset from {RAW_DIR}...")
        articles_raw = pd.read_csv(articles_csv, dtype={"article_id": str})
        customers_raw = pd.read_csv(customers_csv)
        tx_raw = pd.read_csv(transactions_csv, dtype={"article_id": str})

        articles_raw["article_id"] = articles_raw["article_id"].apply(format_article_id)
        tx_raw["article_id"] = tx_raw["article_id"].apply(format_article_id)

        # Sample active customers first to ensure dense transactions
        tx_counts = tx_raw["customer_id"].value_counts()
        active_customers = tx_counts[tx_counts >= 3].index
        
        np.random.seed(SEED)
        if len(active_customers) >= TARGET_CUSTOMERS:
            sampled_cust_ids = set(np.random.choice(active_customers, size=TARGET_CUSTOMERS, replace=False))
        else:
            sampled_cust_ids = set(np.random.choice(customers_raw["customer_id"].unique(), size=min(TARGET_CUSTOMERS, len(customers_raw)), replace=False))

        # Filter transactions for sampled customers
        tx_filtered_cust = tx_raw[tx_raw["customer_id"].isin(sampled_cust_ids)]

        # Sample 4000 articles (prioritizing articles bought by sampled customers)
        tx_art_counts = tx_filtered_cust["article_id"].value_counts()
        top_arts = set(tx_art_counts.index[:TARGET_ARTICLES])

        if len(top_arts) < TARGET_ARTICLES:
            all_arts = set(articles_raw["article_id"].unique())
            remaining = list(all_arts - top_arts)
            extra_needed = TARGET_ARTICLES - len(top_arts)
            sampled_extra = np.random.choice(remaining, size=min(extra_needed, len(remaining)), replace=False)
            sampled_art_ids = top_arts.union(set(sampled_extra))
        else:
            sampled_art_ids = top_arts

        # Final filtering of transactions, articles, and customers
        transactions_df = tx_filtered_cust[tx_filtered_cust["article_id"].isin(sampled_art_ids)].copy()
        articles_df = articles_raw[articles_raw["article_id"].isin(sampled_art_ids)].copy()
        customers_df = customers_raw[customers_raw["customer_id"].isin(sampled_cust_ids)].copy()

        # Add image path column
        articles_df["image_path"] = articles_df["article_id"].apply(lambda aid: f"images/{aid[:3]}/{aid}.jpg")

    else:
        articles_df, customers_df, transactions_df = generate_synthetic_data()

    # 4. Generate Complementary Items Table (Co-purchase pairs)
    print("[INFO] Computing co-purchase complementary items table...")
    baskets = transactions_df.groupby(["customer_id", "t_dat"])["article_id"].apply(list)
    
    co_counts = defaultdict(lambda: defaultdict(int))
    for basket in baskets:
        if len(basket) > 1:
            unique_basket = list(set(basket))
            for item1, item2 in combinations(unique_basket, 2):
                co_counts[item1][item2] += 1
                co_counts[item2][item1] += 1

    comp_rows = []
    all_article_ids = articles_df["article_id"].unique()
    top_popular = transactions_df["article_id"].value_counts().index.tolist()

    for art_id in all_article_ids:
        pairs = co_counts.get(art_id, {})
        if pairs:
            # Sort by count desc, cap at top 10
            sorted_pairs = sorted(pairs.items(), key=lambda x: x[1], reverse=True)[:10]
            max_c = sorted_pairs[0][1]
            for comp_id, cnt in sorted_pairs:
                comp_rows.append({
                    "article_id": art_id,
                    "complementary_article_id": comp_id,
                    "co_purchase_count": int(cnt),
                    "score": round(float(cnt / max_c), 4)
                })
        else:
            # Fallback: fill up to 3 complementary items from top popular items (excluding self)
            fallback_items = [p for p in top_popular if p != art_id][:3]
            for comp_id in fallback_items:
                comp_rows.append({
                    "article_id": art_id,
                    "complementary_article_id": comp_id,
                    "co_purchase_count": 1,
                    "score": 0.1
                })

    complementary_df = pd.DataFrame(comp_rows)

    # 5. Save Parquet Files
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    articles_path = PROCESSED_DIR / "articles.parquet"
    customers_path = PROCESSED_DIR / "customers.parquet"
    transactions_path = PROCESSED_DIR / "transactions.parquet"
    complementary_path = PROCESSED_DIR / "complementary_items.parquet"

    articles_df.to_parquet(articles_path, index=False)
    customers_df.to_parquet(customers_path, index=False)
    transactions_df.to_parquet(transactions_path, index=False)
    complementary_df.to_parquet(complementary_path, index=False)

    # 6. Print Row Counts
    print("\n================================================================================")
    print("                      DATA SUBSAMPLING COMPLETED                                 ")
    print("================================================================================")
    print(f"Processed Directory : {PROCESSED_DIR}")
    print(f"articles.parquet             : {len(articles_df):>7,d} rows")
    print(f"customers.parquet            : {len(customers_df):>7,d} rows")
    print(f"transactions.parquet         : {len(transactions_df):>7,d} rows")
    print(f"complementary_items.parquet  : {len(complementary_df):>7,d} rows")
    print("================================================================================\n")


if __name__ == "__main__":
    process_subsample()
