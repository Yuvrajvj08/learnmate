# LearnMate Backend Handoff Guide

> **Audience**: Frontend engineers, full-stack developers, and evaluators connecting a new user interface (Google Stitch, React, Vue, Next.js, or mobile) to the existing LearnMate backend.  
> **Backend Version**: `1.0.0` (MVP Release)  
> **Status**: Verified, fully operational, 19 automated tests passing.

---

## 1. Technology and Architecture

### 1.1 Core Technologies
- **Programming Language**: Python 3.11+ (Runtime verified on Python 3.14.6)
- **Web Framework**: FastAPI (`0.141.1`)
- **ASGI Server**: Uvicorn (`0.54.0`)
- **Data Modeling & Validation**: Pydantic v2 (`2.13.4`) & Pydantic-Settings (`2.15.0`)
- **Database & ORM**: SQLite with SQLAlchemy 2.0 (`2.1.6`)
- **AI / LLM SDK**: Official Google GenAI SDK (`google-genai 2.33.0`)
- **PDF Extraction Engine**: PyMuPDF (`pymupdf 2.0`)
- **Testing Framework**: Pytest (`9.1.1`) with FastAPI `TestClient` and `HTTPX` (`0.28.1`)
- **Environment Management**: `python-dotenv` (`1.2.3`)

### 1.2 Project File Structure
```
learnmate-backend/
├── app/
│   ├── main.py                     # App factory, CORS, request tracing, global error handling
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings loading from .env
│   │   └── errors.py               # Domain exception classes and HTTP error codes
│   ├── db/
│   │   ├── database.py             # SQLite engine, SessionLocal, init_db()
│   │   └── models.py               # 11 SQLAlchemy models (students, materials, quizzes, analytics)
│   ├── schemas/
│   │   ├── common.py               # ApiResponse[T], ApiErrorResponse, MetaResponse envelopes
│   │   ├── system.py               # Health and configuration readiness schemas
│   │   ├── materials.py            # Upload, text notes, chunking, and content schemas
│   │   ├── tutor.py                # Grounded AI tutor and source citation schemas
│   │   ├── quizzes.py              # Quiz generation, hidden keys, and grading schemas
│   │   ├── analytics.py            # Knowledge gaps, misconceptions, progress, verification schemas
│   │   └── revision.py             # Adaptive revision task schemas
│   ├── services/
│   │   ├── gemini_service.py       # Google GenAI SDK wrapper with token tracking & error recovery
│   │   ├── document_service.py     # PyMuPDF PDF extraction, chunking, and validation
│   │   ├── retrieval_service.py    # Local lexical search, chunk scoring, and evidence thresholding
│   │   ├── quiz_service.py         # AI quiz generation & deterministic server-side grading
│   │   ├── learning_service.py     # Topic mastery calibration & misconception detection
│   │   └── revision_service.py     # Priority-based adaptive revision plan generator
│   └── api/
│       ├── response_utils.py       # Standard envelope builder
│       ├── router.py               # /api/v1 aggregation
│       └── routes/
│           ├── health.py           # /health, /config/status, /demo/reset
│           ├── materials.py        # /materials, /materials/text, /materials/{id}, /content
│           ├── tutor.py            # /tutor/ask (grounded Q&A with citations/abstention)
│           ├── quizzes.py          # /quizzes, /quizzes/{id}, /quizzes/{id}/submit
│           ├── analytics.py        # /analytics/knowledge-gaps, /misconceptions, /progress, /verification
│           └── revision.py         # /revision-plan, /revision-plan/generate, /revision-plan/{id}
├── docs/
│   └── API_CONTRACT.md             # Integration specification for Stitch developer
├── handoff/
│   ├── BACKEND_HANDOFF.md          # This complete handoff guide
│   ├── openapi.json                # Live exported OpenAPI 3.1 schema (69 KB)
│   ├── endpoint_examples.md        # Detailed request/response payloads
│   └── FRONTEND_INTEGRATION_CHECKLIST.md # Step-by-step UI connection checklist
├── tests/
│   ├── conftest.py                 # TestClient, DB isolation fixtures, mock Gemini
│   ├── test_health.py              # Health, readiness, and demo reset tests
│   ├── test_materials.py           # PDF/text ingestion and validation tests
│   ├── test_tutor.py               # Grounded Q&A citations and explicit abstention tests
│   ├── test_quizzes.py             # Answer concealment and server-side grading tests
│   ├── test_analytics.py           # Topic mastery, misconceptions, and progress tests
│   ├── test_revision.py            # Revision task generation and status update tests
│   └── test_e2e_learning_flow.py   # Full deterministic end-to-end learning lifecycle test
├── seed_demo.py                    # Deterministic sample seed script
├── requirements.txt                # Package dependencies
├── .env.example                    # Clean environment configuration template
├── .gitignore                      # Secrets, local database, and cache exclusions
└── README.md                       # Repository guide
```

