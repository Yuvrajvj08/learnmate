# LearnMate API — Endpoint Examples & Payload Catalog

This catalog provides realistic, tested request and response examples for every endpoint implemented in the LearnMate backend (`/api/v1`). All examples use safe, synthetic educational content and demonstrate both success and error response formats.

---

## Standard Response Contract

### Success Envelope Structure
Every successful response returns `HTTP 200` (or `HTTP 201` for creation) with this structure:
```json
{
  "data": {
    /* Endpoint specific payload */
  },
  "meta": {
    "request_id": "4b684cb3a70248439df67b45c2f32a76"
  }
}
```

### Error Envelope Structure
Every error response (4xx, 5xx) returns this structure:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of what went wrong.",
    "details": {}
  },
  "meta": {
    "request_id": "4b684cb3a70248439df67b45c2f32a76"
  }
}
```

---

## 1. System & Health Endpoints

### 1.1 `GET /api/v1/health`
**Purpose**: Liveness and database connectivity verification.
- **Headers**: None required.
- **Request Body**: None.

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/health
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-10-23T14:41:22.400063Z"
  },
  "meta": {
    "request_id": "31230d60ac6a4e5fbfba9db404704697"
  }
}
```

---

### 1.2 `GET /api/v1/config/status`
**Purpose**: Safe system configuration inspection. Never exposes secret keys or tokens.
- **Headers**: None required.
- **Request Body**: None.

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/config/status
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "gemini_configured": true,
    "model": "gemini-2.5-flash",
    "database_status": "connected",
    "max_pdf_pages": 20,
    "max_upload_mb": 10,
    "environment": "development"
  },
  "meta": {
    "request_id": "1647f9201fa047618613472420bef81b"
  }
}
```

---

### 1.3 `POST /api/v1/demo/reset`
**Purpose**: Resets demo student (`demo-student-001`) data to a clean state.
- **Prerequisites**: `ALLOW_DEMO_RESET` must be `true` in environment.
- **Headers**: None required.
- **Request Body**: None.

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/demo/reset
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "status": "reset_completed",
    "student_id": "demo-student-001",
    "message": "Demo student data has been reset to a clean state."
  },
  "meta": {
    "request_id": "8f1a23bc45e6789012345678abcdef01"
  }
}
```

#### Error Response (`HTTP 403 Forbidden` - if disabled in production):
```json
{
  "error": {
    "code": "HTTP_ERROR",
    "message": "Demo reset is disabled in this environment.",
    "details": {}
  },
  "meta": {
    "request_id": "8f1a23bc45e6789012345678abcdef01"
  }
}
```

---

## 2. Study Material Ingestion & Retrieval

### 2.1 `POST /api/v1/materials` (PDF Upload)
**Purpose**: Upload and index a PDF document page-by-page.
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF file binary (`application/pdf`)
  - `title`: *(Optional)* Text title

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/materials \
  -F "file=@biology_chapter1.pdf;type=application/pdf" \
  -F "title=Cellular Biology Chapter 1"
```

#### Success Response (`HTTP 201 Created`):
```json
{
  "data": {
    "id": "e6a4b13a7c3b4a229a50897b7cb244e8",
    "student_id": "demo-student-001",
    "title": "Cellular Biology Chapter 1",
    "material_type": "pdf",
    "page_count": 4,
    "char_count": 6420,
    "processing_status": "completed",
    "created_at": "2026-10-23T14:40:00Z",
    "updated_at": "2026-10-23T14:40:00Z"
  },
  "meta": {
    "request_id": "a91b2c3d4e5f60718293a4b5c6d7e8f9"
  }
}
```

#### Error Responses:
- **`HTTP 415 Unsupported Media Type`** (Non-PDF uploaded):
```json
{
  "error": {
    "code": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Uploaded file must be a PDF document.",
    "details": {}
  },
  "meta": { "request_id": "..." }
}
```
- **`HTTP 400 Bad Request`** (PDF exceeds 20 pages):
```json
{
  "error": {
    "code": "PAGE_LIMIT_EXCEEDED",
    "message": "PDF has 24 pages, which exceeds the limit of 20 pages.",
    "details": { "pages": 24, "max_pages": 20 }
  },
  "meta": { "request_id": "..." }
}
```
- **`HTTP 400 Bad Request`** (Scanned image-only PDF with no text):
```json
{
  "error": {
    "code": "EMPTY_OR_SCANNED_PDF",
    "message": "The uploaded PDF contains no extractable text (likely a scanned or image-only document). OCR is not supported in this version. Please upload a PDF with selectable text or paste study notes.",
    "details": {}
  },
  "meta": { "request_id": "..." }
}
```
- **`HTTP 413 Payload Too Large`** (File > 10MB):
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Uploaded file exceeds the maximum allowed size of 10 MB.",
    "details": { "max_mb": 10 }
  },
  "meta": { "request_id": "..." }
}
```

