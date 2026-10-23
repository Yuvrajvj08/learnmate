# LearnMate REST API Contract (v1)

This document is the integration guide for the frontend developer connecting **Google Stitch** (or React/Vue/Next.js) to the **LearnMate** backend.

---

## 1. General Principles

- **Base URL**: `http://localhost:8000/api/v1`
- **Interactive Documentation**: `http://localhost:8000/docs` (Swagger UI)
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`
- **Default Student**: All requests operate under the default student context (`demo-student-001`). No login or auth token required for the MVP.
- **Request Tracing**: All requests and responses include an `X-Request-ID` header. If passed by the client, it is mirrored; otherwise, a unique UUID is assigned.

---

## 2. Standard Envelope Formats

### Success Response Envelope (`HTTP 200 / 201`)
```json
{
  "data": { ... },
  "meta": {
    "request_id": "c581acbfe2d64a558d9386015817eeae"
  }
}
```

### Error Response Envelope (`HTTP 400 / 404 / 413 / 415 / 422 / 503 / 500`)
```json
{
  "error": {
    "code": "MATERIAL_NOT_FOUND",
    "message": "Study material 'mat-123' was not found.",
    "details": {}
  },
  "meta": {
    "request_id": "c581acbfe2d64a558d9386015817eeae"
  }
}
```

---

## 3. Endpoints Matrix

| Area | Method | Endpoint | Request Body | Description |
|---|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | None | Application status & DB readiness |
| **Config** | `GET` | `/api/v1/config/status` | None | Gemini configuration & server limits |
| **Demo** | `POST` | `/api/v1/demo/reset` | None | Development reset for demo data |
| **Materials** | `POST` | `/api/v1/materials` | `multipart/form-data` | Upload PDF (up to 20 pages) |
| **Materials** | `POST` | `/api/v1/materials/text` | JSON | Submit pasted study notes |
| **Materials** | `GET` | `/api/v1/materials` | Query: `limit`, `offset` | List student materials |
| **Materials** | `GET` | `/api/v1/materials/{id}` | None | Material metadata & chunk counts |
| **Materials** | `GET` | `/api/v1/materials/{id}/content` | None | Extracted chunks & citations |
| **Materials** | `DELETE`| `/api/v1/materials/{id}` | None | Delete material and chunks |
| **AI Tutor** | `POST` | `/api/v1/tutor/ask` | JSON | Grounded Q&A with citations/abstention |
| **Quizzes** | `POST` | `/api/v1/quizzes` | JSON | Generate quiz (answers hidden!) |
| **Quizzes** | `GET` | `/api/v1/quizzes/{id}` | None | Fetch quiz questions (answers hidden) |
| **Quizzes** | `POST` | `/api/v1/quizzes/{id}/submit` | JSON | Submit answers & get grading/explanations |
| **Analytics** | `GET` | `/api/v1/analytics/knowledge-gaps`| None | Topic mastery & weakness map |
| **Analytics** | `GET` | `/api/v1/analytics/misconceptions` | None | Diagnosed misconceptions & evidence |
| **Analytics** | `GET` | `/api/v1/analytics/progress` | None | Overall metrics & recent activity |
| **Verification**| `POST`| `/api/v1/analytics/verification` | JSON | Track diagnostic vs follow-up assessment |
| **Verification**| `GET` | `/api/v1/analytics/verification/{id}` | None | Score comparison & percentage delta |
| **Revision** | `GET` | `/api/v1/revision-plan` | None | Prioritized revision tasks |
| **Revision** | `POST` | `/api/v1/revision-plan/generate` | None | Generate/update revision tasks |
| **Revision** | `PATCH`| `/api/v1/revision-plan/{id}` | JSON: `{"status": "..."}` | Update task status |

---

## 4. Endpoint Specifications & Payloads

### 4.1 System & Health

#### `GET /api/v1/health`
**Response (200)**:
```json
{
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-10-23T14:38:56.677563Z"
  },
  "meta": { "request_id": "..." }
}
```

#### `GET /api/v1/config/status`
**Response (200)**:
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
  "meta": { "request_id": "..." }
}
```