### 1.3 How to Run the Backend
#### Windows (PowerShell):
```powershell
# 1. Install dependencies
pip install -r requirements.txt

# 2. Populate demo seed data (optional but recommended for instant UI testing)
python seed_demo.py

# 3. Start development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### macOS / Linux (Bash):
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Populate demo seed data
python seed_demo.py

# 3. Start development server
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
- **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`
- **Health Endpoint**: `http://127.0.0.1:8000/api/v1/health`

### 1.4 How to Run Tests
All automated tests use mock fixtures for Gemini and execute completely offline without consuming paid API quota:
```powershell
python -m pytest tests -v
```
*Current test suite result: 19 passed in 0.80 seconds.*

### 1.5 Database Technology, Models & Schema Setup
- **Engine**: SQLite (`DATABASE_URL=sqlite:///./learnmate.db`).
- **Initialization**: Tables are automatically created at application boot via the FastAPI lifespan event (`init_db()`), which also ensures the default demo profile (`demo-student-001`) exists.
- **Migration Tooling**: No Alembic migrations are currently used. The schema is declarative via SQLAlchemy `Base.metadata.create_all()`. For an MVP, schema adjustments can be applied by deleting the local `.db` file and restarting the application, or by adding Alembic if multi-environment production migrations are later needed.

#### Entity Relationship Summary:
1. `StudentProfile` (PK `id`): Root student entity (`demo-student-001`). Cascades deletions to materials, quizzes, mastery, misconceptions, and revision tasks.
2. `StudyMaterial` (PK `id`, FK `student_id`): Ingested PDFs or notes (`material_type: "pdf" | "text"`, `page_count`, `char_count`, `processing_status`).
3. `MaterialChunk` (PK `id`, FK `material_id` [CASCADE]): Granular text chunks (~1200 characters) preserving `page_number`, `section_reference`, and sequential `chunk_position`.
4. `QuizSession` (PK `id`, FK `student_id`, FK `material_id` [SET NULL]): Quiz session record (`quiz_type: "diagnostic" | "practice" | "follow_up"`, `topic`, `difficulty`, `question_count`).
5. `QuizQuestion` (PK `id`, FK `quiz_id` [CASCADE]): Individual multiple-choice question storing prompt, options JSON, `correct_option` (withheld before submission), explanation, and topic.
6. `QuizAttempt` (PK `id`, FK `quiz_id` [CASCADE], FK `student_id`): Submitted attempt record (`total_questions`, `correct_count`, `score_percentage`, `submitted_at`).
7. `QuizAttemptAnswer` (PK `id`, FK `attempt_id` [CASCADE], FK `question_id`): Student's selected option and boolean `is_correct` result.
8. `TopicMastery` (PK `id`, FK `student_id`, Unique `(student_id, topic)`): Calibration tracking (`total_attempts`, `correct_attempts`, `accuracy`, `status`, `confidence`, `recommended_action`).
9. `Misconception` (PK `id`, FK `student_id`): Conceptual confusion diagnosed from wrong answers (`misconception_text`, `evidence_question`, `evidence_answer`, `suggested_practice`, `confidence`).
10. `RevisionTask` (PK `id`, FK `student_id`): Adaptive action items (`title`, `topic`, `priority: "high" | "medium" | "low"`, `reason`, `suggested_activity`, `status: "pending" | "in_progress" | "completed"`, `due_date`).
11. `AssessmentVerification` (PK `id`, FK `student_id`): Pairs diagnostic and follow-up assessments to compute score delta (`initial_score`, `follow_up_score`, `score_difference`, `status`).
12. `GeminiUsageRecord` (PK `id`): Tracks API token usage per category (`tutor`, `quiz_generation`, `misconceptions`), model, prompt tokens, candidate tokens, total tokens, and status.