---

### 2.2 `POST /api/v1/materials/text` (Pasted Study Notes)
**Purpose**: Ingest raw study notes, split into section-referenced chunks.
- **Content-Type**: `application/json`

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/materials/text \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cellular Energetics Notes",
    "content": "Cellular respiration converts biochemical energy from glucose into ATP.\n\nGlycolysis takes place in the cytosol and breaks glucose down into pyruvate without oxygen.\n\nMitochondria generate the vast majority of ATP through the citric acid cycle and oxidative phosphorylation."
  }'
```

#### Success Response (`HTTP 201 Created`):
```json
{
  "data": {
    "id": "955c90b567bc43d99e4cc48b70c647ca",
    "student_id": "demo-student-001",
    "title": "Cellular Energetics Notes",
    "material_type": "text",
    "page_count": 1,
    "char_count": 312,
    "processing_status": "completed",
    "created_at": "2026-10-23T14:42:00Z",
    "updated_at": "2026-10-23T14:42:00Z"
  },
  "meta": {
    "request_id": "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6"
  }
}
```

---

### 2.3 `GET /api/v1/materials`
**Purpose**: List all study materials belonging to the demo student with pagination.
- **Query Parameters**:
  - `limit`: Integer (default 20, min 1, max 100)
  - `offset`: Integer (default 0, min 0)

#### Example Request:
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/materials?limit=10&offset=0"
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "materials": [
      {
        "id": "955c90b567bc43d99e4cc48b70c647ca",
        "student_id": "demo-student-001",
        "title": "Cellular Energetics Notes",
        "material_type": "text",
        "page_count": 1,
        "char_count": 312,
        "processing_status": "completed",
        "created_at": "2026-10-23T14:42:00Z",
        "updated_at": "2026-10-23T14:42:00Z"
      }
    ],
    "total": 1
  },
  "meta": {
    "request_id": "f1e2d3c4b5a697887766554433221100"
  }
}
```

---

