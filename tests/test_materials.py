import io
from fastapi.testclient import TestClient


def test_create_and_get_pasted_notes(client: TestClient):
    """Test creating study material via pasted notes and retrieving metadata/content."""
    payload = {
        "title": "Cell Biology Lecture 1",
        "content": (
            "Mitochondria are the powerhouse of the cell.\n\n"
            "They produce ATP through aerobic cellular respiration.\n\n"
            "Glycolysis occurs in the cytoplasm and breaks glucose into pyruvate."
        ),
    }
    response = client.post("/api/v1/materials/text", json=payload)
    assert response.status_code == 201
    res_data = response.json()["data"]
    mat_id = res_data["id"]
    assert res_data["title"] == "Cell Biology Lecture 1"
    assert res_data["material_type"] == "text"
    assert res_data["processing_status"] == "completed"

    # Fetch metadata
    get_res = client.get(f"/api/v1/materials/{mat_id}")
    assert get_res.status_code == 200
    detail = get_res.json()["data"]
    assert detail["chunk_count"] >= 1

    # Fetch content
    content_res = client.get(f"/api/v1/materials/{mat_id}/content")
    assert content_res.status_code == 200
    content_data = content_res.json()["data"]
    assert len(content_data["chunks"]) >= 1
    assert "Mitochondria" in content_data["chunks"][0]["content"]


def test_upload_valid_pdf(client: TestClient, create_pdf_bytes):
    """Test uploading a valid PDF document."""
    pdf_bytes = create_pdf_bytes(page_count=3, text_per_page="Cell biology notes regarding ATP and metabolism.")
    files = {"file": ("biology_notes.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Cell Biology Textbook"}

    response = client.post("/api/v1/materials", files=files, data=data)
    assert response.status_code == 201
    res_data = response.json()["data"]
    assert res_data["title"] == "Cell Biology Textbook"
    assert res_data["page_count"] == 3
    assert res_data["material_type"] == "pdf"


def test_reject_non_pdf_upload(client: TestClient):
    """Test uploading a non-PDF file returns 415 Unsupported Media Type."""
    txt_content = b"This is plain text, not a PDF."
    files = {"file": ("notes.txt", io.BytesIO(txt_content), "text/plain")}

    response = client.post("/api/v1/materials", files=files)
    assert response.status_code == 415
    json_err = response.json()
    assert json_err["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_reject_pdf_exceeding_page_limit(client: TestClient, create_pdf_bytes):
    """Test uploading a PDF exceeding configured max pages (20) returns PAGE_LIMIT_EXCEEDED."""
    pdf_bytes = create_pdf_bytes(page_count=22, text_per_page="Exceeding page limit content.")
    files = {"file": ("too_long.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    response = client.post("/api/v1/materials", files=files)
    assert response.status_code == 400
    json_err = response.json()
    assert json_err["error"]["code"] == "PAGE_LIMIT_EXCEEDED"
    assert json_err["error"]["details"]["pages"] == 22


def test_reject_empty_or_scanned_pdf(client: TestClient, create_pdf_bytes):
    """Test uploading an empty or image-only scanned PDF returns informative OCR message."""
    pdf_bytes = create_pdf_bytes(page_count=2, text_per_page="")
    files = {"file": ("scanned_blank.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    response = client.post("/api/v1/materials", files=files)
    assert response.status_code == 400
    json_err = response.json()
    assert json_err["error"]["code"] == "EMPTY_OR_SCANNED_PDF"
    assert "OCR is not supported" in json_err["error"]["message"]


def test_unknown_material_id_returns_404(client: TestClient):
    """Test accessing non-existent material ID returns 404 MATERIAL_NOT_FOUND."""
    response = client.get("/api/v1/materials/non-existent-id-999")
    assert response.status_code == 404
    json_err = response.json()
    assert json_err["error"]["code"] == "MATERIAL_NOT_FOUND"


def test_delete_material(client: TestClient):
    """Test deleting study material and verifying removal."""
    create_res = client.post(
        "/api/v1/materials/text",
        json={"title": "To be deleted", "content": "Content to be deleted immediately."},
    )
    mat_id = create_res.json()["data"]["id"]

    del_res = client.delete(f"/api/v1/materials/{mat_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True

    # Confirm 404 afterwards
    get_res = client.get(f"/api/v1/materials/{mat_id}")
    assert get_res.status_code == 404


def test_rename_material(client: TestClient):
    """Test renaming a study material title."""
    create_res = client.post(
        "/api/v1/materials/text",
        json={"title": "Original Title", "content": "Important material content for testing."},
    )
    assert create_res.status_code == 201
    mat_id = create_res.json()["data"]["id"]

    # Rename
    rename_res = client.patch(f"/api/v1/materials/{mat_id}", json={"title": "Updated Brand New Title"})
    assert rename_res.status_code == 200
    res_data = rename_res.json()["data"]
    assert res_data["title"] == "Updated Brand New Title"
    assert res_data["id"] == mat_id

    # Verify via GET
    get_res = client.get(f"/api/v1/materials/{mat_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["title"] == "Updated Brand New Title"
