# Task Manager (self-hosted)

Prereqs: Docker, docker-compose, node (for local dev)

Quick start with docker:
1. Copy env files:
   - cp backend/.env.example .env
   - edit .env (set ADMIN_PASS, REMINDER_EMAIL_TO, SMTP_*, NTFY_* as needed)
2. Build and run:
   - docker compose up -d --build
3. Frontend: http://localhost:8080
   Backend API: http://localhost:3000/api (protected by Basic Auth)

Create a repo tarball locally:
- From repo root:
  - git init
  - git add .
  - git commit -m "taskmgr"
  - git archive -o taskmgr.tar.gz HEAD

Local dev (frontend):
- cd frontend
- npm ci
- npm run dev
Local dev (backend):
- cd backend
- npm ci
- node src/index.js