### 2.4 `GET /api/v1/materials/{material_id}`
**Purpose**: Fetch metadata and chunk count for a single material.
- **Path Parameters**: `material_id` (string)

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/materials/955c90b567bc43d99e4cc48b70c647ca
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "id": "955c90b567bc43d99e4cc48b70c647ca",
    "student_id": "demo-student-001",
    "title": "Cellular Energetics Notes",
    "material_type": "text",
    "page_count": 1,
    "char_count": 312,
    "processing_status": "completed",
    "chunk_count": 2,
    "created_at": "2026-10-23T14:42:00Z",
    "updated_at": "2026-10-23T14:42:00Z"
  },
  "meta": { "request_id": "..." }
}
```

#### Error Response (`HTTP 404 Not Found`):
```json
{
  "error": {
    "code": "MATERIAL_NOT_FOUND",
    "message": "Study material 'unknown-id' was not found.",
    "details": { "material_id": "unknown-id" }
  },
  "meta": { "request_id": "..." }
}
```

---

### 2.5 `GET /api/v1/materials/{material_id}/content`
**Purpose**: Retrieve extracted chunks with page/section labels.
- **Path Parameters**: `material_id` (string)

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/materials/955c90b567bc43d99e4cc48b70c647ca/content
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "id": "955c90b567bc43d99e4cc48b70c647ca",
    "title": "Cellular Energetics Notes",
    "material_type": "text",
    "page_count": 1,
    "chunks": [
      {
        "id": "c1f834279ab44e4bb5024d9c792976b0",
        "page_number": null,
        "section_reference": "Section 1",
        "chunk_position": 0,
        "content": "Cellular respiration converts biochemical energy from glucose into ATP. Glycolysis takes place in the cytosol and breaks glucose down into pyruvate without oxygen.",
        "char_length": 165
      },
      {
        "id": "c2a938217bb44e4bb5024d9c792976b1",
        "page_number": null,
        "section_reference": "Section 2",
        "chunk_position": 1,
        "content": "Mitochondria generate the vast majority of ATP through the citric acid cycle and oxidative phosphorylation.",
        "char_length": 107
      }
    ]
  },
  "meta": { "request_id": "..." }
}
```

---

### 2.6 `DELETE /api/v1/materials/{material_id}`
**Purpose**: Deletes the material and its indexed chunks. Associated quiz records have `material_id` set to `NULL`.
- **Path Parameters**: `material_id` (string)

#### Example Request:
```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/materials/955c90b567bc43d99e4cc48b70c647ca
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "id": "955c90b567bc43d99e4cc48b70c647ca",
    "deleted": true,
    "message": "Study material and its indexed chunks were deleted successfully."
  },
  "meta": { "request_id": "..." }
}
```

---

## 3. Grounded AI Tutor

### 3.1 `POST /api/v1/tutor/ask`
**Purpose**: Ask questions strictly grounded in the specified study material.
- **Content-Type**: `application/json`
- **Request Body Fields**:
  - `material_id` (string, required): ID of existing material.
  - `question` (string, required): 2-1000 characters.
  - `learning_level` (string, optional): `"beginner"`, `"intermediate"`, or `"advanced"` (default `"intermediate"`).

#### Example Request (Grounded Question):
```bash
curl -X POST http://127.0.0.1:8000/api/v1/tutor/ask \
  -H "Content-Type: application/json" \
  -d '{
    "material_id": "955c90b567bc43d99e4cc48b70c647ca",
    "question": "Where does glycolysis occur?",
    "learning_level": "beginner"
  }'
```

#### Success Response (`HTTP 200` - Grounded):
```json
{
  "data": {
    "answer": "Glycolysis takes place in the cytosol (the fluid inside the cell outside the organelles) and does not require oxygen.",
    "sources": [
      {
        "page_number": null,
        "section_reference": "Section 1",
        "excerpt": "Glycolysis takes place in the cytosol and breaks glucose down into pyruvate without oxygen."
      }
    ],
    "grounded": true,
    "insufficient_evidence": false,
    "follow_up_questions": [
      "What molecules are produced at the end of glycolysis?",
      "Where does pyruvate go after glycolysis in aerobic conditions?"
    ]
  },
  "meta": { "request_id": "..." }
}
```

#### Success Response (`HTTP 200` - Explicit Abstention):
When a question is outside the scope of the material:
```json
{
  "data": {
    "answer": "The supplied study material does not provide sufficient information to answer your question. LearnMate strictly avoids inventing facts or citations. Please verify that your uploaded material covers this subject or ask a question directly related to the notes.",
    "sources": [],
    "grounded": false,
    "insufficient_evidence": true,
    "follow_up_questions": [
      "What are the main topics covered in 'Cellular Energetics Notes'?",
      "Can you summarize the introduction of these notes?",
      "Can you explain the key concepts in this material?"
    ]
  },
  "meta": { "request_id": "..." }
}
```

---

## 4. Quizzes & Server-Side Practice

