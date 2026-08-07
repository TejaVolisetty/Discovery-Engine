import sys
from pathlib import Path
from typing import List, Tuple, Dict, Any, Union

GUARDRAILS_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = GUARDRAILS_DIR.parent
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
def attach_explanations(
    ranked_list: List[Union[Tuple[str, float, str], Tuple[str, float], Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """
    Ensures every item returned to the frontend carries a plain-English reason string.
    Reuses existing reason field when present or formats a deterministic rule-based reason string.

    Guarantees:
    - Pure rule-based execution (NO LLM calls made).
    - Deterministic plain-English reason attached to every candidate item.
    - Returns standardized dictionaries ready for frontend JSON response payloads.
    """
    explained_results = []

    for item in ranked_list:
        article_id = ""
        score = 0.0
        reason = ""

        if isinstance(item, dict):
            article_id = str(item.get("article_id", item.get("id", "")))
            score = float(item.get("score", 0.0))
            reason = str(item.get("reason", "")).strip()

        elif isinstance(item, (tuple, list)):
            article_id = str(item[0])
            score = float(item[1]) if len(item) > 1 else 0.0
            if len(item) > 2 and item[2]:
                reason = str(item[2]).strip()

        # Fallback rule-based reason if empty
        if not reason:
            if score >= 0.75:
                reason = "Matches your recent style preferences"
            elif score >= 0.50:
                reason = "Popular choice in this collection"
            else:
                reason = "Recommended based on your session history"

        explained_results.append({
            "article_id": article_id,
            "score": round(score, 4),
            "reason": reason
        })

    return explained_results


def test_attach_explanations():
    """Unit test confirming deterministic rule-based reason formatting without LLM calls."""
    print("[TEST] Running Explainability Guardrails Unit Test...")

    input_list = [
        ("0108775015", 0.88, "Matches style of recent item you viewed"),
        ("0108775044", 0.65, ""),  # Missing reason, should get fallback
        {"article_id": "0108775045", "score": 0.42}  # Dict without reason
    ]

    explained = attach_explanations(input_list)

    assert len(explained) == 3, "Output count must match input count"
    assert explained[0]["reason"] == "Matches style of recent item you viewed"
    assert explained[1]["reason"] == "Popular choice in this collection"
    assert explained[2]["reason"] == "Recommended based on your session history"

    print("  Input Candidates:")
    for item in input_list:
        print(f"    - {item}")

    print("\n  Formatted Output with Explanations:")
    for item in explained:
        print(f"    - Article ID: {item['article_id']} | Score: {item['score']} | Reason: '{item['reason']}'")

    print("\n================================================================================")
    print("                EXPLAINABILITY GUARDRAILS PASSED (No LLM Calls)                ")
    print("================================================================================\n")


if __name__ == "__main__":
    test_attach_explanations()