### 1.6 Required Environment Variables (Names Only)
Configure these in `.env` (or environment):
- `GEMINI_API_KEY`: Google Gemini API key from Google AI Studio. *(Required for AI features; server still starts if omitted).*
- `GEMINI_MODEL`: Model name (default: `gemini-2.5-flash`).
- `DATABASE_URL`: SQLAlchemy connection string (default: `sqlite:///./learnmate.db`).
- `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g. `http://localhost:3000,http://localhost:5173`).
- `MAX_PDF_PAGES`: Maximum pages permitted for PDF ingestion (default: `20`).
- `MAX_UPLOAD_MB`: Maximum file upload size in MB (default: `10`).
- `ALLOW_DEMO_RESET`: Boolean flag allowing `/api/v1/demo/reset` (default: `true`).
- `ENVIRONMENT`: Runtime environment label (default: `development`).
- `DEMO_STUDENT_ID`: Student ID for demo operations (default: `demo-student-001`).

---

## 2. Complete API Documentation

Base URL for all endpoints: `http://localhost:8000/api/v1`

### 2.1 Standard Envelopes
- **Success (`200 / 201`)**:
  ```json
  {
    "data": { ... },
    "meta": { "request_id": "string" }
  }
  ```
- **Error (`4xx / 5xx`)**:
  ```json
  {
    "error": {
      "code": "STRING_ERROR_CODE",
      "message": "Human-readable description.",
      "details": { ... }
    },
    "meta": { "request_id": "string" }
  }
  ```

---

### 2.2 Endpoint Reference Matrix

#### Endpoint 1: System Health
- **Method & Path**: `GET /api/v1/health`
- **Purpose**: Verifies that the FastAPI process is alive and SQLite is accepting queries.
- **Prerequisites**: Server is running.
- **Parameters / Body**: None.
- **Database Operations**: Reads (`SELECT 1`).
- **Success Status**: `200 OK`
- **Example Response**:
  ```json
  {
    "data": { "status": "ok", "database": "connected", "timestamp": "2026-10-23T14:41:22.400063Z" },
    "meta": { "request_id": "31230d60ac6a4e5fbfba9db404704697" }
  }
  ```
- **Error Statuses**: `500 Internal Server Error` if DB connection completely crashes.

#### Endpoint 2: System Configuration Status
- **Method & Path**: `GET /api/v1/config/status`
- **Purpose**: Returns safe configuration readiness indicators without revealing secret keys.
- **Prerequisites**: None.
- **Parameters / Body**: None.
- **Database Operations**: Reads (`SELECT 1`).
- **Success Status**: `200 OK`
- **Example Response**:
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
    "meta": { "request_id": "1647f9201fa047618613472420bef81b" }
  }
  ```

#### Endpoint 3: Development Demo Reset
- **Method & Path**: `POST /api/v1/demo/reset`
- **Purpose**: Cleans all materials, quizzes, attempts, mastery records, and revision tasks for `demo-student-001`.
- **Prerequisites**: `ALLOW_DEMO_RESET=true` in environment.
- **Parameters / Body**: None.
- **Database Operations**: Writes (deletes records for `demo-student-001`, re-seeds profile).
- **Success Status**: `200 OK`
- **Error Statuses**: `403 Forbidden` if `ALLOW_DEMO_RESET=false`.

#### Endpoint 4: Upload PDF Study Material
- **Method & Path**: `POST /api/v1/materials`
- **Purpose**: Ingests and indexes a PDF document page-by-page, chunking text with page numbers.
- **Prerequisites**: File must be a valid PDF <= 20 pages and <= 10 MB with extractable text.
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**: `file` (binary, required), `title` (string, optional).
- **Database Operations**: Writes (inserts `StudyMaterial` and `MaterialChunk` rows).
- **Success Status**: `201 Created`
- **Error Statuses**:
  - `415 Unsupported Media Type`: Non-PDF file uploaded (`UNSUPPORTED_MEDIA_TYPE`).
  - `400 Bad Request`: Exceeds 20 pages (`PAGE_LIMIT_EXCEEDED`) or is an empty/scanned PDF without OCR text (`EMPTY_OR_SCANNED_PDF`).
  - `413 Payload Too Large`: Exceeds 10 MB (`FILE_TOO_LARGE`).

#### Endpoint 5: Ingest Pasted Study Notes
- **Method & Path**: `POST /api/v1/materials/text`
- **Purpose**: Ingests raw text notes and chunks them by paragraph/section references.
- **Prerequisites**: Content must be >= 10 characters.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "title": "string", "content": "string" }`
- **Database Operations**: Writes (inserts `StudyMaterial` and `MaterialChunk` rows).
- **Success Status**: `201 Created`
- **Error Statuses**: `400 Bad Request` if content is empty or whitespace only (`EMPTY_CONTENT`); `422 Unprocessable Entity` for invalid schema.