### 4.1 `POST /api/v1/quizzes` (Create Quiz)
**Purpose**: Generates a multiple-choice quiz grounded in the material using Gemini. Answer keys are strictly stored server-side.
- **Content-Type**: `application/json`
- **Request Body Fields**:
  - `material_id` (string, required)
  - `quiz_type` (string, optional): `"diagnostic"`, `"practice"`, or `"follow_up"` (default `"practice"`)
  - `topic` (string, optional): specific topic focus
  - `question_count` (int, optional): 1-15 (default 5)
  - `difficulty` (string, optional): `"easy"`, `"medium"`, `"hard"` (default `"medium"`)

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quizzes \
  -H "Content-Type: application/json" \
  -d '{
    "material_id": "955c90b567bc43d99e4cc48b70c647ca",
    "quiz_type": "diagnostic",
    "topic": "Cellular Energetics",
    "question_count": 2,
    "difficulty": "medium"
  }'
```

#### Success Response (`HTTP 201 Created` - Answer Keys Withheld):
```json
{
  "data": {
    "id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
    "material_id": "955c90b567bc43d99e4cc48b70c647ca",
    "quiz_type": "diagnostic",
    "topic": "Cellular Energetics",
    "difficulty": "medium",
    "question_count": 2,
    "questions": [
      {
        "id": "q1_id_12345",
        "question_number": 1,
        "prompt": "Where does glycolysis take place in a eukaryotic cell?",
        "question_type": "multiple_choice",
        "options": [
          "A. Cytosol (Cytoplasm)",
          "B. Mitochondrial Matrix",
          "C. Inner Cristae",
          "D. Endoplasmic Reticulum"
        ],
        "topic": "Cellular Energetics"
      },
      {
        "id": "q2_id_67890",
        "question_number": 2,
        "prompt": "Which organelle generates the vast majority of cellular ATP?",
        "question_type": "multiple_choice",
        "options": [
          "A. Nucleus",
          "B. Mitochondria",
          "C. Ribosome",
          "D. Vacuole"
        ],
        "topic": "Cellular Energetics"
      }
    ],
    "created_at": "2026-10-23T14:44:00Z"
  },
  "meta": { "request_id": "..." }
}
```

---

### 4.2 `GET /api/v1/quizzes/{quiz_id}`
**Purpose**: Fetch quiz questions with answers safely withheld.
- **Path Parameters**: `quiz_id` (string)

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/quizzes/b5d3a0a9ad0e4174bdf99e63f85a33d4
```

#### Success Response (`HTTP 200`): Same structure as quiz creation above; answers and explanations are never exposed.

---

### 4.3 `POST /api/v1/quizzes/{quiz_id}/submit`
**Purpose**: Submit answers for deterministic server-side grading. Calculates score, reveals explanations, updates topic mastery, and records misconceptions.
- **Content-Type**: `application/json`

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quizzes/b5d3a0a9ad0e4174bdf99e63f85a33d4/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      { "question_id": "q1_id_12345", "selected_option": "A" },
      { "question_id": "q2_id_67890", "selected_option": "C" }
    ]
  }'
