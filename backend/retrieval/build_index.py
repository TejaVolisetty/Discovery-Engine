import os
import sys
import json
import shutil
from pathlib import Path
import numpy as np
import faiss

RETRIEVAL_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = RETRIEVAL_DIR.parent
EMBEDDINGS_DIR = BACKEND_DIR / "embeddings"

FUSED_EMBEDDINGS_PATH = EMBEDDINGS_DIR / "fused_embeddings.npy"
TEXT_EMBEDDINGS_PATH = EMBEDDINGS_DIR / "text_embeddings.npy"
MAPPING_SOURCE_PATH = EMBEDDINGS_DIR / "article_id_order.json"

INDEX_OUTPUT_PATH = RETRIEVAL_DIR / "faiss.index"
MAPPING_OUTPUT_PATH = RETRIEVAL_DIR / "article_id_order.json"


def load_embeddings():
    """Loads fused embeddings if present, otherwise falls back to text embeddings."""
    if FUSED_EMBEDDINGS_PATH.exists():
        print(f"[INFO] Loading fused embeddings from {FUSED_EMBEDDINGS_PATH}...")
        embeddings = np.load(FUSED_EMBEDDINGS_PATH)
    elif TEXT_EMBEDDINGS_PATH.exists():
        print(f"[INFO] Fused embeddings not found. Falling back to text embeddings from {TEXT_EMBEDDINGS_PATH}...")
        embeddings = np.load(TEXT_EMBEDDINGS_PATH)
    else:
        raise FileNotFoundError(
            f"No embeddings found! Neither {FUSED_EMBEDDINGS_PATH} nor {TEXT_EMBEDDINGS_PATH} exists. "
            "Please run embedding build scripts first."
        )
    return embeddings.astype(np.float32)


def main():
    print(f"[INFO] Building FAISS Index in {RETRIEVAL_DIR}...")
    
    # 1. Load Embeddings
    embeddings = load_embeddings()
    n_samples, dim = embeddings.shape
    print(f"[INFO] Loaded embedding matrix: {n_samples} items, {dim} dimensions.")

    # Normalize vectors for Inner Product (Cosine Similarity)
    faiss.normalize_L2(embeddings)

    # 2. Build FAISS Index (IndexFlatIP for cosine similarity)
    print(f"[INFO] Initializing FAISS IndexFlatIP(d={dim})...")
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    print(f"[INFO] Added {index.ntotal} vectors to index.")

    # 3. Save FAISS Index & Copy Article ID Mapping
    RETRIEVAL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Saving FAISS index to {INDEX_OUTPUT_PATH}...")
    faiss.write_index(index, str(INDEX_OUTPUT_PATH))

    if MAPPING_SOURCE_PATH.exists():
        print(f"[INFO] Copying article_id_order.json to {MAPPING_OUTPUT_PATH}...")
        shutil.copy(MAPPING_SOURCE_PATH, MAPPING_OUTPUT_PATH)
    else:
        print(f"[WARNING] Mapping file {MAPPING_SOURCE_PATH} not found.")

    # 4. Self-test: embed article[0], search top 5, confirm article[0] is top match
    print("\n[INFO] Running Index Self-Test...")
    query_vector = embeddings[0:1]  # Shape (1, dim)
    top_k = 5
    distances, indices = index.search(query_vector, top_k)

    top_idx = indices[0][0]
    top_score = distances[0][0]

    # Load mapping if available to print article IDs
    article_ids = []
    if MAPPING_OUTPUT_PATH.exists():
        with open(MAPPING_OUTPUT_PATH, "r", encoding="utf-8") as f:
            mapping = json.load(f)
            idx_to_id = mapping.get("index_to_article_id", mapping)
            article_ids = [idx_to_id.get(str(i), idx_to_id.get(i, f"idx_{i}")) for i in indices[0]]

    print("--------------------------------------------------------------------------------")
    print("Self-Test Search Results (Top 5 for Query Article Index 0):")
    for r in range(top_k):
        idx = indices[0][r]
        score = distances[0][r]
        aid = article_ids[r] if r < len(article_ids) else f"idx_{idx}"
        print(f"  Rank {r+1}: Index {idx:>4d} | Article ID: {aid} | Cosine Similarity: {score:.6f}")
    print("--------------------------------------------------------------------------------")

    assert top_idx == 0, f"Self-test failed! Expected top match index 0, got {top_idx}"
    assert np.isclose(top_score, 1.0, atol=1e-3), f"Self-test failed! Top score should be ~1.0, got {top_score}"

    print("\n================================================================================")
    print("                  FAISS RETRIEVAL INDEX BUILD COMPLETED                         ")
    print("================================================================================")
    print(f"Index File Saved   : {INDEX_OUTPUT_PATH}")
    print(f"Mapping File Saved : {MAPPING_OUTPUT_PATH}")
    print(f"Total Vectors      : {index.ntotal}")
    print(f"Vector Dimension   : {dim}")
    print(f"Self-Test Status   : PASSED (article[0] retrieved as rank 1 with score {top_score:.4f})")
    print("================================================================================\n")


if __name__ == "__main__":
    main()
