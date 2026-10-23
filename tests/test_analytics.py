from fastapi.testclient import TestClient


def test_knowledge_gaps_and_misconceptions(client: TestClient, mock_gemini):
    """Test knowledge gap calculation and misconception recording after a quiz."""
    # 1. Ingest material
    mat_res = client.post(
        "/api/v1/materials/text",
        json={"title": "Cell Bio", "content": "Mitochondria produce ATP. Glycolysis breaks down glucose."},
    )
    mat_id = mat_res.json()["data"]["id"]

    # 2. Generate and submit quiz with an incorrect answer to trigger a misconception
    quiz_res = client.post("/api/v1/quizzes", json={"material_id": mat_id})
    quiz_data = quiz_res.json()["data"]
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]

    # Submit 1 correct ("A") and 1 wrong ("D")
    client.post(
        f"/api/v1/quizzes/{quiz_id}/submit",
        json={
            "answers": [
                {"question_id": questions[0]["id"], "selected_option": "A"},
                {"question_id": questions[1]["id"], "selected_option": "D"},
            ]
        },
    )

    # 3. Retrieve knowledge gaps
    gaps_res = client.get("/api/v1/analytics/knowledge-gaps")
    assert gaps_res.status_code == 200
    gaps_data = gaps_res.json()["data"]
    assert gaps_data["total_topics"] >= 1
    topic_item = gaps_data["topics"][0]
    assert topic_item["topic"] == "Cell Biology"
    assert "status" in topic_item
    assert "recommended_action" in topic_item

    # 4. Retrieve misconceptions
    misc_res = client.get("/api/v1/analytics/misconceptions")
    assert misc_res.status_code == 200
    misc_data = misc_res.json()["data"]
    assert misc_data["total_misconceptions"] >= 1
    assert misc_data["misconceptions"][0]["topic"] == "Cell Biology"
    assert misc_data["misconceptions"][0]["misconception_text"] != ""


def test_progress_and_verification(client: TestClient, mock_gemini):
    """Test overall progress metrics and diagnostic vs follow-up assessment verification."""
    # Check initial progress
    prog_res = client.get("/api/v1/analytics/progress")
    assert prog_res.status_code == 200
    prog_data = prog_res.json()["data"]
    assert "total_materials" in prog_data
    assert "average_score" in prog_data
    assert "recent_activity" in prog_data

    # Create verification
    verif_res = client.post(
        "/api/v1/analytics/verification",
        json={"topic": "Cell Biology"},
    )
    assert verif_res.status_code == 201
    verif_data = verif_res.json()["data"]
    verif_id = verif_data["id"]
    assert verif_data["topic"] == "Cell Biology"
    assert verif_data["status"] in ["completed", "awaiting_follow_up"]

    # Get verification by ID
    get_verif_res = client.get(f"/api/v1/analytics/verification/{verif_id}")
    assert get_verif_res.status_code == 200
    assert get_verif_res.json()["data"]["id"] == verif_id