```

#### Success Response (`HTTP 200` - Grading Results):
```json
{
  "data": {
    "quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
    "attempt_id": "att_789abc",
    "total_questions": 2,
    "correct_count": 1,
    "score_percentage": 50.0,
    "questions": [
      {
        "question_id": "q1_id_12345",
        "question_number": 1,
        "prompt": "Where does glycolysis take place in a eukaryotic cell?",
        "selected_option": "A",
        "correct_option": "A",
        "is_correct": true,
        "explanation": "Glycolysis breaks down glucose in the cytosol.",
        "topic": "Cellular Energetics"
      },
      {
        "question_id": "q2_id_67890",
        "question_number": 2,
        "prompt": "Which organelle generates the vast majority of cellular ATP?",
        "selected_option": "C",
        "correct_option": "B",
        "is_correct": false,
        "explanation": "Mitochondria generate ATP through oxidative phosphorylation.",
        "topic": "Cellular Energetics"
      }
    ],
    "topic_performance": [
      {
        "topic": "Cellular Energetics",
        "total": 2,
        "correct": 1,
        "percentage": 50.0
      }
    ],
    "recommended_next_action": "Several core misconceptions detected. Consult the AI Tutor for clarification and complete suggested revision tasks.",
    "updated_mastery": [
      {
        "topic": "Cellular Energetics",
        "accuracy": 50.0,
        "status": "not_enough_data",
        "confidence": "low",
        "recommended_action": "Complete more practice quizzes on this topic to calibrate mastery."
      }
    ]
  },
  "meta": { "request_id": "..." }
}
```

---

## 5. Analytics, Knowledge Gaps & Misconceptions

### 5.1 `GET /api/v1/analytics/knowledge-gaps`
**Purpose**: Retrieve topic mastery estimates and actionable recommendations.
- **Status values**: `"not_enough_data"`, `"weak"`, `"developing"`, `"strong"`.

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/knowledge-gaps
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "topics": [
      {
        "topic": "Molecular Genetics",
        "accuracy": 0.0,
        "attempts_count": 1,
        "confidence": "low",
        "status": "not_enough_data",
        "recommended_action": "Complete more practice quizzes on this topic to calibrate mastery."
      },
      {
        "topic": "Cellular Energetics",
        "accuracy": 100.0,
        "attempts_count": 1,
        "confidence": "low",
        "status": "not_enough_data",
        "recommended_action": "Complete more practice quizzes on this topic to calibrate mastery."
      }
    ],
    "total_topics": 2
  },
  "meta": { "request_id": "..." }
}
```

---

### 5.2 `GET /api/v1/analytics/misconceptions`
**Purpose**: Retrieve diagnosed student misconceptions grounded in actual incorrect answers.

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/misconceptions
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "misconceptions": [
      {
        "id": "misc_394871",
        "topic": "Molecular Genetics",
        "misconception_text": "Confusing 3' to 5' template reading with 5' to 3' synthesis direction.",
        "evidence_question": "In what direction does DNA polymerase synthesize new DNA strands?",
        "evidence_answer": "Selected: A. 3' to 5' only (Correct: C. 5' to 3' only)",
        "suggested_practice": "Review the replication fork diagram showing continuous leading strand synthesis toward the 5' direction.",
        "confidence": "medium",
        "detected_at": "2026-10-23T14:48:00Z"
      }
    ],
    "total_misconceptions": 1
  },
  "meta": { "request_id": "..." }
}
```

---

### 5.3 `GET /api/v1/analytics/progress`
**Purpose**: Comprehensive progress dashboard including recent activities, average score, and assessment verifications.

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/progress
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "total_materials": 1,
    "total_quizzes": 1,
    "total_attempts": 1,
    "average_score": 66.7,
    "questions_answered": 3,
    "recent_activity": [
      {
        "type": "quiz_attempt",
        "title": "Completed diagnostic on Cellular Energetics",
        "timestamp": "2026-10-23T14:45:00Z",
        "details": {
          "score_percentage": 66.7,
          "correct": 2,
          "total": 3,
          "quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4"
        }
      },
      {
        "type": "material_upload",
        "title": "Added study material: Cellular Energetics Notes",
        "timestamp": "2026-10-23T14:42:00Z",
        "details": {
          "material_type": "text",
          "page_count": 1
        }
      }
    ],
    "topic_trends": [
      {
        "topic": "Molecular Genetics",
        "accuracy": 0.0,
        "attempts_count": 1,
        "confidence": "low",
        "status": "not_enough_data",
        "recommended_action": "Complete more practice quizzes on this topic to calibrate mastery."
      }
    ],
    "verifications": []
  },
  "meta": { "request_id": "..." }
}
```

---

### 5.4 `POST /api/v1/analytics/verification` & `GET /api/v1/analytics/verification/{id}`
**Purpose**: Compares an initial diagnostic assessment with a follow-up assessment to verify score improvements.
- **Status values**: `"awaiting_follow_up"`, `"completed"`.

