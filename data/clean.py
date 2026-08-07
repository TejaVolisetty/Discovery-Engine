import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).parent.resolve()
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"


def clean_data():
    """Cleans processed datasets and overwrites parquet files."""
    articles_path = PROCESSED_DIR / "articles.parquet"
    customers_path = PROCESSED_DIR / "customers.parquet"
    transactions_path = PROCESSED_DIR / "transactions.parquet"
    complementary_path = PROCESSED_DIR / "complementary_items.parquet"

    if not (articles_path.exists() and customers_path.exists() and transactions_path.exists()):
        raise FileNotFoundError(
            f"Processed parquet files not found in {PROCESSED_DIR}. Please run subsample.py first."
        )

    print(f"[INFO] Loading processed datasets from {PROCESSED_DIR}...")
    articles_df = pd.read_parquet(articles_path)
    customers_df = pd.read_parquet(customers_path)
    transactions_df = pd.read_parquet(transactions_path)
    
    if complementary_path.exists():
        complementary_df = pd.read_parquet(complementary_path)
    else:
        complementary_df = pd.DataFrame()

    initial_counts = {
        "articles": len(articles_df),
        "customers": len(customers_df),
        "transactions": len(transactions_df),
        "complementary": len(complementary_df),
    }

    # ---------------------------------------------------------
    # 1. Clean Articles
    # Drop articles with missing images or missing titles
    # ---------------------------------------------------------
    print("[INFO] Cleaning articles dataset...")
    
    # Check title/prod_name column
    valid_title = articles_df["prod_name"].notna() & (articles_df["prod_name"].astype(str).str.strip() != "") & (articles_df["prod_name"].astype(str).str.lower() != "nan")
    
    # Check image_path column
    valid_image = articles_df["image_path"].notna() & (articles_df["image_path"].astype(str).str.strip() != "") & (articles_df["image_path"].astype(str).str.lower() != "nan")
    
    # If raw image folder exists and contains files, verify image file existence on disk
    raw_images_dir = RAW_DIR / "images"
    if raw_images_dir.exists() and any(raw_images_dir.iterdir()):
        def image_exists(rel_path):
            if not rel_path:
                return False
            full_p = RAW_DIR / rel_path
            return full_p.exists()
        valid_image = valid_image & articles_df["image_path"].apply(image_exists)

    articles_df = articles_df[valid_title & valid_image].copy()

    # Fill missing categorical fields with "unknown"
    cat_cols_articles = articles_df.select_dtypes(include=["object", "string", "category"]).columns
    for col in cat_cols_articles:
        articles_df[col] = articles_df[col].fillna("unknown").replace("", "unknown")

    valid_article_ids = set(articles_df["article_id"].unique())

    # ---------------------------------------------------------
    # 2. Clean Customers
    # Fill missing categorical fields with "unknown"
    # ---------------------------------------------------------
    print("[INFO] Cleaning customers dataset...")
    cat_cols_customers = customers_df.select_dtypes(include=["object", "string", "category"]).columns
    for col in cat_cols_customers:
        customers_df[col] = customers_df[col].fillna("unknown").replace("", "unknown")

    # ---------------------------------------------------------
    # 3. Clean Transactions
    # Filter for valid articles, normalize price to 0-1, add synthetic session_id
    # ---------------------------------------------------------
    print("[INFO] Cleaning transactions dataset...")
    transactions_df = transactions_df[transactions_df["article_id"].isin(valid_article_ids)].copy()

    # Normalize price to a 0-1 scale
    min_price = transactions_df["price"].min()
    max_price = transactions_df["price"].max()

    if max_price > min_price:
        transactions_df["price"] = (transactions_df["price"] - min_price) / (max_price - min_price)
    else:
        transactions_df["price"] = 0.0

    transactions_df["price"] = transactions_df["price"].round(6)

    # Add synthetic session_id column by grouping transactions within a 30-minute window
    # If t_dat is pure date string (e.g. '2020-01-01'), assign simulated timestamps within the day
    transactions_df["t_dat_dt"] = pd.to_datetime(transactions_df["t_dat"])
    
    # Sort transactions by customer and timestamp
    transactions_df = transactions_df.sort_values(by=["customer_id", "t_dat_dt"]).reset_index(drop=True)

    # Group purchases within 30 minutes for each customer
    session_ids = []
    current_cust = None
    current_session_idx = 0
    last_dt = None

    for row in transactions_df.itertuples():
        cust = row.customer_id
        dt = row.t_dat_dt

        if cust != current_cust:
            current_cust = cust
            current_session_idx = 1
            last_dt = dt
        else:
            time_diff = (dt - last_dt).total_seconds() / 60.0
            if time_diff > 30.0:
                current_session_idx += 1
            last_dt = dt

        session_ids.append(f"{cust}_s{current_session_idx}")

    transactions_df["session_id"] = session_ids
    transactions_df = transactions_df.drop(columns=["t_dat_dt"])

    # ---------------------------------------------------------
    # 4. Clean Complementary Items
    # Filter for valid articles
    # ---------------------------------------------------------
    if not complementary_df.empty:
        print("[INFO] Cleaning complementary items dataset...")
        complementary_df = complementary_df[
            complementary_df["article_id"].isin(valid_article_ids) &
            complementary_df["complementary_article_id"].isin(valid_article_ids)
        ].copy()

    # ---------------------------------------------------------
    # 5. Overwrite Processed Parquet Files
    # ---------------------------------------------------------
    print(f"[INFO] Overwriting processed parquet files in {PROCESSED_DIR}...")
    articles_df.to_parquet(articles_path, index=False)
    customers_df.to_parquet(customers_path, index=False)
    transactions_df.to_parquet(transactions_path, index=False)
    
    if not complementary_df.empty:
        complementary_df.to_parquet(complementary_path, index=False)

    final_counts = {
        "articles": len(articles_df),
        "customers": len(customers_df),
        "transactions": len(transactions_df),
        "complementary": len(complementary_df),
    }

    # ---------------------------------------------------------
    # 6. Summary Report
    # ---------------------------------------------------------
    print("\n================================================================================")
    print("                        DATA CLEANING COMPLETED                                 ")
    print("================================================================================")
    print(f"Processed Directory : {PROCESSED_DIR}")
    print(f"articles.parquet             : {initial_counts['articles']:>6,d} -> {final_counts['articles']:>6,d} rows")
    print(f"customers.parquet            : {initial_counts['customers']:>6,d} -> {final_counts['customers']:>6,d} rows")
    print(f"transactions.parquet         : {initial_counts['transactions']:>6,d} -> {final_counts['transactions']:>6,d} rows")
    print(f"complementary_items.parquet  : {initial_counts['complementary']:>6,d} -> {final_counts['complementary']:>6,d} rows")
    print("================================================================================\n")


if __name__ == "__main__":
    clean_data()
