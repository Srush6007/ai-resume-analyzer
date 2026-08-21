from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    """Verify that the health endpoint returns a successful response."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