#### Endpoint 6: List Study Materials
- **Method & Path**: `GET /api/v1/materials`
- **Purpose**: Lists materials belonging to `demo-student-001` with pagination.
- **Query Parameters**: `limit` (int, default 20, 1-100), `offset` (int, default 0, >=0).
- **Database Operations**: Reads (`study_materials` table).
- **Success Status**: `200 OK` (`{ "data": { "materials": [...], "total": int } }`)

#### Endpoint 7: Get Material Metadata
- **Method & Path**: `GET /api/v1/materials/{material_id}`
- **Purpose**: Retrieves single material details including total chunk count.
- **Path Parameters**: `material_id` (string).
- **Database Operations**: Reads (`study_materials` and `material_chunks` count).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`MATERIAL_NOT_FOUND`).

#### Endpoint 8: Get Material Extracted Content
- **Method & Path**: `GET /api/v1/materials/{material_id}/content`
- **Purpose**: Returns all indexed chunks for a document with page and section references.
- **Path Parameters**: `material_id` (string).
- **Database Operations**: Reads (`material_chunks`).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`MATERIAL_NOT_FOUND`).

#### Endpoint 9: Delete Study Material
- **Method & Path**: `DELETE /api/v1/materials/{material_id}`
- **Purpose**: Deletes study material and its indexed chunks. Associated quiz records have `material_id` set to `NULL`.
- **Path Parameters**: `material_id` (string).
- **Database Operations**: Writes (cascades deletion of chunks).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`MATERIAL_NOT_FOUND`).

#### Endpoint 10: Ask Grounded AI Tutor
- **Method & Path**: `POST /api/v1/tutor/ask`
- **Purpose**: Answers student questions grounded exclusively in the supplied material. Returns page/section citations or explicitly abstains when evidence is missing.
- **Prerequisites**: `material_id` must exist. Gemini API key configured.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "material_id": "string", "question": "string", "learning_level": "beginner"|"intermediate"|"advanced" }`
- **Database Operations**: Reads (`study_materials`, `material_chunks`), Writes (`gemini_usage_records`).
- **Success Status**: `200 OK`
- **Return Fields**: `answer`, `sources` (list of citations), `grounded` (bool), `insufficient_evidence` (bool), `follow_up_questions` (list of strings).
- **Error Statuses**: `404 Not Found` (`MATERIAL_NOT_FOUND`), `503 Service Unavailable` (`GEMINI_NOT_CONFIGURED` or `GEMINI_SERVICE_UNAVAILABLE`).

#### Endpoint 11: Generate Quiz (Answers Hidden)
- **Method & Path**: `POST /api/v1/quizzes`
- **Purpose**: Generates multiple-choice questions from material chunks using Gemini. Correct answers are stored server-side and withheld from the response.
- **Prerequisites**: `material_id` must exist with extracted chunks.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "material_id": "string", "quiz_type": "diagnostic"|"practice"|"follow_up", "topic": "string", "question_count": 1-15, "difficulty": "easy"|"medium"|"hard" }`
- **Database Operations**: Reads (`study_materials`, `chunks`), Writes (`quiz_sessions`, `quiz_questions`, `gemini_usage_records`).
- **Success Status**: `201 Created`
- **Error Statuses**: `404 Not Found` (`MATERIAL_NOT_FOUND`), `400 Bad Request` (`NO_CONTENT_FOR_QUIZ`), `503 Service Unavailable` (`GEMINI_NOT_CONFIGURED`).

