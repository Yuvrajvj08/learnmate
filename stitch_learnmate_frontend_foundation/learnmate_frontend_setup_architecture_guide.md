# LearnMate Frontend Foundation

Frontend application foundation for LearnMate, an AI-powered personalized learning companion built with React, Vite, TypeScript, and Tailwind CSS, interfacing with the existing FastAPI backend.

## Project Structure

```text
├── backend/                  # Existing FastAPI backend (kept completely intact)
│   ├── app/
│   │   ├── main.py           # FastAPI app & endpoints (including /health)
│   │   └── ...
│   └── requirements.txt
├── frontend/                 # LearnMate React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts     # Centralized Axios/fetch client (VITE_API_BASE_URL)
│   │   │   └── health.ts     # Health-check utility targeting /health
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx  # Independent light/dark & 6 accent themes
│   │   │   └── AuthContext.tsx   # Google OAuth architecture readiness
│   │   ├── components/
│   │   │   ├── layout/       # AppShell, Sidebar, Header, MobileNav
│   │   │   ├── common/       # GlassCard, AccentPicker, HealthBadge
│   │   │   └── ...
│   │   ├── routes/           # Route placeholders (Dashboard, Study, AI Tutor, etc.)
│   │   ├── styles/           # CSS custom properties & design tokens
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## Setup & Running the Frontend

### 1. Environment Configuration
Create `.env` in `frontend/`:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 2. Install & Start
```bash
cd frontend
npm install
npm run dev
```

### 3. Build & Typecheck
```bash
npm run build
npm run preview
```

## Features Implemented in Foundation
- **Design Tokens**: Complete light and dark themes with 6 independent accent choices (Violet, Blue, Teal, Green, Pink, Yellow) persisted via `localStorage`.
- **Selective Glassmorphism**: High readability, subtle backdrop blur, hairline borders, and restrained 3D elevation.
- **Centralized API Client**: Preconfigured baseUrl, request/response interceptors, and strict typing.
- **Backend Health Check**: Real probe against `/health` displaying live backend status without mocked fallbacks.
- **Google Auth Architecture**: Prepared auth flow interfaces and token storage hooks ready for production client IDs.
