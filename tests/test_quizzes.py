from fastapi.testclient import TestClient


def test_quiz_lifecycle_and_answer_hiding(client: TestClient, mock_gemini):
    """
    Test quiz generation, verify answer keys are hidden before submission,
    and verify server-side deterministic grading upon submission.
    """
    # 1. Ingest study material
    mat_res = client.post(
        "/api/v1/materials/text",
        json={
            "title": "Cell Metabolism",
            "content": "Mitochondria produce cellular ATP. Glycolysis breaks down glucose in the cytoplasm.",
        },
    )
    mat_id = mat_res.json()["data"]["id"]

    # 2. Generate quiz
    quiz_res = client.post(
        "/api/v1/quizzes",
        json={
            "material_id": mat_id,
            "quiz_type": "diagnostic",
            "question_count": 2,
            "difficulty": "medium",
        },
    )
    assert quiz_res.status_code == 201
    quiz_data = quiz_res.json()["data"]
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]
    assert len(questions) == 2

    # CRITICAL: Verify answer keys and explanations are withheld before submission
    for q in questions:
        assert "correct_option" not in q
        assert "explanation" not in q
        assert len(q["options"]) == 4

    # 3. Fetch quiz directly and ensure answers remain hidden
    get_quiz_res = client.get(f"/api/v1/quizzes/{quiz_id}")
    assert get_quiz_res.status_code == 200
    for q in get_quiz_res.json()["data"]["questions"]:
        assert "correct_option" not in q
        assert "explanation" not in q

    # 4. Submit answers: 1 correct ("A"), 1 incorrect ("C")
    submission_payload = {
        "answers": [
            {"question_id": questions[0]["id"], "selected_option": "A"},
            {"question_id": questions[1]["id"], "selected_option": "C"},
        ]
    }
    submit_res = client.post(f"/api/v1/quizzes/{quiz_id}/submit", json=submission_payload)
    assert submit_res.status_code == 200
    res_data = submit_res.json()["data"]

    assert res_data["quiz_id"] == quiz_id
    assert "attempt_id" in res_data
    assert res_data["total_questions"] == 2
    assert res_data["correct_count"] == 1
    assert res_data["score_percentage"] == 50.0

    # Verify explanations and correct options are revealed post-submission
    evals = res_data["questions"]
    assert len(evals) == 2
    assert evals[0]["is_correct"] is True
    assert evals[0]["correct_option"] == "A"
    assert evals[1]["is_correct"] is False
    assert evals[1]["correct_option"] == "B"
    assert evals[1]["explanation"] != ""

    # Verify topic performance
    assert len(res_data["topic_performance"]) >= 1
    assert "recommended_next_action" in res_data


def test_reject_invalid_and_duplicate_submission(client: TestClient, mock_gemini):
    """Test submission validation for duplicate and invalid question IDs."""
    mat_res = client.post(
        "/api/v1/materials/text",
        json={"title": "Test Material", "content": "Sample content for quiz generation."},
    )
    mat_id = mat_res.json()["data"]["id"]

    quiz_res = client.post("/api/v1/quizzes", json={"material_id": mat_id})
    quiz_id = quiz_res.json()["data"]["id"]
    q_id = quiz_res.json()["data"]["questions"][0]["id"]

    # Duplicate question ID in submission
    dup_payload = {
        "answers": [
            {"question_id": q_id, "selected_option": "A"},
            {"question_id": q_id, "selected_option": "B"},
        ]
    }
    dup_res = client.post(f"/api/v1/quizzes/{quiz_id}/submit", json=dup_payload)
    assert dup_res.status_code == 400
    assert dup_res.json()["error"]["code"] == "INVALID_SUBMISSION"

    # Non-existent question ID
    invalid_payload = {
        "answers": [
            {"question_id": "fake-question-id-000", "selected_option": "A"}
        ]
    }
    inv_res = client.post(f"/api/v1/quizzes/{quiz_id}/submit", json=invalid_payload)
    assert inv_res.status_code == 400
    assert inv_res.json()["error"]["code"] == "INVALID_SUBMISSION"
