from fastapi.testclient import TestClient


def test_revision_plan_generation_and_task_update(client: TestClient):
    """Test generating adaptive revision plan and updating task statuses."""
    # Reset to start fresh
    client.post("/api/v1/demo/reset")

    # Generate plan (should create starter plan since no history yet)
    gen_res = client.post("/api/v1/revision-plan/generate")
    assert gen_res.status_code == 200
    plan_data = gen_res.json()["data"]
    assert plan_data["total_tasks"] >= 1
    assert plan_data["pending_tasks"] >= 1
    task_id = plan_data["tasks"][0]["id"]
    assert plan_data["tasks"][0]["status"] == "pending"

    # Get plan
    get_res = client.get("/api/v1/revision-plan")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["total_tasks"] == plan_data["total_tasks"]

    # Update task status to in_progress
    patch_res = client.patch(
        f"/api/v1/revision-plan/{task_id}",
        json={"status": "in_progress"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["status"] == "in_progress"

    # Complete task
    complete_res = client.patch(
        f"/api/v1/revision-plan/{task_id}",
        json={"status": "completed"},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["data"]["status"] == "completed"

    # Verify task status update is reflected in plan summary
    updated_plan = client.get("/api/v1/revision-plan").json()["data"]
    assert updated_plan["completed_tasks"] >= 1