---

### 4.2 Study Materials

#### `POST /api/v1/materials`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: PDF file (`.pdf`, max 10 MB, max 20 pages)
  - `title`: (Optional) String title
**Response (201)**:
```json
{
  "data": {
    "id": "e6a4b13a7c3b4a229a50897b7cb244e8",
    "student_id": "demo-student-001",
    "title": "Biology Chapter 3.pdf",
    "material_type": "pdf",
    "page_count": 5,
    "char_count": 7820,
    "processing_status": "completed",
    "created_at": "2026-10-23T14:40:00Z",
    "updated_at": "2026-10-23T14:40:00Z"
  },
  "meta": { "request_id": "..." }
}
```

#### `POST /api/v1/materials/text`
- **Content-Type**: `application/json`
```json
{
  "title": "Lecture Notes - Photosynthesis",
  "content": "Photosynthesis occurs in chloroplasts. Chlorophyll absorbs blue and red wavelengths..."
}
```
**Response (201)**: Same structure as PDF upload with `material_type: "text"`.

#### `GET /api/v1/materials/{id}/content`
**Response (200)**:
```json
{
  "data": {
    "id": "e6a4b13a...",
    "title": "Lecture Notes - Photosynthesis",
    "material_type": "text",
    "page_count": 1,
    "chunks": [
      {
        "id": "chunk-1",
        "page_number": null,
        "section_reference": "Section 1",
        "chunk_position": 0,
        "content": "Photosynthesis occurs in chloroplasts...",
        "char_length": 340
      }
    ]
  },
  "meta": { "request_id": "..." }
}
```

---

### 4.3 AI Tutor

#### `POST /api/v1/tutor/ask`
- **Content-Type**: `application/json`
```json
{
  "material_id": "e6a4b13a...",
  "question": "Where does the light-dependent reaction occur?",
  "learning_level": "intermediate"
}
```
**Response (200) - Grounded**:
```json
{
  "data": {
    "answer": "The light-dependent reactions take place across the thylakoid membranes inside chloroplasts.",
    "sources": [
      {
        "page_number": 2,
        "section_reference": "Page 2",
        "excerpt": "Light-dependent reactions occur within the thylakoid membranes."
      }
    ],
    "grounded": true,
    "insufficient_evidence": false,
    "follow_up_questions": [
      "What is the role of ATP synthase in the thylakoid membrane?",
      "How do light-independent reactions use this energy?"
    ]
  },
  "meta": { "request_id": "..." }
}
```
**Response (200) - Abstention**:
```json
{
  "data": {
    "answer": "The supplied study material does not provide sufficient information to answer your question...",
    "sources": [],
    "grounded": false,
    "insufficient_evidence": true,
    "follow_up_questions": [
      "What are the main topics covered in this material?"
    ]
  },
  "meta": { "request_id": "..." }
}
```

---

### 4.4 Quizzes & Practice

#### `POST /api/v1/quizzes`
- **Content-Type**: `application/json`
```json
{
  "material_id": "e6a4b13a...",
  "quiz_type": "diagnostic",
  "topic": "Cell Biology",
  "question_count": 3,
  "difficulty": "medium"
}
```
**Response (201)** — *Note: Answer keys are safely withheld!*
```json
{
  "data": {
    "id": "quiz-99",
    "material_id": "e6a4b13a...",
    "quiz_type": "diagnostic",
    "topic": "Cell Biology",
    "difficulty": "medium",
    "question_count": 3,
    "questions": [
      {
        "id": "q-1",
        "question_number": 1,
        "prompt": "Where does glycolysis occur?",
        "question_type": "multiple_choice",
        "options": [
          "A. Cytosol",
          "B. Mitochondrial Matrix",
          "C. Ribosome",
          "D. Nucleus"
        ],
        "topic": "Cell Biology"
      }
    ],
    "created_at": "2026-10-23T14:45:00Z"
  },
  "meta": { "request_id": "..." }
}
```