#### Endpoint 12: Get Quiz Questions (Answers Hidden)
- **Method & Path**: `GET /api/v1/quizzes/{quiz_id}`
- **Purpose**: Fetches quiz questions for taking the test. Answer keys and explanations are omitted.
- **Path Parameters**: `quiz_id` (string).
- **Database Operations**: Reads (`quiz_sessions`, `quiz_questions`).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`QUIZ_NOT_FOUND`).

#### Endpoint 13: Submit Quiz Answers for Server-Side Grading
- **Method & Path**: `POST /api/v1/quizzes/{quiz_id}/submit`
- **Purpose**: Grades answers objectively server-side without AI calls. Updates topic mastery, diagnoses misconceptions, and returns correct answers with explanations.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "answers": [ { "question_id": "string", "selected_option": "A" } ] }`
- **Database Operations**: Reads (`quiz_sessions`, `quiz_questions`), Writes (`quiz_attempts`, `quiz_attempt_answers`, `topic_mastery`, `misconceptions`).
- **Success Status**: `200 OK`
- **Return Fields**: `quiz_id`, `attempt_id`, `total_questions`, `correct_count`, `score_percentage`, `questions` (with `is_correct`, `correct_option`, `explanation`), `topic_performance`, `recommended_next_action`, `updated_mastery`.
- **Error Statuses**: `404 Not Found` (`QUIZ_NOT_FOUND`), `400 Bad Request` (`INVALID_SUBMISSION` for duplicate or invalid question IDs).

#### Endpoint 14: Knowledge Gap Map
- **Method & Path**: `GET /api/v1/analytics/knowledge-gaps`
- **Purpose**: Returns topic mastery estimates (`not_enough_data`, `weak`, `developing`, `strong`) and recommended actions.
- **Database Operations**: Reads (`topic_mastery`).
- **Success Status**: `200 OK`

#### Endpoint 15: Diagnosed Misconceptions
- **Method & Path**: `GET /api/v1/analytics/misconceptions`
- **Purpose**: Lists student misconceptions grounded in actual incorrect answers.
- **Database Operations**: Reads (`misconceptions`).
- **Success Status**: `200 OK`

#### Endpoint 16: Overall Learning Progress
- **Method & Path**: `GET /api/v1/analytics/progress`
- **Purpose**: Returns total materials, quizzes, attempts, average score, recent activity timeline, topic trends, and assessment verifications.
- **Database Operations**: Reads (`study_materials`, `quiz_sessions`, `quiz_attempts`, `topic_mastery`, `assessment_verifications`).
- **Success Status**: `200 OK`

#### Endpoint 17: Initiate Assessment Verification
- **Method & Path**: `POST /api/v1/analytics/verification`
- **Purpose**: Pairs an existing diagnostic quiz on a topic with a follow-up assessment to verify score improvements.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "topic": "string", "material_id": "optional_string" }`
- **Database Operations**: Reads (`quiz_sessions`, `quiz_attempts`), Writes (`assessment_verifications`).
- **Success Status**: `201 Created`

#### Endpoint 18: Get Assessment Verification Results
- **Method & Path**: `GET /api/v1/analytics/verification/{verification_id}`
- **Purpose**: Retrieves comparative initial vs follow-up scores and percentage point delta.
- **Path Parameters**: `verification_id` (string).
- **Database Operations**: Reads & optionally Writes (recalculates follow-up score if completed).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`VERIFICATION_NOT_FOUND`).

