# LearnMate — AI-Powered Personalised Learning Companion (Backend MVP)

LearnMate is a production-grade, modular Python FastAPI backend engineered to transform student study materials (PDFs and notes) into an adaptive, conversational, and measurable learning experience.

---

## 🌟 Key Features

1. **Document Ingestion & Page-Level Chunking**:
   - Ingest PDFs up to 20 pages (via PyMuPDF) preserving original page numbers.
   - Ingest pasted study notes with section references.
   - Enforce page limits and file size validation (max 10 MB).
   - Detect empty/scanned PDFs with graceful OCR limitation guidance.

2. **Grounded AI Tutor**:
   - Responds to student queries at configurable learning levels (`beginner`, `intermediate`, `advanced`).
   - Retrieves only relevant document chunks using local lexical retrieval.
   - **Explicit Abstention**: When supplied notes do not support the query, the tutor explicitly abstains with zero hallucinations.
   - Returns verified page/section source citations.

3. **Intelligent Practice & Diagnostic Quizzes**:
   - Generates multiple-choice quizzes (`diagnostic`, `practice`, `follow_up`) using Gemini structured JSON.
   - **Answer Key Security**: Correct answers and grading keys are strictly stored server-side and withheld from the student until submission.
   - **Deterministic Server-Side Grading**: Grades answers objectively without consuming unnecessary AI quota.

4. **Knowledge Gap Mapping & Misconceptions**:
   - Tracks per-topic student accuracy and attempt history in SQLite.
   - Transparent calibration thresholds (`not_enough_data`, `weak`, `developing`, `strong`).
   - Automatically detects conceptual misconceptions from incorrect choices with supporting evidence and corrective practice recommendations.

5. **Adaptive Revision Planner**:
   - Generates prioritized revision tasks (`high`, `medium`, `low`) directly linked to weak topics and diagnosed misconceptions.
   - Provides a clear starter plan when student history is empty.
   - Task completion status tracking (`pending`, `in_progress`, `completed`).

6. **Learning Progress & Verification**:
   - Tracks metrics, quiz attempt history, and recent activity.
   - Diagnostic vs Follow-up assessment verification calculating measurable score gains.

7. **Token Tracking & Resilience**:
   - Tracks Gemini request categories, models, exact token counts (when reported by the SDK), and status in SQLite.
   - Graceful fallback: If the Gemini API key is missing, the server still boots and serves health checks and non-AI endpoints.

---

## 🏗️ Project Architecture

