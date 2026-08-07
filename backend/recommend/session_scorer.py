import os
import sys
import json
import math
from pathlib import Path
from typing import List, Tuple, Dict, Any, Union
import numpy as np
import pandas as pd

RECOMMEND_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = RECOMMEND_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
EMBEDDINGS_DIR = BACKEND_DIR / "embeddings"
RETRIEVAL_DIR = BACKEND_DIR / "retrieval"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

# Global module caches for fast inference
_EMBEDDINGS_CACHE = None
_ID_TO_INDEX_CACHE = None
_INDEX_TO_ID_CACHE = None
_POPULARITY_CACHE = None
_ARTICLES_DF_CACHE = None


def _load_resources():
    """Lazy loads embeddings, ID mappings, articles metadata, and popularity counts into memory."""
    global _EMBEDDINGS_CACHE, _ID_TO_INDEX_CACHE, _INDEX_TO_ID_CACHE, _POPULARITY_CACHE, _ARTICLES_DF_CACHE

    if _EMBEDDINGS_CACHE is not None:
        return

    # 1. Load Embeddings (fused or text)
    fused_p = EMBEDDINGS_DIR / "fused_embeddings.npy"
    text_p = EMBEDDINGS_DIR / "text_embeddings.npy"
    if fused_p.exists():
        embeddings = np.load(fused_p)
    elif text_p.exists():
        embeddings = np.load(text_p)
    else:
        # Fallback dummy matrix if embeddings file not yet built
        embeddings = np.zeros((4000, 384), dtype=np.float32)

    # L2 normalize matrix for inner-product cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    _EMBEDDINGS_CACHE = (embeddings / norms).astype(np.float32)

    # 2. Load Article ID Order Mapping
    map_p = RETRIEVAL_DIR / "article_id_order.json"
    if not map_p.exists():
        map_p = EMBEDDINGS_DIR / "article_id_order.json"

    if map_p.exists():
        with open(map_p, "r", encoding="utf-8") as f:
            mapping = json.load(f)
            _INDEX_TO_ID_CACHE = mapping.get("index_to_article_id", {})
            _ID_TO_INDEX_CACHE = mapping.get("article_id_to_index", {})
    else:
        _INDEX_TO_ID_CACHE = {str(i): f"art_{i}" for i in range(len(embeddings))}
        _ID_TO_INDEX_CACHE = {f"art_{i}": i for i in range(len(embeddings))}

    # Ensure integer indices in index_to_article
    _INDEX_TO_ID_CACHE = {int(k): str(v) for k, v in _INDEX_TO_ID_CACHE.items()}
    _ID_TO_INDEX_CACHE = {str(k): int(v) for k, v in _ID_TO_INDEX_CACHE.items()}

    # 3. Load Articles DataFrame
    art_parquet = PROCESSED_DIR / "articles.parquet"
    if art_parquet.exists():
        _ARTICLES_DF_CACHE = pd.read_parquet(art_parquet).set_index("article_id", drop=False)
    else:
        _ARTICLES_DF_CACHE = pd.DataFrame()

    # 4. Load Popularity Counts
    tx_parquet = PROCESSED_DIR / "transactions.parquet"
    pop_dict = defaultdict_pop = {}
    if tx_parquet.exists():
        tx_df = pd.read_parquet(tx_parquet)
        counts = tx_df["article_id"].value_counts().to_dict()
        pop_dict = {str(k): int(v) for k, v in counts.items()}

    _POPULARITY_CACHE = pop_dict


if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.guardrails.latency import track_latency
except ImportError:
    from guardrails.latency import track_latency


def _extract_article_id(item: Union[str, Dict[str, Any]]) -> str:
    """Helper to extract article_id from string or dictionary."""
    if isinstance(item, dict):
        return str(item.get("article_id", ""))
    return str(item)


