# Project Context: Cordverse

## Project Overview
**Cordverse** is a self-hosted, privacy-focused Discord client designed to act as a secure proxy between the browser and Discord's API. It allows users to manage multiple accounts, encrypts tokens at rest, and provides a "self-bot" interface for chatting.

The architecture consists of a unified Node.js backend that serves the React frontend and handles all Discord Gateway/API communication, including a custom implementation of Discord's Remote Auth (QR Code Login).

### Main Technologies
*   **Backend:** Node.js, Express (v5), Socket.IO, `better-sqlite3`, `discord.js-selfbot-v13`, `crypto-js`, `jsonwebtoken`.
*   **Frontend:** React 19, Vite, TailwindCSS 4, Axios, Lucide React, `qrcode.react`.
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

### 2. Security & Authentication
*   **Level 1 (Server Access):** Users must authenticate with the `CORDVERSE_PASSWORD` (env var) to access the client UI. A JWT is issued upon success.
*   **Level 2 (Discord Access):** Users login to Discord via Token or QR Code.
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

## Database Schema
**File:** `backend/data/cordverse.db` (SQLite)

*   **`accounts`**: Stores saved Discord accounts.
    *   `id` (TEXT, PK): Discord User ID.
    *   `token` (TEXT): Encrypted Discord Token.
    *   `username` (TEXT): Discord Username.
    *   `discriminator` (TEXT): Discord Discriminator (legacy).
    *   `avatar` (TEXT): Avatar hash.
    *   `created_at` (DATETIME).
*   **`settings`**: Key-value store for app configs.
    *   `key` (TEXT, PK).
    *   `value` (TEXT).

## Services & Features

### Backend
*   **`QrLoginService`**: Implements Discord's Remote Auth via WebSocket (`wss://remote-auth-gateway.discord.gg`). Handles RSA key generation, nonce decryption, and token exchange. Communicates with frontend via Socket.IO events (`start_qr`, `qr_code`, `qr_scanned`, `qr_success`).
*   **`DiscordService`**: Wraps `discord.js-selfbot-v13` to provide client functionality (login, fetch guilds/channels/messages).
*   **`Auth`**: JWT-based protection for all API routes.

### Frontend
*   **`Login.tsx`**: Unified login interface supporting:
    *   **QR Code (v2):** Live generation and status updates via Socket.IO.
    *   **Token Input:** Manual token entry.
    *   **Saved Accounts:** Quick login from local DB.
*   **`MasterLock.tsx`**: (Presumed) Screen for entering the `CORDVERSE_PASSWORD`.
*   **`ChatArea.tsx` / `ChannelList.tsx`**: Main chat interface.

## Directory Structure
```
/
├── backend/                 # Node.js Express Server
│   ├── data/                # SQLite database location (cordverse.db)
│   ├── src/
│   │   ├── services/        # Logic: DiscordService, QrLoginService
│   │   ├── routes/          # API: discord.js (login, guilds, messages)
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # (Empty/Future use)
│   │   ├── utils/           # Crypto/Helper functions
│   │   ├── db.js            # Database init & schema
│   │   └── index.js         # Entry point & Socket.IO setup
│   └── .env                 # Secrets (PORT, ENCRYPTION_KEY, CORDVERSE_PASSWORD)
├── frontend/                # React Vite App
│   ├── src/
│   │   ├── components/      # UI: Login, ChatArea, Sidebar, etc.
│   │   ├── api.ts           # Axios instance & interceptors
│   │   └── App.tsx          # Main Logic & Layout
│   ├── vite.config.ts       # Build config
│   └── package.json         # React 19, Tailwind 4
├── ecosystem.config.js      # PM2 Production Config
├── start-server.sh          # Unified build & start script
└── .github/workflows/       # Deployment automation
```