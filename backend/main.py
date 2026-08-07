import os
import sys
import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import faiss
from sentence_transformers import SentenceTransformer

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Internal imports
try:
    from backend.recommend.session_scorer import score_candidates
    from backend.recommend.diversity import enforce_diversity
    from backend.guardrails.dpdp import anonymize_session, check_consent, audit_log
    from backend.guardrails.explain import attach_explanations
    from backend.guardrails.latency import track_latency
except ImportError:
    from recommend.session_scorer import score_candidates
    from recommend.diversity import enforce_diversity
    from guardrails.dpdp import anonymize_session, check_consent, audit_log
    from guardrails.explain import attach_explanations
    from guardrails.latency import track_latency

# Paths to data & indices
DATA_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
EMBEDDINGS_DIR = BACKEND_DIR / "embeddings"
RETRIEVAL_DIR = BACKEND_DIR / "retrieval"
LOGS_DIR = BACKEND_DIR / "logs"

# Global state loaded ONCE at startup
STATE: Dict[str, Any] = {}

# In-memory session store keyed by session_id
SESSION_STORE: Dict[str, List[Dict[str, Any]]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Loads all dataset files, FAISS index, embedding models ONCE at startup."""
    print("\n================================================================================")
    print("                STARTING DISCOVERY ENGINE BACKEND SERVICE                       ")
    print("================================================================================")

    # 1. Load Parquet Data
    art_path = DATA_PROCESSED_DIR / "articles.parquet"
    tx_path = DATA_PROCESSED_DIR / "transactions.parquet"
    comp_path = DATA_PROCESSED_DIR / "complementary_items.parquet"

    if art_path.exists():
        STATE["articles_df"] = pd.read_parquet(art_path).set_index("article_id", drop=False)
        STATE["articles_df"]["article_id"] = STATE["articles_df"]["article_id"].astype(str)
        print(f"[STARTUP] Loaded articles.parquet: {len(STATE['articles_df'])} rows")
    else:
        STATE["articles_df"] = pd.DataFrame()

    if tx_path.exists():
        STATE["transactions_df"] = pd.read_parquet(tx_path)
        print(f"[STARTUP] Loaded transactions.parquet: {len(STATE['transactions_df'])} rows")
    else:
        STATE["transactions_df"] = pd.DataFrame()

    if comp_path.exists():
        STATE["complementary_df"] = pd.read_parquet(comp_path)
        print(f"[STARTUP] Loaded complementary_items.parquet: {len(STATE['complementary_df'])} rows")
    else:
        STATE["complementary_df"] = pd.DataFrame()

    # 2. Load FAISS Index & Article ID Mapping
    index_path = RETRIEVAL_DIR / "faiss.index"
    map_path = RETRIEVAL_DIR / "article_id_order.json"

    if index_path.exists():
        STATE["faiss_index"] = faiss.read_index(str(index_path))
        print(f"[STARTUP] Loaded FAISS index: {STATE['faiss_index'].ntotal} vectors")
    else:
        STATE["faiss_index"] = None

    if map_path.exists():
        with open(map_path, "r", encoding="utf-8") as f:
            mapping = json.load(f)
            STATE["idx_to_art"] = {int(k): str(v) for k, v in mapping.get("index_to_article_id", {}).items()}
            STATE["art_to_idx"] = {str(k): int(v) for k, v in mapping.get("article_id_to_index", {}).items()}
    else:
        STATE["idx_to_art"] = {}
        STATE["art_to_idx"] = {}

    # 3. Load Embeddings
    emb_path = EMBEDDINGS_DIR / "fused_embeddings.npy"
    if not emb_path.exists():
        emb_path = EMBEDDINGS_DIR / "text_embeddings.npy"

    if emb_path.exists():
        STATE["embeddings"] = np.load(emb_path).astype(np.float32)
        print(f"[STARTUP] Loaded embeddings matrix: {STATE['embeddings'].shape}")
    else:
        STATE["embeddings"] = None

    # 4. Load SentenceTransformer model for query encoding
    print("[STARTUP] Initializing SentenceTransformer model ('all-MiniLM-L6-v2')...")
    STATE["encoder"] = SentenceTransformer("all-MiniLM-L6-v2")
    print("[STARTUP] All models, data, and index loaded successfully!")
    print("================================================================================\n")

    yield

    # Cleanup on shutdown
    STATE.clear()
    SESSION_STORE.clear()


app = FastAPI(
    title="Discovery Engine API",
    description="Real-time multi-intent product recommendations and semantic discovery engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class EventRequest(BaseModel):
    session_id: str = Field(..., example="sess_12345")
    article_id: str = Field(..., example="0108775015")
    event_type: str = Field("view", example="click")
    customer_id: Optional[str] = Field(None, example="cust_000042")
    consent: bool = Field(True, example=True)


def format_article_response(item: Dict[str, Any], articles_df: pd.DataFrame) -> Dict[str, Any]:
    """Helper to enrich raw recommendation tuple/dict with clean JSON metadata fields."""
    art_id = str(item.get("article_id", ""))
    score = float(item.get("score", 0.0))
    reason = str(item.get("reason", "Recommended for you"))

    meta = {}
    if not articles_df.empty and art_id in articles_df.index:
        row = articles_df.loc[art_id]
        if isinstance(row, pd.DataFrame):
            row = row.iloc[0]
        meta = row.to_dict()

    title = str(meta.get("prod_name", f"Article {art_id}"))
    price = round(float(meta.get("price", 0.05)), 4)
    image_url = str(meta.get("image_path", f"images/{art_id[:3]}/{art_id}.jpg"))
    category = str(meta.get("product_type_name", meta.get("department_name", "Apparel")))
    department = str(meta.get("department_name", "General"))

    return {
        "article_id": art_id,
        "title": title,
        "price": price,
        "image_url": image_url,
        "category": category,
        "department": department,
        "score": score,
        "reason": reason
    }


# Endpoints

@app.get("/health")

def health_check():
    """Health check endpoint returning system status and dataset counts."""
    articles_count = len(STATE.get("articles_df", []))
    index_total = STATE["faiss_index"].ntotal if STATE.get("faiss_index") else 0
    return {
        "status": "ok",
        "loaded_articles": articles_count,
        "index_vectors": index_total,
        "timestamp": time.time()
    }


@app.get("/metrics")
def get_system_metrics():
    """GET /metrics -> Returns system performance, latency breakdown, and cost-per-inference metrics."""
    latency_file = LOGS_DIR / "latency_log.csv"
    total_calls = 0
    avg_latency = 0.0
    calls_over_80ms = 0

    if latency_file.exists():
        try:
            with open(latency_file, "r", encoding="utf-8") as f:
                reader = list(csv.reader(f))
                if len(reader) > 1:
                    rows = reader[1:]
                    total_calls = len(rows)
                    latencies = [float(r[2]) for r in rows if len(r) > 2 and r[2].replace('.', '', 1).isdigit()]
                    if latencies:
                        avg_latency = sum(latencies) / len(latencies)
                        calls_over_80ms = sum(1 for l in latencies if l > 80.0)
        except Exception:
            pass

    # Cost-per-transaction estimation:
    # CPU Vector Search + Scorer Compute: ~$0.000002 per request ($0.002 / 1k requests)
    # Cached Embedding Inference: ~$0.0000005 per request
    cost_per_1k = 0.0025
    cost_per_request = cost_per_1k / 1000.0

    return {
        "total_requests": total_calls,
        "average_latency_ms": round(avg_latency, 2),
        "target_threshold_ms": 80.0,
        "sla_breaches": calls_over_80ms,
        "estimated_cost_per_request_usd": cost_per_request,
        "estimated_cost_per_1k_requests_usd": cost_per_1k,
        "loaded_articles": len(STATE.get("articles_df", [])),
        "index_total_vectors": STATE["faiss_index"].ntotal if STATE.get("faiss_index") else 0
    }


@app.post("/events")

def log_event(event: EventRequest):
    """
    POST /events -> Records session events (clicks, views, purchases)
    Applies DPDP anonymization to customer_id if provided.
    """
    session_id = event.session_id
    art_id = event.article_id
    evt_type = event.event_type

    # DPDP Anonymization
    pseudo_id = anonymize_session(event.customer_id) if event.customer_id else "pseudo_anonymous"

    if session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = []

    evt_record = {
        "article_id": art_id,
        "event_type": evt_type,
        "timestamp": time.time()
    }
    SESSION_STORE[session_id].append(evt_record)

    # Audit logging
    audit_log({
        "pseudo_id": pseudo_id,
        "session_id": session_id,
        "action": f"event_{evt_type}",
        "article_id": art_id,
        "consent": event.consent
    })

    return {
        "status": "success",
        "session_id": session_id,
        "event_count": len(SESSION_STORE[session_id])
    }


@app.get("/recommendations/home")
@track_latency
def get_home_recommendations(
    session_id: Optional[str] = Query(None),
    consent: bool = Query(True),
    limit: int = Query(20, ge=1, le=100)
):
    """
    GET /recommendations/home -> Personalized feed recommendations
    Integrates two-tower scoring, 35% diversity cap, explainability reasons, and DPDP consent guardrails.
    """
    articles_df = STATE.get("articles_df", pd.DataFrame())
    all_article_ids = list(articles_df.index) if not articles_df.empty else list(STATE.get("art_to_idx", {}).keys())

    session_events = SESSION_STORE.get(session_id, []) if session_id else []

    # Check DPDP Consent
    consent_granted = check_consent({"consent": consent})

    # If consent is False/blocked or session is empty, fallback to popular articles
    if not consent_granted or not session_events:
        top_popular_ids = all_article_ids[:limit * 2]
        raw_scored = [(aid, 0.50, "Popular item in this collection") for aid in top_popular_ids]
    else:
        # Candidate pool: all article IDs
        candidate_ids = all_article_ids[:500]  # Score candidate subset for latency efficiency
        raw_scored = score_candidates(session_events, candidate_ids, articles_df, top_k=limit * 2)

    # Apply 35% Diversity Cap
    diversified = enforce_diversity(raw_scored, articles_df, max_category_share=0.35, eval_k=limit)

    # Attach Explanations
    explained = attach_explanations(diversified[:limit])

    # Format JSON payload
    formatted_recs = [format_article_response(item, articles_df) for item in explained]

    return {
        "session_id": session_id,
        "consent_applied": consent_granted,
        "total_results": len(formatted_recs),
        "recommendations": formatted_recs
    }


@app.get("/recommendations/complete-the-look/{article_id}")
@track_latency
def get_complete_the_look(
    article_id: str,
    limit: int = Query(10, ge=1, le=50)
):
    """
    GET /recommendations/complete-the-look/{article_id}
    Retrieves complementary basket items (co-purchased pairs or vector similarity complements).
    """
    articles_df = STATE.get("articles_df", pd.DataFrame())
    comp_df = STATE.get("complementary_df", pd.DataFrame())
    art_id_str = str(article_id)

    matched_ids = []

    # 1. Lookup from complementary items table
    if not comp_df.empty:
        comp_matches = comp_df[comp_df["article_id"].astype(str) == art_id_str]
        if not comp_matches.empty:
            matched_ids = comp_matches["complementary_article_id"].astype(str).tolist()

    # 2. Vector search fallback if no direct co-purchases found
    if len(matched_ids) < limit and STATE.get("faiss_index") and art_id_str in STATE.get("art_to_idx", {}):
        idx = STATE["art_to_idx"][art_id_str]
        vec = STATE["embeddings"][idx:idx+1]
        faiss.normalize_L2(vec)
        _, indices = STATE["faiss_index"].search(vec, limit + 5)
        for i in indices[0]:
            cid = STATE["idx_to_art"].get(i)
            if cid and cid != art_id_str and cid not in matched_ids:
                matched_ids.append(cid)

    # Build response tuples
    raw_list = [
        (cid, 0.85, "Frequently bought together with this item")
        for cid in matched_ids[:limit]
    ]

    explained = attach_explanations(raw_list)
    formatted_recs = [format_article_response(item, articles_df) for item in explained]

    return {
        "anchor_article_id": art_id_str,
        "total_results": len(formatted_recs),
        "complementary_items": formatted_recs
    }


@app.get("/search")
@track_latency
def search_articles(
    q: str = Query(..., description="Search query string"),
    session_id: Optional[str] = Query(None),
    consent: bool = Query(True),
    limit: int = Query(20, ge=1, le=100)
):
    """
    GET /search?q=...&session_id=...
    Encodes semantic query using SentenceTransformer, searches FAISS index,
    re-ranks with session context, applies diversity, and attaches explanations.
    """
    articles_df = STATE.get("articles_df", pd.DataFrame())
    encoder = STATE.get("encoder")
    index = STATE.get("faiss_index")

    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    # 1. Encode Query Vector & FAISS Search
    query_vec = encoder.encode([q], normalize_embeddings=True).astype(np.float32)
    top_faiss_k = min(200, index.ntotal if index else 50)
    
    distances, indices = index.search(query_vec, top_faiss_k)
    candidate_ids = [STATE["idx_to_art"][i] for i in indices[0] if i in STATE["idx_to_art"]]

    session_events = SESSION_STORE.get(session_id, []) if session_id else []
    consent_granted = check_consent({"consent": consent})

    # 2. Re-rank with session context if session & consent available
    if consent_granted and session_events:
        scored = score_candidates(session_events, candidate_ids, articles_df, top_k=top_faiss_k)
    else:
        # Format direct FAISS similarity scores
        scored = [
            (aid, float(score), f"Semantic match for '{q}'")
            for aid, score in zip(candidate_ids, distances[0])
        ]

    # 3. Apply 35% Diversity Cap
    diversified = enforce_diversity(scored, articles_df, max_category_share=0.35, eval_k=limit)

    # 4. Attach Explanations
    explained = attach_explanations(diversified[:limit])

    formatted_results = [format_article_response(item, articles_df) for item in explained]

    return {
        "query": q,
        "session_id": session_id,
        "total_results": len(formatted_results),
        "results": formatted_results
    }


@app.get("/articles/{article_id}")
def get_article_by_id(article_id: str):
    """GET /articles/{article_id} -> Retrieves details for a specific article."""
    articles_df = STATE.get("articles_df", pd.DataFrame())
    art_id_str = str(article_id)

    if articles_df.empty or art_id_str not in articles_df.index:
        raise HTTPException(status_code=404, detail=f"Article '{article_id}' not found.")

    formatted = format_article_response({"article_id": art_id_str, "score": 1.0, "reason": "Target article"}, articles_df)
    return formatted


@app.get("/articles")
def list_articles(
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """GET /articles?category=...&limit=... -> Filtered & paginated article listing."""
    articles_df = STATE.get("articles_df", pd.DataFrame())

    if articles_df.empty:
        return {"total": 0, "articles": []}

    df_filtered = articles_df

    if category:
        cat_lower = category.lower()
        mask = (
            articles_df["product_type_name"].astype(str).str.lower().str.contains(cat_lower) |
            articles_df["department_name"].astype(str).str.lower().str.contains(cat_lower)
        )
        df_filtered = articles_df[mask]

    total_count = len(df_filtered)
    paged = df_filtered.iloc[offset:offset+limit]

    articles_list = [
        format_article_response({"article_id": aid, "score": 1.0, "reason": "Catalog listing"}, articles_df)
        for aid in paged.index
    ]

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "articles": articles_list
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
