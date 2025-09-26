# Task Manager

A modern, self-hosted task management application with reminder functionality, built with React for the frontend and Node.js/Express for the backend. Features include task creation/editing, reminders via NTFY or email, customizable app title/logo, and a clean dark theme interface.

![Screenshot](screenshots/app-preview.png) <!-- Add a screenshot here for better appeal -->

## Features

- **Task Management**: Create, edit, delete, and organize tasks with due dates and priorities.
- **Reminders**: Set reminders using NTFY push notifications or email (via SMTP).
- **Customization**: Change app title, upload a custom logo, and configure notification servers.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.
- **Dark Theme**: Modern, eye-friendly interface with customizable colors.
- **Self-Hosted**: Easy deployment via Docker or local development.
- **API Protection**: Backend secured with Basic Auth for administrative access.

## Quick Start (Docker)

### Prerequisites
- Docker
- Docker Compose
- Node.js (for local development, optional)

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd taskapp2
   ```

2. Copy and configure environment files:
   ```bash
   cp backend/.env.example .env
   # Edit .env to set:
   # - ADMIN_PASS (for Basic Auth)
   # - REMINDER_EMAIL_TO (email for reminders)
   # - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (for email notifications)
   # - NTFY_SERVER, NTFY_TOPIC (for push notifications)
   ```

3. Build and run:
   ```bash
   docker compose up -d --build
   ```

4. Access the application:
   - Frontend: [http://localhost:8080](http://localhost:8080)
   - Backend API: [http://localhost:3000/api](http://localhost:3000/api) (use Basic Auth with username `admin` and password from `ADMIN_PASS`)

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### Backend
```bash
cd backend
npm install
node src/index.js  # Runs on http://localhost:3000
```

Ensure the frontend Vite config proxies API requests to the backend at `http://localhost:3000`.

## Configuration

- **Notifications**:
  - **NTFY**: Set `NTFY_SERVER` (e.g., `https://ntfy.sh`) and `NTFY_TOPIC` in `.env`. Configure defaults in the app settings.
  - **Email**: Use SMTP settings in `.env` for email reminders. Set `REMINDER_EMAIL_TO` for recipient.

- **App Customization**: In the settings page, update the app title, upload a logo, and save NTFY defaults.

- **Database**: Uses SQLite (`backend/data/tasks.db`). Migrations are in `backend/migrations.sql`.

## Usage

1. Log in using Basic Auth if accessing the API directly.
2. Create tasks with titles, descriptions, due dates, and reminders.
3. Set reminders: Choose NTFY or email in task details.
4. Customize the app via the Settings page (accessible at `/settings`).
5. Edit tasks inline; supports mobile touch interactions.

## Tech Stack

- **Frontend**: React, Vite, Tailwind-inspired CSS (custom `styles.css`)
- **Backend**: Node.js, Express, SQLite, Multer (file uploads)
- **Deployment**: Docker, Docker Compose
- **Notifications**: NTFY, Nodemailer (SMTP)
- **Other**: Basic Auth, Cron jobs for reminders

## Building and Testing

- Frontend: `npm run build` (outputs to `dist/`)
- Backend: No formal tests; ensure SQLite migrations run on start.
- Full build: Use Docker for production.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit changes: `git commit -m 'Add amazing feature'`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Please ensure code follows existing patterns and passes any manual tests (task CRUD, reminders).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Report issues on GitHub.
- For production, monitor logs in Docker containers.

---



