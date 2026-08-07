import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).parent.parent.resolve()
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app


@pytest.fixture(scope="module")
def client():
    """Module-scoped TestClient fixture for FastAPI main app."""
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    """Test GET /health returns 200 OK and expected status metrics."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "loaded_articles" in data
    assert "index_vectors" in data
    assert data["loaded_articles"] >= 0


def test_events_endpoint(client):
    """Test POST /events successfully records session interactions."""
    payload = {
        "session_id": "test_session_100",
        "article_id": "0000000001",
        "event_type": "click",
        "customer_id": "cust_test_user_001",
        "consent": True
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["session_id"] == "test_session_100"
    assert data["event_count"] >= 1


def test_recommendations_home_with_fake_session(client):
    """Test GET /recommendations/home returns personalized recommendations for a fake session."""
    session_id = "test_session_home_feed"
    
    # 1. Populate fake session with event interactions
    for art_id in ["0000000001", "0000000002", "0000000003"]:
        client.post("/events", json={
            "session_id": session_id,
            "article_id": art_id,
            "event_type": "view",
            "consent": True
        })

    # 2. Query recommendations endpoint
    response = client.get(f"/recommendations/home?session_id={session_id}&limit=10")
    assert response.status_code == 200
    data = response.json()

    assert data["session_id"] == session_id
    assert data["consent_applied"] is True
    assert "recommendations" in data
    
    recs = data["recommendations"]
    assert len(recs) > 0
    assert len(recs) <= 10

    # Verify structured article fields
    first_item = recs[0]
    assert "article_id" in first_item
    assert "title" in first_item
    assert "price" in first_item
    assert "image_url" in first_item
    assert "category" in first_item
    assert "score" in first_item
    assert "reason" in first_item
    assert isinstance(first_item["reason"], str)


def test_recommendations_home_without_consent(client):
    """Test GET /recommendations/home falls back to non-personalized feed when consent=False."""
    response = client.get("/recommendations/home?session_id=test_session_home_feed&consent=false&limit=5")
    assert response.status_code == 200
    data = response.json()

    assert data["consent_applied"] is False
    assert len(data["recommendations"]) > 0
