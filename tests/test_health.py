from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Verify health check returns status ok and database connected."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    json_data = response.json()
    assert "data" in json_data
    assert "meta" in json_data
    assert json_data["data"]["status"] == "ok"
    assert json_data["data"]["database"] == "connected"
    assert "request_id" in json_data["meta"]


def test_config_status_endpoint(client: TestClient):
    """Verify configuration status returns readiness indicators without leaking secrets."""
    response = client.get("/api/v1/config/status")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert "gemini_configured" in data
    assert isinstance(data["gemini_configured"], bool)
    assert "model" in data
    assert data["max_pdf_pages"] == 20
    assert data["max_upload_mb"] == 10
    assert "apiKey" not in str(json_data).lower()
    assert "secret" not in str(json_data).lower()


def test_demo_reset_endpoint(client: TestClient):
    """Verify demo reset clears student records cleanly."""
    response = client.post("/api/v1/demo/reset")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["data"]["status"] == "reset_completed"
    assert json_data["data"]["student_id"] == "demo-student-001"
