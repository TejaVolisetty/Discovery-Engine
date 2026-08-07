import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Set

def detect_and_merge_duplicates(
    embeddings_matrix: np.ndarray,
    articles_df: pd.DataFrame,
    threshold: float = 0.92
) -> Tuple[List[str], Dict[str, str], Set[str]]:
    """
    Detects and merges duplicate products across combined visual + text embeddings.
    
    Args:
        embeddings_matrix: Normalized (N, d) float32 embeddings matrix.
        articles_df: DataFrame indexed by article_id.
        threshold: Cosine similarity threshold above which items are declared duplicates.
        
    Returns:
        clean_article_ids: List of unique, non-duplicate article_ids.
        duplicate_mapping: Dict mapping duplicate_article_id -> canonical_article_id.
        duplicate_ids: Set of deduplicated (removed) article_ids.
    """
    num_items = len(embeddings_matrix)
    if num_items == 0:
        return [], {}, set()

    # Normalize matrix for inner product cosine similarity
    norms = np.linalg.norm(embeddings_matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    norm_matrix = embeddings_matrix / norms

    # Compute pairwise similarity matrix
    sim_matrix = np.dot(norm_matrix, norm_matrix.T)

    article_ids = list(articles_df.index) if not articles_df.empty else [str(i).zfill(10) for i in range(1, num_items + 1)]

    duplicate_ids: Set[str] = set()
    duplicate_mapping: Dict[str, str] = {}
    clean_article_ids: List[str] = []

    for i in range(num_items):
        aid_i = str(article_ids[i])
        if aid_i in duplicate_ids:
            continue

        clean_article_ids.append(aid_i)

        # Find items with similarity > threshold
        similar_indices = np.where(sim_matrix[i] >= threshold)[0]
        for j in similar_indices:
            if i == j:
                continue
            aid_j = str(article_ids[j])
            if aid_j not in duplicate_ids and aid_j != aid_i:
                # Declare aid_j as duplicate of aid_i
                duplicate_ids.add(aid_j)
                duplicate_mapping[aid_j] = aid_i

    print(f"[DEDUPLICATION] Scanned {num_items} items. Identified {len(duplicate_ids)} duplicate listings. Unique items: {len(clean_article_ids)}.")
    return clean_article_ids, duplicate_mapping, duplicate_ids
