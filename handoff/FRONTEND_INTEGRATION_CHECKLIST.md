# LearnMate Frontend Integration Checklist

This checklist guides frontend developers connecting a Google Stitch UI, React, Vue, Next.js, or mobile client to the LearnMate backend.

---

## Phase 1: Environment & Base Connectivity

- [ ] **Configure Base URL**:
  - Set the API client base URL to: `http://localhost:8000/api/v1` (or your local IP / reverse proxy).
  - Verify that all endpoint paths start with `/api/v1/`.
- [ ] **Verify CORS Configuration**:
  - Ensure the frontend origin (e.g. `http://localhost:3000` or `http://localhost:5173`) is listed in `CORS_ORIGINS` in `.env`.
  - Check browser console on first request: ensure no CORS preflight (`OPTIONS`) block errors.
- [ ] **Health & Readiness Check**:
  - Call `GET /api/v1/health`.
  - Confirm `data.status == "ok"` and `data.database == "connected"`.
- [ ] **Configuration Status**:
  - Call `GET /api/v1/config/status`.
  - Verify `data.gemini_configured == true`. If `false`, display a banner: *"AI features disabled: Gemini API Key not configured."*
- [ ] **Standard Response Envelope Unwrapping**:
  - Configure Axios / Fetch interceptor to extract `response.data.data` as the payload.
  - Store or log `response.data.meta.request_id` for error reporting and debugging.
- [ ] **Global Error Interceptor**:
  - Handle standard error envelope `{ error: { code, message, details }, meta }`.
  - Display user-friendly error toast with `error.message`.

---

## Phase 2: Study Materials Management

- [ ] **Pasted Study Notes Form**:
  - Input field for `title` (required, max 256 chars).
  - Textarea for `content` (required, min 10 chars).
  - Call `POST /api/v1/materials/text`.
  - On success (`HTTP 201`), add new material to student library.
- [ ] **PDF File Uploader**:
  - Enforce client-side file picker accept filter: `.pdf`, `application/pdf`.
  - Client-side size guard: warn if file > 10 MB before upload.
  - Submit as `multipart/form-data` with `file` and optional `title` to `POST /api/v1/materials`.
  - Handle `HTTP 415` (`UNSUPPORTED_MEDIA_TYPE`): *"Please upload a valid PDF document."*
  - Handle `HTTP 400` (`PAGE_LIMIT_EXCEEDED`): *"PDF exceeds the 20-page limit."*
  - Handle `HTTP 400` (`EMPTY_OR_SCANNED_PDF`): *"Scanned or image-only PDF detected. Please upload a PDF with selectable text or paste notes directly."*
- [ ] **Material Library Listing**:
  - Call `GET /api/v1/materials?limit=20&offset=0`.
  - Display cards with `title`, `material_type` badge (`pdf` / `text`), `page_count`, and `created_at`.
  - Handle empty state: *"No study materials uploaded yet. Upload a PDF or paste notes to begin."*
- [ ] **Material Detail & Content Viewer**:
  - Call `GET /api/v1/materials/{id}` to fetch metadata and `chunk_count`.
  - Call `GET /api/v1/materials/{id}/content` to fetch indexed chunks.
  - Render chunks with page reference tags (`Page 1`, `Section 1`).
- [ ] **Delete Study Material**:
  - Call `DELETE /api/v1/materials/{id}`.
  - Provide confirmation modal: *"Deleting this material will remove its indexed chunks. Existing quiz records will be preserved."*
  - Remove card from UI upon success (`HTTP 200`).

---

## Phase 3: Grounded AI Tutor Chat

- [ ] **Chat Input & Context Selector**:
  - Material dropdown to select `material_id`.
  - Learning level selector: `beginner`, `intermediate`, `advanced` (default: `intermediate`).
  - Text input for `question`.
- [ ] **Submit Question to Tutor**:
  - Call `POST /api/v1/tutor/ask`.
  - Display loading spinner / streaming placeholder while awaiting response.
- [ ] **Render Grounded Answer**:
  - If `data.grounded == true`:
    - Render `data.answer` in markdown.
    - Render citations from `data.sources`: display collapsible pill or badge showing `section_reference` / `page_number` and the exact quote excerpt.
- [ ] **Render Explicit Abstention**:
  - If `data.insufficient_evidence == true` (and `grounded == false`):
    - Render the abstention explanation in a distinct info/amber box.
    - Render `data.follow_up_questions` as clickable prompt chips that populate the chat input.
- [ ] **Suggested Follow-Up Prompts**:
  - Render buttons for each string in `data.follow_up_questions`.
  - Clicking a chip submits or populates the next question.

---

