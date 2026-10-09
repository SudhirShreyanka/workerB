# Email Worker Backend API

A lightweight, secure Node.js and Express backend API for sending emails via Google SMTP (Gmail) and Nodemailer. Designed for standalone private deployment on [Render](https://render.com/).

---

## Architecture & Security Highlights

- **Pure API**: No frontend assets or HTML templates served from this repository.
- **Strict CORS**: Origin whitelist enforced using `FRONTEND_ORIGIN`.
- **Bearer Token Authentication**: Timing-safe authorization prevents unauthorized relays.
- **Private Logs & Sanitized Errors**: Stack traces and credentials are never exposed in JSON responses.
- **Fast Zero-Dependency Healthcheck**: `GET /health` answers immediately without waiting for SMTP.

---

## Directory Structure

```text
backend/
├── src/
│   ├── config.js         # Environment parsing and diagnostic log status
│   ├── index.js          # Express app, CORS, rate limiting, and routes
│   ├── mailer.js         # Lazy Nodemailer transport setup
│   └── middleware/
│       └── auth.js       # Timing-safe Bearer token authentication
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore file (excludes secrets and modules)
├── package.json          # Dependencies & npm scripts
└── README.md             # Backend setup & deployment guide
```

---

## Environment Variables

Configure these variables in your Render Dashboard:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Auto-assigned by Render | `5000` |
| `GMAIL_USER` | Your Gmail address | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password | `abcdefghijklmnop` |
| `API_SECRET` | Secret token required for Bearer auth | `random_strong_token_123` |
| `FRONTEND_ORIGIN` | Allowed Railway frontend origin(s) | `https://my-frontend.up.railway.app` |

---

## API Endpoints

### 1. `GET /health`
- **Auth**: None
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "uptime": 120,
    "timestamp": "2026-10-09T10:00:00.000Z"
  }
  ```

### 2. `POST /api/send-email`
- **Auth**: `Authorization: Bearer <API_SECRET>`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "Hello from Render backend API."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "success",
    "message": "Email accepted by SMTP server for delivery",
    "details": {
      "messageId": "<xxxx@gmail.com>",
      "recipient": "recipient@example.com",
      "accepted": ["recipient@example.com"],
      "rejected": []
    },
    "note": "The SMTP server has accepted the message for delivery.",
    "timestamp": "2026-10-09T10:00:02.000Z"
  }
  ```

---

## Local Development

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

---

## Render Deployment Instructions

1. Push this `backend` directory to a **private** GitHub repository (e.g. `github.com/<user>/email-worker-backend`).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Select your private backend GitHub repository.
5. Set:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. In **Environment Variables**, add:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `API_SECRET`
   - `FRONTEND_ORIGIN` (Your Railway frontend URL)
7. Click **Deploy Web Service**.
8. Set the Health Check Path in Render settings to `/health`.

> ⚠️ **Note on Render SMTP:** Render's Free tier blocks outbound TCP connections on ports 25, 465, and 587. To connect directly to `smtp.gmail.com:587`, upgrade the backend web service to a Render Starter plan or deploy the backend worker on a cloud host with open SMTP egress (such as Railway).