```
learnmate-backend/
├── app/
│   ├── main.py                  # FastAPI application factory, CORS, request tracing & global error handling
│   ├── core/
│   │   ├── config.py            # Pydantic-settings configuration (.env loading)
│   │   └── errors.py            # Custom exceptions and error codes
│   ├── db/
│   │   ├── database.py          # SQLAlchemy SQLite connection and session management
│   │   └── models.py            # SQLite database entities and relationships
│   ├── schemas/
│   │   ├── common.py            # Standard ApiResponse and ApiErrorResponse envelopes
│   │   ├── system.py            # Health and config schemas
│   │   ├── materials.py         # Study material ingestion and content schemas
│   │   ├── tutor.py             # Grounded AI tutor schemas and source citations
│   │   ├── quizzes.py           # Quiz generation, public view, and grading schemas
│   │   ├── analytics.py         # Knowledge gaps, misconceptions, and verification schemas
│   │   └── revision.py          # Adaptive revision planner schemas
│   ├── services/
│   │   ├── gemini_service.py    # Official Google GenAI SDK wrapper with token tracking
│   │   ├── document_service.py  # PyMuPDF PDF extraction and text note chunking
│   │   ├── retrieval_service.py # Lexical keyword search and evidence scoring
│   │   ├── quiz_service.py      # Quiz generation, grading, and score calculations
│   │   ├── learning_service.py  # Topic mastery calibration and misconception diagnosis
│   │   └── revision_service.py  # Adaptive revision task generator
│   └── api/
│       ├── router.py            # /api/v1 routing aggregation
│       ├── response_utils.py    # Standard response envelope wrapper
│       └── routes/
│           ├── health.py        # /health, /config/status, /demo/reset
│           ├── materials.py     # Study material upload, listing, and deletion
│           ├── tutor.py         # Grounded AI tutor endpoint
│           ├── quizzes.py       # Quiz generation, question fetching, and submission
│           ├── analytics.py     # Knowledge gaps, misconceptions, progress, verification
│           └── revision.py      # Revision plan retrieval, generation, and updates
├── docs/
│   └── API_CONTRACT.md          # Complete REST API reference for Stitch frontend integration
├── tests/
│   ├── conftest.py              # Test fixtures, mock Gemini, isolated SQLite database
│   ├── test_health.py           # Health and readiness tests
│   ├── test_materials.py        # PDF/text validation, page limits, and chunking tests
│   ├── test_tutor.py            # Grounding and abstention tests
│   ├── test_quizzes.py          # Quiz lifecycle and answer security tests
│   ├── test_analytics.py        # Mastery, misconceptions, and progress tests
│   ├── test_revision.py         # Revision task workflow tests
│   └── test_e2e_learning_flow.py# Full end-to-end learning lifecycle test
├── seed_demo.py                 # Deterministic sample data seed script
├── requirements.txt             # Dependencies
├── .env.example                 # Configuration placeholders
├── .gitignore                   # Exclusions for secrets, caches, and DB files
└── README.md                    # System documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.11+** installed (`python --version`)
- **pip** package installer

---

### 2. Environment Setup

#### On Windows (PowerShell):
```powershell
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

#### On macOS / Linux:
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Environment Variables Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings:
```ini
# Gemini API Key (Obtain from Google AI Studio: https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Database URL
DATABASE_URL=sqlite:///./learnmate.db

# Allowed CORS Origins (comma-separated for Stitch or local frontend)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173

# Ingestion Constraints
MAX_PDF_PAGES=20
MAX_UPLOAD_MB=10

# Development Settings
ALLOW_DEMO_RESET=true
ENVIRONMENT=development
```

> **Security Note**: Never commit `.env` or real API keys to version control. The `.gitignore` file automatically excludes `.env` and SQLite database files.

---

### 4. Running the Backend Server

Start the Uvicorn development server:
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Base URL**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **OpenAPI Schema (JSON)**: `http://127.0.0.1:8000/openapi.json`
- **Health Check**: `http://127.0.0.1:8000/api/v1/health`

---

### 5. Running Automated Tests

Run the full automated test suite (all tests mock Gemini to run offline without consuming API quota):
```powershell
python -m pytest tests -v
```

All 19 test cases validate:
- System health and configuration readiness without secret leakage.
- Valid PDF ingestion, non-PDF rejection (415), page limits (>20 pages), and empty/scanned PDF handling.
- AI Tutor grounded answers and explicit abstention on insufficient evidence.
- Quiz creation, answer key concealment, and server-side deterministic grading.
- Real-time topic mastery updates and misconception diagnosis.
- Adaptive revision task generation and status updates.
- Initial vs follow-up assessment verifications.
- Complete deterministic end-to-end learning lifecycle.

---

### 6. Populating Demo Seed Data

To populate sample study materials, diagnostic quizzes, simulated answers, and revision tasks:
```powershell
python seed_demo.py
```

---

## 📡 Example cURL Commands

### 1. Health Check
```bash
curl -X GET http://127.0.0.1:8000/api/v1/health
```

### 2. Configuration Status
```bash
curl -X GET http://127.0.0.1:8000/api/v1/config/status
```

### 3. Ingest Pasted Study Notes
```bash
curl -X POST http://127.0.0.1:8000/api/v1/materials/text \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cell Biology Notes",
    "content": "Mitochondria produce cellular ATP through oxidative phosphorylation in eukaryotic cells. Glycolysis breaks down glucose in the cytosol."
  }'
```

