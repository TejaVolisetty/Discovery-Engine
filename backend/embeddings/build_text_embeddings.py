import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer

EMBEDDINGS_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = EMBEDDINGS_DIR.parent.parent
ARTICLES_PATH = PROJECT_ROOT / "data" / "processed" / "articles.parquet"

OUTPUT_EMBEDDINGS_PATH = EMBEDDINGS_DIR / "text_embeddings.npy"
OUTPUT_MAPPING_PATH = EMBEDDINGS_DIR / "article_id_order.json"

MODEL_NAME = "all-MiniLM-L6-v2"


def create_article_text(row) -> str:
    """Concatenates article title, category, attributes, and description into a single text representation."""
    parts = []
    
    # Title / Product Name
    prod_name = str(row.get("prod_name", "")).strip()
    if prod_name and prod_name.lower() != "unknown":
        parts.append(f"Title: {prod_name}")

    # Category / Department information
    cat_items = []
    for col in ["product_type_name", "department_name", "index_group_name", "garment_group_name"]:
        val = str(row.get(col, "")).strip()
        if val and val.lower() != "unknown" and val not in cat_items:
            cat_items.append(val)
    if cat_items:
        parts.append(f"Category: {' > '.join(cat_items)}")

    # Visual & Color Attributes
    attr_items = []
    for col in ["colour_group_name", "graphical_appearance_name"]:
        val = str(row.get(col, "")).strip()
        if val and val.lower() != "unknown" and val not in attr_items:
            attr_items.append(val)
    if attr_items:
        parts.append(f"Attributes: {', '.join(attr_items)}")

    # Detailed Description
    desc = str(row.get("detail_desc", "")).strip()
    if desc and desc.lower() != "unknown":
        parts.append(f"Description: {desc}")

    return ". ".join(parts) if parts else prod_name


def main():
    if not ARTICLES_PATH.exists():
        raise FileNotFoundError(
            f"Articles dataset not found at {ARTICLES_PATH}. Please run subsample.py and clean.py first."
        )

    print(f"[INFO] Loading articles from {ARTICLES_PATH}...")
    df = pd.read_parquet(ARTICLES_PATH)
    print(f"[INFO] Total articles loaded: {len(df)}")

    # Ensure article_id is string
    df["article_id"] = df["article_id"].astype(str)

    print("[INFO] Constructing text representations for encoding...")
    text_descriptions = df.apply(create_article_text, axis=1).tolist()
    article_ids = df["article_id"].tolist()

    print(f"[INFO] Loading SentenceTransformer model '{MODEL_NAME}'...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"[INFO] Encoding {len(text_descriptions)} article text representations...")
    embeddings = model.encode(
        text_descriptions,
        batch_size=64,
        show_progress_bar=True,
        normalize_embeddings=True
    )

    print(f"[INFO] Saving embeddings matrix of shape {embeddings.shape} to {OUTPUT_EMBEDDINGS_PATH}...")
    np.save(OUTPUT_EMBEDDINGS_PATH, embeddings)

    # Map row index to article_id
    index_to_article_id = {int(idx): str(aid) for idx, aid in enumerate(article_ids)}
    article_id_to_index = {str(aid): int(idx) for idx, aid in enumerate(article_ids)}

    mapping_data = {
        "index_to_article_id": index_to_article_id,
        "article_id_to_index": article_id_to_index,
        "total_articles": len(article_ids)
    }

    print(f"[INFO] Saving article ID mapping to {OUTPUT_MAPPING_PATH}...")
    with open(OUTPUT_MAPPING_PATH, "w", encoding="utf-8") as f:
        json.dump(mapping_data, f, indent=2)

    print("\n================================================================================")
    print("                    TEXT EMBEDDINGS GENERATION COMPLETED                        ")
    print("================================================================================")
    print(f"Embeddings Saved : {OUTPUT_EMBEDDINGS_PATH}")
    print(f"Mapping Saved    : {OUTPUT_MAPPING_PATH}")
    print(f"Matrix Shape     : {embeddings.shape} (dtype: {embeddings.dtype})")
    print("================================================================================\n")


if __name__ == "__main__":
    main()
