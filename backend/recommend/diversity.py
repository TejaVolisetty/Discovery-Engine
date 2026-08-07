import math
from collections import defaultdict
from typing import List, Tuple, Dict, Any, Union
import pandas as pd


def _get_category(article_id: str, articles_df: pd.DataFrame) -> str:
    """Helper function to look up category for an article_id."""
    if articles_df is None or articles_df.empty:
        return "unknown"

    row = None
    art_id_str = str(article_id)

    if art_id_str in articles_df.index:
        row = articles_df.loc[art_id_str]
    elif "article_id" in articles_df.columns:
        matching = articles_df[articles_df["article_id"].astype(str) == art_id_str]
        if not matching.empty:
            row = matching.iloc[0]

    if row is not None:
        if isinstance(row, pd.DataFrame):
            row = row.iloc[0]
        return str(row.get("product_type_name", row.get("department_name", row.get("index_group_name", "unknown"))))

    return "unknown"


import sys
from pathlib import Path
RECOMMEND_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = RECOMMEND_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.guardrails.latency import track_latency
except ImportError:
    from guardrails.latency import track_latency


@track_latency
def enforce_diversity(
    ranked_list: List[Union[Tuple[str, float, str], Dict[str, Any]]],
    articles_df: pd.DataFrame,
    max_category_share: float = 0.35,
    eval_k: int = None
) -> List[Union[Tuple[str, float, str], Dict[str, Any]]]:
    """
    Re-orders a ranked candidate list so no single category exceeds `max_category_share`
    in the top-K window, demoting overrepresented items down the list instead of discarding them.

    Parameters:
    - ranked_list: List of (article_id, score, reason) tuples or dict items.
    - articles_df: DataFrame containing article metadata.
    - max_category_share: Maximum allowable proportion of any single category (default 0.35 = 35%).
    - eval_k: The top-K window size to enforce diversity for (defaults to len(ranked_list) or 20/50).

    Returns:
    - Re-ordered list containing all original items without dropping any.
    """
    if not ranked_list:
        return []

    total_len = len(ranked_list)
    k_window = eval_k if eval_k is not None else min(total_len, 50)
    max_allowed_in_window = max(1, math.ceil(k_window * max_category_share))

    def get_id(item):
        if isinstance(item, dict):
            return str(item.get("article_id", ""))
        elif isinstance(item, (tuple, list)):
            return str(item[0])
        return str(item)

    pool = list(ranked_list)
    result = []
    category_counts = defaultdict(int)

    # 1. Fill top-K window respecting category constraints
    while len(result) < k_window and pool:
        selected_index = None

        # Pick highest-scoring candidate whose category count has not breached max_allowed
        for i, item in enumerate(pool):
            art_id = get_id(item)
            cat = _get_category(art_id, articles_df)
            if category_counts[cat] < max_allowed_in_window:
                selected_index = i
                break

        # Fallback: if all remaining pool candidates belong to capped categories, pick candidate from category with min current count
        if selected_index is None:
            min_cat_count = float("inf")
            best_i = 0
            for i, item in enumerate(pool):
                art_id = get_id(item)
                cat = _get_category(art_id, articles_df)
                if category_counts[cat] < min_cat_count:
                    min_cat_count = category_counts[cat]
                    best_i = i
            selected_index = best_i

        chosen_item = pool.pop(selected_index)
        chosen_cat = _get_category(get_id(chosen_item), articles_df)
        category_counts[chosen_cat] += 1
        result.append(chosen_item)

    # 2. Re-insert any remaining demoted items at the tail end (no items discarded)
    result.extend(pool)

    return result


def test_enforce_diversity():
    """Unit test with a synthetic list containing 80% Tops in top ranked items."""
    print("[TEST] Running diversity enforcement unit test...")

    # Create synthetic articles DataFrame:
    # 16 Tops (80% of top 20 candidates), 10 Trousers, 10 Shoes
    synthetic_rows = []
    synthetic_list = []

    # High-scoring Tops (16 items)
    for i in range(1, 17):
        art_id = f"art_top_{i}"
        synthetic_rows.append({"article_id": art_id, "product_type_name": "Tops"})
        synthetic_list.append((art_id, 0.95 - i * 0.01, "high similarity"))

    # Lower-scoring Trousers (10 items)
    for i in range(1, 11):
        art_id = f"art_trouser_{i}"
        synthetic_rows.append({"article_id": art_id, "product_type_name": "Trousers"})
        synthetic_list.append((art_id, 0.75 - i * 0.01, "medium similarity"))

    # Lower-scoring Shoes (10 items)
    for i in range(1, 11):
        art_id = f"art_shoe_{i}"
        synthetic_rows.append({"article_id": art_id, "product_type_name": "Shoes"})
        synthetic_list.append((art_id, 0.65 - i * 0.01, "low similarity"))

    articles_df = pd.DataFrame(synthetic_rows).set_index("article_id", drop=False)

    # Enforce diversity with 35% cap on top 20 items (35% of 20 = max 7 items per category)
    reordered_list = enforce_diversity(
        synthetic_list,
        articles_df,
        max_category_share=0.35,
        eval_k=20
    )

    # 1. Verify output length matches input length (no items dropped!)
    assert len(reordered_list) == len(synthetic_list), (
        f"Item count mismatch! Expected {len(synthetic_list)}, got {len(reordered_list)}"
    )

    # 2. Check top 20 window category distribution
    top_20 = reordered_list[:20]
    top_20_cats = [_get_category(item[0], articles_df) for item in top_20]
    tops_in_top_20 = top_20_cats.count("Tops")
    trousers_in_top_20 = top_20_cats.count("Trousers")
    shoes_in_top_20 = top_20_cats.count("Shoes")

    print(f"  Input Top 20 Candidates : 16 Tops (80%), 4 Trousers/Shoes")
    print(f"  Top 20 Output Categories: {top_20_cats}")
    print(f"  Tops in Top 20      : {tops_in_top_20} / 20 ({tops_in_top_20 / 20 * 100:.1f}%)")
    print(f"  Trousers in Top 20  : {trousers_in_top_20} / 20 ({trousers_in_top_20 / 20 * 100:.1f}%)")
    print(f"  Shoes in Top 20     : {shoes_in_top_20} / 20 ({shoes_in_top_20 / 20 * 100:.1f}%)")

    # Max allowed per category in top 20 is ceil(20 * 0.35) = 7
    assert tops_in_top_20 <= 7, f"Diversity check failed! Tops count in top 20 ({tops_in_top_20}) > 7"
    assert len(reordered_list) == 36, f"Total items altered! Expected 36, got {len(reordered_list)}"
    print("  [SUCCESS] Diversity enforcement unit test passed cleanly! (Tops demoted & capped at 35% in top 20)")


if __name__ == "__main__":
    test_enforce_diversity()