@track_latency
def score_candidates(
    session_events: List[Union[str, Dict[str, Any]]],
    candidate_ids: List[str],
    articles_df: pd.DataFrame = None,
    top_k: int = 50
) -> List[Tuple[str, float, str]]:
    """
    Scores candidates using a two-tower stand-in logic:
    - base score = cosine similarity to the most recent session event
    - recency-weighted boost across the last 5 session events
    - small popularity prior (log-scaled)

    Returns top_k list of (article_id, score, reason_string).
    """
    _load_resources()

    if articles_df is None or articles_df.empty:
        articles_df = _ARTICLES_DF_CACHE

    # Clean & extract session article IDs
    session_art_ids = [_extract_article_id(evt) for evt in session_events if _extract_article_id(evt)]
    session_art_ids = [aid for aid in session_art_ids if aid in _ID_TO_INDEX_CACHE]

    # Pre-calculate max popularity for log-scaling
    max_pop = max(_POPULARITY_CACHE.values()) if _POPULARITY_CACHE else 100
    max_log_pop = math.log1p(max_pop) if max_pop > 0 else 1.0

    # 1. Base vector & Recency vectors setup
    most_recent_idx = _ID_TO_INDEX_CACHE[session_art_ids[-1]] if session_art_ids else None
    
    # Last 5 events with exponential decay weights
    recent_5 = session_art_ids[-5:] if session_art_ids else []
    decay_weights = [math.exp(-0.4 * (len(recent_5) - 1 - i)) for i in range(len(recent_5))]
    total_weight = sum(decay_weights) if decay_weights else 1.0

    scored_items = []

    for cand_id in candidate_ids:
        cand_id_str = str(cand_id)
        if cand_id_str not in _ID_TO_INDEX_CACHE:
            continue

        cand_idx = _ID_TO_INDEX_CACHE[cand_id_str]
        cand_vec = _EMBEDDINGS_CACHE[cand_idx]

        # A. Base Score (similarity to most recent item)
        if most_recent_idx is not None:
            recent_vec = _EMBEDDINGS_CACHE[most_recent_idx]
            base_score = float(np.dot(recent_vec, cand_vec))
        else:
            base_score = 0.0

        # B. Recency-weighted boost across last 5 items
        if recent_5:
            recency_sims = [
                float(np.dot(_EMBEDDINGS_CACHE[_ID_TO_INDEX_CACHE[r_id]], cand_vec))
                for r_id in recent_5
            ]
            recency_boost = sum(w * s for w, s in zip(decay_weights, recency_sims)) / total_weight
        else:
            recency_boost = base_score

        # C. Popularity Prior (log-scaled)
        pop_count = _POPULARITY_CACHE.get(cand_id_str, 0)
        pop_prior = math.log1p(pop_count) / max_log_pop

        # D. Title & Category Match Boost for Same-Product Line Accuracy
        title_boost = 0.0
        cat_boost = 0.0
        if articles_df is not None and not articles_df.empty and cand_id_str in articles_df.index:
            cand_row = articles_df.loc[cand_id_str]
            if isinstance(cand_row, pd.DataFrame):
                cand_row = cand_row.iloc[0]
            cand_title = str(cand_row.get("prod_name", "")).lower()
            cand_cat = str(cand_row.get("product_type_name", "")).lower()

            if session_art_ids:
                recent_art_id = session_art_ids[-1]
                if recent_art_id in articles_df.index:
                    rec_row = articles_df.loc[recent_art_id]
                    if isinstance(rec_row, pd.DataFrame):
                        rec_row = rec_row.iloc[0]
                    rec_title = str(rec_row.get("prod_name", "")).lower()
                    rec_cat = str(rec_row.get("product_type_name", "")).lower()

                    # Category Match Bonus (+0.25)
                    if rec_cat and (rec_cat in cand_cat or cand_cat in rec_cat):
                        cat_boost = 0.25

                    # Title Word Overlap Bonus (+0.35)
                    rec_words = set(w for w in rec_title.split() if len(w) > 2)
                    cand_words = set(w for w in cand_title.split() if len(w) > 2)
                    if rec_words and cand_words:
                        overlap = len(rec_words.intersection(cand_words)) / max(len(rec_words), 1)
                        title_boost = 0.35 * overlap

        # Combine Scores: 35% base vector + 30% recency + 25% title/cat match + 10% popularity
        final_score = 0.35 * base_score + 0.30 * recency_boost + 0.25 * min(1.0, cat_boost + title_boost) + 0.10 * pop_prior
        final_score = max(0.0, min(1.0, float(final_score)))

        # E. Human-Readable Reason Generation
        prod_name = "item"
        dept_name = "category"
        if articles_df is not None and not articles_df.empty and cand_id_str in articles_df.index:
            row = articles_df.loc[cand_id_str]
            if isinstance(row, pd.DataFrame):
                row = row.iloc[0]
            prod_name = row.get("prod_name", "item")
            dept_name = row.get("product_type_name", row.get("department_name", "this category"))

        if base_score > 0.70 and session_art_ids:
            reason = f"Matches style of recent item you viewed"
        elif recency_boost > 0.60:
            reason = f"Complements items in your session"
        elif pop_prior > 0.50:
            reason = f"Popular choice in {dept_name}"
        else:
            reason = f"Recommended for you in {dept_name}"

        scored_items.append((cand_id_str, round(final_score, 4), reason))

    # Sort descending by score
    scored_items.sort(key=lambda x: x[1], reverse=True)

    return scored_items[:top_k]


if __name__ == "__main__":
    _load_resources()
    all_cand_ids = list(_ID_TO_INDEX_CACHE.keys())[:100]
    sample_session = all_cand_ids[:3]

    print("Running session_scorer test...")
    results = score_candidates(sample_session, all_cand_ids, top_k=5)
    print(f"\nTop 5 Scored Candidates (Session: {sample_session}):")
    for rank, (aid, score, reason) in enumerate(results, 1):
        print(f" Rank {rank}: ID={aid} | Score={score:.4f} | Reason: '{reason}'")
