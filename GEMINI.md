# Project Context: Cordverse

## Project Overview
**Cordverse** is a self-hosted, privacy-focused Discord client designed to act as a secure proxy between the browser and Discord's API. It allows users to manage multiple accounts, encrypts tokens at rest, and provides a "self-bot" interface for chatting.

The architecture consists of a unified Node.js backend that serves the React frontend and handles all Discord Gateway/API communication.

### Main Technologies
*   **Backend:** Node.js, Express (v5), Socket.IO, `better-sqlite3`, `discord.js-selfbot-v13`, `crypto-js`.
*   **Frontend:** React, Vite, TailwindCSS, Axios, Lucide React.
*   **Database:** SQLite (local file `backend/data/cordverse.db`).
*   **Deployment:** PM2, GitHub Actions.

## Building and Running

### Development Mode
Run backend and frontend independently for hot-reloading.

**Backend (Port 3001):**
```bash
cd backend
npm install
npm run dev
```

**Frontend (Port 5173):**
```bash
cd frontend
npm install
npm run dev
```

### Production Mode
The production script builds the frontend and serves it via the backend Express server on a single port.

**Start Script:**
```bash
# Usage: sudo ./start-server.sh [PORT] (Default: 80)
sudo ./start-server.sh 80
```

**Using PM2 (Managed):**
```bash
pm2 start ecosystem.config.js --env production
```

## Key Configuration & Conventions

### 1. Unified Deployment (Relative Paths)
*   **Frontend:** API calls in `frontend/src/App.tsx` and components use relative paths (e.g., `/api/discord/...`) instead of hardcoded `localhost` URLs. This ensures compatibility when deployed to a domain or IP.
*   **Backend:** `backend/src/index.js` is configured to serve static files from `frontend/dist`.
*   **SPA Routing:** The backend uses an Express v5 regex route `app.get(/(.*)/, ...)` to serve `index.html` for all non-API requests, supporting client-side routing.

### 2. Security
*   **Token Storage:** Discord tokens are **never** stored in plain text. They are encrypted using `AES-256` (via `crypto-js`) before being saved to the SQLite database.
*   **Encryption Key:** Controlled by `ENCRYPTION_KEY` in `backend/.env`.

### 3. CI/CD Pipeline
*   **Workflow:** `.github/workflows/deploy.yml`
*   **Trigger:** Push to `main`.
*   **Process:**
    1.  SSH into VPS.
    2.  `git pull` latest code.
    3.  Install dependencies (fresh `npm install` to ensure native binary compatibility, e.g., for `better-sqlite3`).
    4.  Build frontend (`npm run build`).
    5.  Restart application via PM2.

### 4. Git Rules
*   **Ignored Files:** `node_modules`, `.env`, `dist/`, `build/` are ignored.
*   **Native Modules:** Because `better-sqlite3` is a native module, `node_modules` must **not** be committed. They are installed fresh on the deployment target to match the server's Node.js version/architecture.

## Directory Structure
```
/
├── backend/                 # Node.js Express Server
│   ├── data/                # SQLite database location
│   ├── src/
│   │   ├── services/        # Discord logic & Socket.IO events
│   │   ├── routes/          # API endpoints
│   │   ├── utils/           # Crypto/Helper functions
│   │   └── index.js         # Entry point
│   └── .env                 # Secrets (PORT, ENCRYPTION_KEY)
├── frontend/                # React Vite App
│   ├── src/
│   │   ├── components/      # UI Components (Chat, Sidebar, Login)
│   │   └── App.tsx          # Main Logic & Socket connection
│   └── vite.config.ts       # Build config
├── ecosystem.config.js      # PM2 Production Config
├── start-server.sh          # Unified build & start script
└── .github/workflows/       # Deployment automation
```