## Phase 4: Quizzes & Practice

- [ ] **Quiz Generation Modal**:
  - Inputs: `material_id`, `quiz_type` (`diagnostic`, `practice`, `follow_up`), `question_count` (1-15, default 5), `difficulty` (`easy`, `medium`, `hard`).
  - Call `POST /api/v1/quizzes`.
- [ ] **Quiz Taking Interface (Answers Withheld)**:
  - Verify that `correct_option` and `explanation` are absent from question objects.
  - Render question prompt, question number, topic tag, and radio options (`A`, `B`, `C`, `D`).
  - Store selected option per question in component state.
  - Disable submit button until all questions have an option selected.
- [ ] **Submit Quiz Answers**:
  - Format payload: `{ "answers": [ { "question_id": "...", "selected_option": "A" } ] }`.
  - Call `POST /api/v1/quizzes/{quiz_id}/submit`.
- [ ] **Display Grading Feedback**:
  - Render score banner: `score_percentage` (e.g. `80%`), `correct_count` / `total_questions`.
  - Render `recommended_next_action` alert.
  - For each question in `data.questions`:
    - Green highlight for `is_correct == true`, Red highlight for `is_correct == false`.
    - Display student's `selected_option` vs `correct_option`.
    - Display detailed pedagogical `explanation`.
  - Render topic breakdown cards from `data.topic_performance`.
  - Display updated mastery indicators from `data.updated_mastery`.

---

## Phase 5: Knowledge Gap Map & Misconceptions

- [ ] **Knowledge Gap Map Tab**:
  - Call `GET /api/v1/analytics/knowledge-gaps`.
  - Display topic cards or progress bars showing `accuracy` (0-100%).
  - Display status badge based on `data.topics[].status`:
    - `weak` (<60% accuracy, >=3 attempts) → Red badge
    - `developing` (60-79% accuracy, >=3 attempts) → Amber badge
    - `strong` (>=80% accuracy, >=3 attempts) → Green badge
    - `not_enough_data` (<3 attempts) → Gray badge
  - Display `recommended_action` text on each topic card.
- [ ] **Misconceptions View**:
  - Call `GET /api/v1/analytics/misconceptions`.
  - Render detected misconceptions with:
    - Topic name
    - Misconception diagnosis (`misconception_text`)
    - Question & student's wrong answer evidence
    - Actionable corrective advice (`suggested_practice`)
    - Confidence indicator (`medium` / `high`)

---

## Phase 6: Adaptive Revision Planner

- [ ] **Revision Plan Tab**:
  - Call `GET /api/v1/revision-plan`.
  - Display summary counter: `pending_tasks`, `completed_tasks`, `total_tasks`.
- [ ] **Render Tasks**:
  - Display priority badge (`high` [Red], `medium` [Yellow], `low` [Blue]).
  - Display `title`, `topic`, `reason`, `suggested_activity`, `due_date`.
- [ ] **Generate / Refresh Plan Button**:
  - Button to call `POST /api/v1/revision-plan/generate`.
  - Re-renders updated task list based on recent quiz errors and weak topics.
- [ ] **Task Status Toggle**:
  - Checkbox or status select triggering `PATCH /api/v1/revision-plan/{id}` with `{"status": "completed"}` or `{"status": "in_progress"}`.
  - Strike through or move completed items to a completed accordion.

---

## Phase 7: Progress & Assessment Verification

- [ ] **Learning Dashboard Overview**:
  - Call `GET /api/v1/analytics/progress`.
  - Stat counters: `total_materials`, `total_quizzes`, `total_attempts`, `average_score`, `questions_answered`.
  - Recent activity timeline rendering `type`, `title`, and relative timestamp.
- [ ] **Diagnostic vs Follow-Up Verification Card**:
  - Call `POST /api/v1/analytics/verification` with `{ "topic": "<TOPIC_NAME>" }`.
  - Call `GET /api/v1/analytics/verification/{id}`.
  - If `status == "awaiting_follow_up"`:
    - Show call to action: *"Take a follow-up assessment on <topic> to verify learning progress."*
  - If `status == "completed"`:
    - Display initial score vs follow-up score.
    - Display score difference badge: `+X% score gain` (Green).

---

## Phase 8: Testing & Handoff Sign-off

- [ ] **Run seed script for sample testing**: `python seed_demo.py` on backend.
- [ ] **Verify end-to-end user flow in frontend**:
  1. Upload notes.
  2. Ask AI tutor 2 questions.
  3. Generate quiz and submit answers.
  4. Inspect knowledge gap map.
  5. Check revision task list.
  6. Inspect progress dashboard.
- [ ] **Verify all error states handle gracefully without app crashes.**