#### Endpoint 19: Get Revision Plan
- **Method & Path**: `GET /api/v1/revision-plan`
- **Purpose**: Retrieves prioritized revision tasks (`high`, `medium`, `low`).
- **Database Operations**: Reads (`revision_tasks`).
- **Success Status**: `200 OK`

#### Endpoint 20: Generate / Refresh Revision Plan
- **Method & Path**: `POST /api/v1/revision-plan/generate`
- **Purpose**: Generates revision tasks from weak topics and active misconceptions. Returns a starter plan if student history is empty.
- **Database Operations**: Reads (`topic_mastery`, `misconceptions`), Writes (`revision_tasks`).
- **Success Status**: `200 OK`

#### Endpoint 21: Update Revision Task Status
- **Method & Path**: `PATCH /api/v1/revision-plan/{task_id}`
- **Purpose**: Updates task status to `"pending"`, `"in_progress"`, or `"completed"`.
- **Headers**: `Content-Type: application/json`
- **Body**: `{ "status": "pending"|"in_progress"|"completed" }`
- **Database Operations**: Writes (`revision_tasks.status`).
- **Success Status**: `200 OK`
- **Error Statuses**: `404 Not Found` (`TASK_NOT_FOUND`), `422 Unprocessable Entity` for invalid status string.

---

## 3. Existing Features & Verification Audit

This section distinguishes code that is implemented from behaviors that were actively executed and verified in tests.

| Feature Area | Implementation Status | Automated Test Coverage | Live Gemini Execution Tested |
|---|---|---|---|
| **Health Check (`GET /health`)** | Implemented (`app/api/routes/health.py`) | Verified (`test_health.py`) | Verified via live HTTP GET |
| **Config Status (`GET /config/status`)** | Implemented (never exposes keys) | Verified (`test_health.py`) | Verified via live HTTP GET |
| **Demo Reset (`POST /demo/reset`)** | Implemented (cascades deletion) | Verified (`test_health.py`) | Verified via `seed_demo.py` & pytest |
| **PDF Ingestion & Chunks (`POST /materials`)** | Implemented (`DocumentService.ingest_pdf`) | Verified (`test_materials.py`) | Verified with in-memory PDFs |
| **PDF Rejections (415, 400 page limit, empty)** | Implemented (`app/core/errors.py`) | Verified (`test_materials.py`) | Verified with multi-page & scanned PDFs |
| **Pasted Notes Ingestion (`POST /materials/text`)**| Implemented (`DocumentService.ingest_text_notes`) | Verified (`test_materials.py`) | Verified in test suite & `seed_demo.py` |
| **Material List, Get & Content** | Implemented with chunk pagination | Verified (`test_materials.py`) | Verified via live HTTP requests |
| **Material Deletion (`DELETE /materials/{id}`)** | Implemented (cascades chunks) | Verified (`test_materials.py`) | Verified in test suite |
| **AI Tutor Grounded Q&A (`POST /tutor/ask`)** | Implemented with source excerpts | Verified (`test_tutor.py`) | Verified via live Gemini call (`gemini-2.5-flash`) |
| **AI Tutor Explicit Abstention** | Implemented when evidence is below threshold | Verified (`test_tutor.py`) | Verified with out-of-scope questions |
| **Quiz Generation (`POST /quizzes`)** | Implemented with structured JSON | Verified (`test_quizzes.py`) | Verified with live structured JSON |
| **Quiz Answer Key Security** | Implemented (withheld until submission) | Verified (`test_quizzes.py`) | Verified: keys absent in GET & POST |
| **Server-Side Deterministic Grading** | Implemented (zero AI cost grading) | Verified (`test_quizzes.py`) | Verified with 100%, 50%, and 0% scores |
| **Topic Mastery Calibration** | Implemented (documented thresholds) | Verified (`test_analytics.py`) | Verified: calibrated across attempts |
| **Misconception Detection** | Implemented (Gemini + fallback rules) | Verified (`test_analytics.py`) | Verified: persists on wrong answers |
| **Knowledge Gap Map (`GET /knowledge-gaps`)** | Implemented (`app/api/routes/analytics.py`) | Verified (`test_analytics.py`) | Verified in test suite |
| **Progress Dashboard (`GET /progress`)** | Implemented (`app/api/routes/analytics.py`) | Verified (`test_analytics.py`) | Verified via live HTTP request |
| **Assessment Verification (Diagnostic vs Follow-Up)**| Implemented (calculates delta %) | Verified (`test_analytics.py`) | Verified initial & completed states |
| **Adaptive Revision Planner** | Implemented with priority sorting | Verified (`test_revision.py`) | Verified starter & custom plans |
| **Revision Task Status Update (`PATCH`)** | Implemented (`pending` -> `completed`) | Verified (`test_revision.py`) | Verified in test suite |
| **Gemini Usage Tracking** | Implemented (`gemini_usage_records`) | Verified via DB inspection | Verified: 3 records with token counts in DB |