#### Example Request (Initiate Verification):
```bash
curl -X POST http://127.0.0.1:8000/api/v1/analytics/verification \
  -H "Content-Type: application/json" \
  -d '{ "topic": "Cellular Energetics" }'
```

#### Success Response (`HTTP 201 Created`):
```json
{
  "data": {
    "id": "verif_abc123",
    "topic": "Cellular Energetics",
    "material_id": null,
    "diagnostic_quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
    "follow_up_quiz_id": null,
    "initial_score": 66.7,
    "follow_up_score": null,
    "score_difference": null,
    "status": "awaiting_follow_up",
    "assessment_ids": {
      "diagnostic_quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
      "follow_up_quiz_id": null
    },
    "message": "Verification tracking initiated. Take the follow-up assessment to verify score improvements."
  },
  "meta": { "request_id": "..." }
}
```

#### Success Response (`HTTP 200` - After follow-up completed):
```json
{
  "data": {
    "id": "verif_abc123",
    "topic": "Cellular Energetics",
    "diagnostic_quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
    "follow_up_quiz_id": "follow_quiz_999",
    "initial_score": 66.7,
    "follow_up_score": 100.0,
    "score_difference": 33.3,
    "status": "completed",
    "assessment_ids": {
      "diagnostic_quiz_id": "b5d3a0a9ad0e4174bdf99e63f85a33d4",
      "follow_up_quiz_id": "follow_quiz_999"
    },
    "message": "Measurable improvement verified: +33.3 percentage points."
  },
  "meta": { "request_id": "..." }
}
```

---

## 6. Adaptive Revision Planner

### 6.1 `GET /api/v1/revision-plan`
**Purpose**: Retrieve all persisted revision tasks sorted by priority (`high` -> `medium` -> `low`).

#### Example Request:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/revision-plan
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "tasks": [
      {
        "id": "task_112233",
        "title": "Clarify Misconception: Molecular Genetics",
        "topic": "Molecular Genetics",
        "priority": "high",
        "reason": "Detected conceptual confusion: Confusing 3' to 5' template reading with 5' to 3' synthesis direction.",
        "suggested_activity": "Review the replication fork diagram showing continuous leading strand synthesis toward the 5' direction.",
        "status": "pending",
        "due_date": "Today",
        "created_at": "2026-10-23T14:49:00Z",
        "updated_at": "2026-10-23T14:49:00Z"
      }
    ],
    "total_tasks": 1,
    "pending_tasks": 1,
    "completed_tasks": 0
  },
  "meta": { "request_id": "..." }
}
```

---

### 6.2 `POST /api/v1/revision-plan/generate`
**Purpose**: Generates or updates revision recommendations based on active topic mastery, recent quiz errors, and misconceptions. If no history exists, generates a transparent starter plan.

#### Example Request:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/revision-plan/generate
```

#### Success Response (`HTTP 200`): Same structure as `GET /api/v1/revision-plan`.

---

### 6.3 `PATCH /api/v1/revision-plan/{task_id}`
**Purpose**: Update task status.
- **Allowed Statuses**: `"pending"`, `"in_progress"`, `"completed"`.

#### Example Request:
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/revision-plan/task_112233 \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```

#### Success Response (`HTTP 200`):
```json
{
  "data": {
    "id": "task_112233",
    "title": "Clarify Misconception: Molecular Genetics",
    "topic": "Molecular Genetics",
    "priority": "high",
    "reason": "Detected conceptual confusion: Confusing 3' to 5' template reading with 5' to 3' synthesis direction.",
    "suggested_activity": "Review the replication fork diagram showing continuous leading strand synthesis toward the 5' direction.",
    "status": "completed",
    "due_date": "Today",
    "created_at": "2026-10-23T14:49:00Z",
    "updated_at": "2026-10-23T14:52:00Z"
  },
  "meta": { "request_id": "..." }
}
```
