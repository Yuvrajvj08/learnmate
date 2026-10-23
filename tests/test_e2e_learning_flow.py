from fastapi.testclient import TestClient


def test_complete_e2e_learning_workflow(client: TestClient, mock_gemini):
    """
    End-to-End deterministic test of the core LearnMate student learning workflow:
    1. Reset demo profile.
    2. Upload/paste study material.
    3. Ask AI Tutor a question and verify grounded citations.
    4. Generate a diagnostic quiz.
    5. Verify answer keys are hidden.
    6. Submit quiz answers.
    7. Retrieve knowledge gaps map.
    8. Retrieve diagnosed misconceptions.
    9. Generate adaptive revision plan.
    10. Complete a revision task.
    11. Verify learning progress tracking.
    """
    # 1. Reset
    reset_res = client.post("/api/v1/demo/reset")
    assert reset_res.status_code == 200

    # 2. Ingest Study Material
    material_payload = {
        "title": "Cellular Energetics & Respiration",
        "content": (
            "Cellular respiration is the set of metabolic reactions that convert nutrients into ATP.\n\n"
            "Mitochondria are the primary sites of ATP production in eukaryotic organisms.\n\n"
            "Glycolysis occurs in the cytosol, converting glucose into two pyruvate molecules without oxygen.\n\n"
            "The citric acid cycle (Krebs cycle) operates inside the mitochondrial matrix, producing NADH and FADH2."
        ),
    }
    mat_res = client.post("/api/v1/materials/text", json=material_payload)
    assert mat_res.status_code == 201
    material_id = mat_res.json()["data"]["id"]

    # 3. Ask AI Tutor
    tutor_res = client.post(
        "/api/v1/tutor/ask",
        json={
            "material_id": material_id,
            "question": "What is the role of mitochondria in cellular respiration?",
            "learning_level": "intermediate",
        },
    )
    assert tutor_res.status_code == 200
    tutor_data = tutor_res.json()["data"]
    assert tutor_data["grounded"] is True
    assert tutor_data["insufficient_evidence"] is False
    assert len(tutor_data["sources"]) > 0

    # 4. Generate Quiz
    quiz_res = client.post(
        "/api/v1/quizzes",
        json={
            "material_id": material_id,
            "quiz_type": "diagnostic",
            "topic": "Cell Biology",
            "question_count": 2,
            "difficulty": "medium",
        },
    )
    assert quiz_res.status_code == 201
    quiz_data = quiz_res.json()["data"]
    quiz_id = quiz_data["id"]
    questions = quiz_data["questions"]
    assert len(questions) == 2

    # 5. Verify security: answer keys are withheld
    for q in questions:
        assert "correct_option" not in q
        assert "explanation" not in q

    # 6. Submit Quiz Answers (1 correct: A, 1 wrong: C)
    submit_res = client.post(
        f"/api/v1/quizzes/{quiz_id}/submit",
        json={
            "answers": [
                {"question_id": questions[0]["id"], "selected_option": "A"},
                {"question_id": questions[1]["id"], "selected_option": "C"},
            ]
        },
    )
    assert submit_res.status_code == 200
    grading_data = submit_res.json()["data"]
    assert grading_data["correct_count"] == 1
    assert grading_data["total_questions"] == 2
    assert grading_data["score_percentage"] == 50.0

    # 7. Retrieve Knowledge Gaps
    gaps_res = client.get("/api/v1/analytics/knowledge-gaps")
    assert gaps_res.status_code == 200
    gaps_data = gaps_res.json()["data"]
    assert gaps_data["total_topics"] >= 1
    assert gaps_data["topics"][0]["topic"] == "Cell Biology"

    # 8. Retrieve Misconceptions
    misc_res = client.get("/api/v1/analytics/misconceptions")
    assert misc_res.status_code == 200
    misc_data = misc_res.json()["data"]
    assert misc_data["total_misconceptions"] >= 1

    # 9. Generate Adaptive Revision Plan
    plan_res = client.post("/api/v1/revision-plan/generate")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()["data"]
    assert plan_data["total_tasks"] >= 1
    task_id = plan_data["tasks"][0]["id"]

    # 10. Complete Revision Task
    patch_res = client.patch(f"/api/v1/revision-plan/{task_id}", json={"status": "completed"})
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["status"] == "completed"

    # 11. Retrieve Final Progress Dashboard
    prog_res = client.get("/api/v1/analytics/progress")
    assert prog_res.status_code == 200
    prog_data = prog_res.json()["data"]
    assert prog_data["total_materials"] >= 1
    assert prog_data["total_quizzes"] >= 1
    assert prog_data["total_attempts"] >= 1
    assert len(prog_data["recent_activity"]) >= 1