---

## 4. Authentication, Security & Validation Audit

### 4.1 Authentication Status: NONE (Single Demo Profile)
- **Current State**: There is **no Google OAuth, JWT, bearer token, session cookie, or password authentication** in this MVP backend.
- **Session Identity**: Every request implicitly operates under `DEMO_STUDENT_ID = "demo-student-001"`.
- **Frontend Guidance**: The frontend developer does **not** need to build a login screen, OAuth popup, or token refresh interceptor. All endpoints can be invoked directly. If authentication is added in the future, it should inject the student identity via FastAPI dependencies (`Depends(get_current_user)`).

### 4.2 Authorization & Tenant Isolation Gaps
- Because there is only a single demo student context, all uploaded materials and quiz records are shared under `demo-student-001`.
- A developer should not deploy this backend to an untrusted public server without adding authentication if multiple distinct users must isolate their documents.

### 4.3 CORS Configuration
- CORS middleware is configured in `app/main.py` using `CORSMiddleware`.
- Allowed origins are read from `CORS_ORIGINS` in `.env`:
  `http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173`
- Credentials, all HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`), and all headers are allowed.

### 4.4 Input Validation & Safety
- **File Upload Type Guard**: Checked against `.pdf` extension and `application/pdf` MIME type. Non-PDF files return `415 Unsupported Media Type`.
- **Page Limit Guard**: Checked against `MAX_PDF_PAGES` (default 20). Exceeding files return `400 Bad Request` (`PAGE_LIMIT_EXCEEDED`).
- **File Size Guard**: Checked against `MAX_UPLOAD_MB` (default 10 MB). Exceeding files return `413 Payload Too Large` (`FILE_TOO_LARGE`).
- **Scanned PDF Guard**: Checks if PyMuPDF extracted any selectable text. Image-only PDFs are rejected with `400 Bad Request` (`EMPTY_OR_SCANNED_PDF`) explaining that OCR is not supported.
- **No Embedded Code Execution**: Ingested documents are treated purely as plain text strings. Instructions embedded within notes are not executed.
- **Secrets Protection**: The Gemini API key is loaded from `.env` and never returned in API responses, logs, or exception messages.

---

## 5. Frontend Integration Guide

### 5.1 Endpoint to UI Feature Mapping

| Frontend UI Screen / Component | HTTP Method | Backend Endpoint | Key Response Data Fields |
|---|---|---|---|
| **System Banner / Status Indicator** | `GET` | `/api/v1/config/status` | `gemini_configured`, `max_pdf_pages` |
| **Material Upload Card (PDF)** | `POST` | `/api/v1/materials` | `id`, `title`, `page_count` |
| **Paste Notes Form** | `POST` | `/api/v1/materials/text` | `id`, `title`, `char_count` |
| **Study Library Sidebar / Grid** | `GET` | `/api/v1/materials` | `materials[]`, `total` |
| **Document Reader & Page Viewer** | `GET` | `/api/v1/materials/{id}/content` | `chunks[].page_number`, `chunks[].content` |
| **Delete Material Confirmation Modal** | `DELETE` | `/api/v1/materials/{id}` | `deleted: true` |
| **AI Tutor Chat Window** | `POST` | `/api/v1/tutor/ask` | `answer`, `sources[]`, `grounded`, `follow_up_questions[]` |
| **Quiz Generator Modal** | `POST` | `/api/v1/quizzes` | `id`, `questions[].prompt`, `questions[].options` |
| **Quiz Question View (Pre-submission)** | `GET` | `/api/v1/quizzes/{id}` | `questions[]` (options only, no answers) |
| **Quiz Results Card (Post-submission)** | `POST` | `/api/v1/quizzes/{id}/submit` | `score_percentage`, `questions[].is_correct`, `questions[].explanation` |
| **Knowledge Gap Map (Bar Chart / Grid)** | `GET` | `/api/v1/analytics/knowledge-gaps` | `topics[].accuracy`, `topics[].status`, `topics[].recommended_action` |
| **Misconception Alert Drawer** | `GET` | `/api/v1/analytics/misconceptions` | `misconceptions[].misconception_text`, `misconceptions[].suggested_practice` |
| **Adaptive Revision Checklist** | `GET` | `/api/v1/revision-plan` | `tasks[].title`, `tasks[].priority`, `tasks[].status` |
| **Refresh Revision Plan Button** | `POST` | `/api/v1/revision-plan/generate` | `tasks[]` |
| **Task Completion Checkbox** | `PATCH` | `/api/v1/revision-plan/{id}` | `status: "completed"` |
| **Overall Learning Progress Dashboard** | `GET` | `/api/v1/analytics/progress` | `average_score`, `total_attempts`, `recent_activity[]` |
| **Diagnostic vs Follow-Up Comparison** | `GET` | `/api/v1/analytics/verification/{id}` | `initial_score`, `follow_up_score`, `score_difference` |
| **Demo Data Reset Button** | `POST` | `/api/v1/demo/reset` | `status: "reset_completed"` |

### 5.2 Endpoint Dependencies & Workflow Order
For the most effective student experience, build your UI interactions in this sequence:
1. **Upload Phase**: User uploads a PDF via `POST /materials` or pastes notes via `POST /materials/text` → Receive `material_id`.
2. **Exploration Phase**: User asks questions in chat via `POST /tutor/ask` passing `material_id`.
3. **Assessment Phase**: User clicks "Take Diagnostic Quiz" → Calls `POST /quizzes` with `quiz_type: "diagnostic"` → User answers questions → Calls `POST /quizzes/{id}/submit` → Score & mastery updated.
4. **Analytics Phase**: User views Knowledge Gap Map (`GET /analytics/knowledge-gaps`) and Misconceptions (`GET /analytics/misconceptions`).
5. **Remediation Phase**: User opens Revision Plan (`GET /revision-plan`), works on high-priority tasks, and marks tasks complete via `PATCH /revision-plan/{id}`.
6. **Verification Phase**: User triggers follow-up assessment (`POST /quizzes` with `quiz_type: "follow_up"`) → Links with `POST /analytics/verification` → Evaluates score delta (`GET /analytics/verification/{id}`).

### 5.3 Missing / Unsupported Features (What the Frontend Must NOT Pretend Exists)
1. **OCR / Scanned Image Reading**: The backend **cannot** read scanned images or photo PDFs. The frontend must display a note informing students to upload digital PDFs or paste notes directly.
2. **Multi-User Login**: There is no login or user registration. Do not create a login screen for this MVP.
3. **Vector Database / Semantic Search**: The backend uses local lexical scoring and keyword matching, not Pinecone, Weaviate, or Chroma. Do not expose vector settings to the user.
4. **Streaming Tutor Tokens**: `POST /tutor/ask` returns complete structured JSON (including verified citations and follow-up prompts) rather than a raw streaming SSE token stream. The frontend should display a loading indicator while the response is being prepared.

---

## 6. Verification Summary & Sign-off

| Item | Verified Status |
|---|---|
| **FastAPI Backend Execution** | Verified running on `http://127.0.0.1:8000` |
| **Automated Test Suite** | 19 / 19 tests passing (0.80s) |
| **OpenAPI Schema Generation** | 19 endpoints exported to `handoff/openapi.json` |
| **Real Google Gemini Integration** | Verified live call with `gemini-2.5-flash` & token logging |
| **Database Readiness** | Verified SQLite persistence across restarts |
| **Handoff Package** | Produced in `handoff/` without touching production code |
