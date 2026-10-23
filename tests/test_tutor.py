from fastapi.testclient import TestClient


def test_tutor_grounded_answer(client: TestClient, mock_gemini):
    """Test AI Tutor returns grounded answer with page or section source references."""
    # Create material
    mat_res = client.post(
        "/api/v1/materials/text",
        json={
            "title": "Mitochondria Notes",
            "content": "Mitochondria produce ATP through cellular respiration in eukaryotic cells.",
        },
    )
    mat_id = mat_res.json()["data"]["id"]

    # Ask grounded question
    tutor_payload = {
        "material_id": mat_id,
        "question": "What do mitochondria produce?",
        "learning_level": "beginner",
    }
    response = client.post("/api/v1/tutor/ask", json=tutor_payload)
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["grounded"] is True
    assert data["insufficient_evidence"] is False
    assert len(data["sources"]) >= 1
    assert data["answer"] != ""
    assert isinstance(data["follow_up_questions"], list)


def test_tutor_abstains_on_insufficient_evidence(client: TestClient):
    """Test AI Tutor explicitly abstains when material does not contain relevant information."""
    mat_res = client.post(
        "/api/v1/materials/text",
        json={
            "title": "Physics Optics",
            "content": "Convex lenses converge light rays at the focal point. Concave lenses diverge light.",
        },
    )
    mat_id = mat_res.json()["data"]["id"]

    # Ask unrelated question
    tutor_payload = {
        "material_id": mat_id,
        "question": "Who was the first emperor of the Roman Empire?",
    }
    response = client.post("/api/v1/tutor/ask", json=tutor_payload)
    assert response.status_code == 200
    data = response.json()["data"]

    # Must abstain
    assert data["grounded"] is False
    assert data["insufficient_evidence"] is True
    assert "does not provide sufficient information" in data["answer"]
    assert len(data["sources"]) == 0
    assert len(data["follow_up_questions"]) > 0


def test_tutor_unknown_material(client: TestClient):
    """Test tutor returns 404 if material ID is unknown."""
    response = client.post(
        "/api/v1/tutor/ask",
        json={"material_id": "non-existent-xyz", "question": "What is ATP?"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MATERIAL_NOT_FOUND"