### 4. Upload a Study Material PDF
```bash
curl -X POST http://127.0.0.1:8000/api/v1/materials \
  -F "file=@sample_notes.pdf" \
  -F "title=Biology Chapter 1"
```

### 5. Ask Grounded AI Tutor
```bash
curl -X POST http://127.0.0.1:8000/api/v1/tutor/ask \
  -H "Content-Type: application/json" \
  -d '{
    "material_id": "<MATERIAL_ID>",
    "question": "What is the primary function of mitochondria?",
    "learning_level": "beginner"
  }'
```

### 6. Generate a Quiz (Answers Hidden)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quizzes \
  -H "Content-Type: application/json" \
  -d '{
    "material_id": "<MATERIAL_ID>",
    "quiz_type": "diagnostic",
    "question_count": 3,
    "difficulty": "medium"
  }'
```

### 7. Submit Quiz Answers for Server-Side Grading
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quizzes/<QUIZ_ID>/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      { "question_id": "<QUESTION_ID_1>", "selected_option": "A" },
      { "question_id": "<QUESTION_ID_2>", "selected_option": "B" }
    ]
  }'
```

### 8. View Knowledge Gaps Map
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/knowledge-gaps
```

### 9. View Diagnosed Misconceptions
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/misconceptions
```

### 10. Generate Adaptive Revision Plan
```bash
curl -X POST http://127.0.0.1:8000/api/v1/revision-plan/generate
```

### 11. Update Revision Task Status
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/revision-plan/<TASK_ID> \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### 12. View Overall Learning Progress
```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/progress
```

---

## ⚠️ Known Limitations

1. **OCR on Scanned PDFs**: Optical Character Recognition (OCR) for image-only or scanned PDFs is not included in this MVP. If a user uploads a scanned PDF with no extractable text, the backend gracefully rejects it with code `EMPTY_OR_SCANNED_PDF` and guides them to upload a digital PDF with selectable text or paste notes directly.
2. **Single Demo Student**: Built for hackathon MVP demonstration using default profile `demo-student-001`. Multi-tenant auth can be plugged in using standard FastAPI dependencies.

---

## 🔧 Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| **Port 8000 in use (`winerror 10048`)** | Another process is bound to port 8000 | Terminate the stale process using `netstat -ano \| findstr :8000` and `taskkill /PID <PID> /F`, or start Uvicorn on a different port: `--port 8080`. |
| **`GEMINI_NOT_CONFIGURED`** | Missing `GEMINI_API_KEY` in `.env` | Add your Gemini key to `.env` or set the environment variable. |
| **`PAGE_LIMIT_EXCEEDED`** | PDF has > 20 pages | Increase `MAX_PDF_PAGES` in `.env` or split the PDF. |
| **CORS Blocked in Browser** | Frontend origin not whitelisted | Add your frontend origin (e.g., `http://localhost:3000`) to `CORS_ORIGINS` in `.env`. |

---

## 🎨 Next Steps: Connecting the Google Stitch Frontend

1. Ensure the backend is running (`http://127.0.0.1:8000`).
2. In Google Stitch, configure the REST API base URL to `http://localhost:8000/api/v1`.
3. Reference `docs/API_CONTRACT.md` for exact request/response schemas.
4. Bind Stitch UI components:
   - File Uploader → `POST /api/v1/materials`
   - Chat Tutor Window → `POST /api/v1/tutor/ask`
   - Quiz Card & Options → `POST /api/v1/quizzes` and `POST /api/v1/quizzes/{id}/submit`
   - Knowledge Gap Bar Chart / Map → `GET /api/v1/analytics/knowledge-gaps`
   - Revision Checklist → `GET /api/v1/revision-plan` & `PATCH /api/v1/revision-plan/{id}`