#### `POST /api/v1/quizzes/{quiz_id}/submit`
- **Content-Type**: `application/json`
```json
{
  "answers": [
    { "question_id": "q-1", "selected_option": "A" }
  ]
}
```
**Response (200)** — *Grading results with explanations*:
```json
{
  "data": {
    "quiz_id": "quiz-99",
    "attempt_id": "att-12",
    "total_questions": 1,
    "correct_count": 1,
    "score_percentage": 100.0,
    "questions": [
      {
        "question_id": "q-1",
        "question_number": 1,
        "prompt": "Where does glycolysis occur?",
        "selected_option": "A",
        "correct_option": "A",
        "is_correct": true,
        "explanation": "Glycolysis breaks down glucose in the cytosol.",
        "topic": "Cell Biology"
      }
    ],
    "topic_performance": [
      { "topic": "Cell Biology", "total": 1, "correct": 1, "percentage": 100.0 }
    ],
    "recommended_next_action": "Excellent performance! Generate a follow-up assessment or proceed to advanced topics.",
    "updated_mastery": [
      {
        "topic": "Cell Biology",
        "accuracy": 100.0,
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

### 4.5 Knowledge Gap Map & Misconceptions

#### `GET /api/v1/analytics/knowledge-gaps`
**Response (200)**:
```json
{
  "data": {
    "topics": [
      {
        "topic": "Cell Biology",
        "accuracy": 50.0,
        "attempts_count": 4,
        "confidence": "medium",
        "status": "weak",
        "recommended_action": "Review core foundational notes and complete a targeted practice quiz."
      }
    ],
    "total_topics": 1
  },
  "meta": { "request_id": "..." }
}
```

#### `GET /api/v1/analytics/misconceptions`
**Response (200)**:
```json
{
  "data": {
    "misconceptions": [
      {
        "id": "misc-1",
        "topic": "Cell Biology",
        "misconception_text": "Confusing cytoplasm location of glycolysis with mitochondrial matrix.",
        "evidence_question": "Where does glycolysis occur?",
        "evidence_answer": "Selected: B. Mitochondrial Matrix (Correct: A. Cytosol)",
        "suggested_practice": "Review cell diagrams highlighting cytosol vs cristae.",
        "confidence": "high",
        "detected_at": "2026-10-23T14:46:00Z"
      }
    ],
    "total_misconceptions": 1
  },
  "meta": { "request_id": "..." }
}
```

---

### 4.6 Adaptive Revision Planner

#### `GET /api/v1/revision-plan`
**Response (200)**:
```json
{
  "data": {
    "tasks": [
      {
        "id": "task-1",
        "title": "Review Core Concepts: Cell Biology",
        "topic": "Cell Biology",
        "priority": "high",
        "reason": "Current accuracy is 50.0% (weak).",
        "suggested_activity": "Ask AI Tutor to explain glycolysis with beginner analogies.",
        "status": "pending",
        "due_date": "Immediate",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "total_tasks": 1,
    "pending_tasks": 1,
    "completed_tasks": 0
  },
  "meta": { "request_id": "..." }
}
```

#### `PATCH /api/v1/revision-plan/{task_id}`
- **Content-Type**: `application/json`
```json
{ "status": "completed" }
```
Status choices: `"pending"`, `"in_progress"`, `"completed"`.

---

### 4.7 Assessment Verification

#### `POST /api/v1/analytics/verification`
```json
{
  "topic": "Cell Biology"
}
```
Links the initial diagnostic quiz to a follow-up assessment.

#### `GET /api/v1/analytics/verification/{verification_id}`
**Response (200)**:
```json
{
  "data": {
    "id": "verif-1",
    "topic": "Cell Biology",
    "diagnostic_quiz_id": "quiz-1",
    "follow_up_quiz_id": "quiz-2",
    "initial_score": 50.0,
    "follow_up_score": 85.0,
    "score_difference": 35.0,
    "status": "completed",
    "assessment_ids": {
      "diagnostic_quiz_id": "quiz-1",
      "follow_up_quiz_id": "quiz-2"
    },
    "message": "Measurable improvement verified: +35.0 percentage points."
  },
  "meta": { "request_id": "..." }
}
```
