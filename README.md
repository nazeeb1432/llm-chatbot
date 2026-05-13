# LLM Chatbot

A full-stack AI chat application that runs a large language model **entirely on your own machine** — no third-party AI API keys, no data leaving your network. Modelled after the ChatGPT / Claude UI, it supports multiple independent chat sessions per user, real-time streaming, markdown rendering, and secure Clerk authentication.

```
┌──────────────────────────────────────────────────────────┐
│  "Your conversations stay private on your machine."       │
└──────────────────────────────────────────────────────────┘
```

---

## Features

- **100 % local LLM inference** — Llama 3.1 8B running via Ollama; nothing is sent to an external AI provider
- **Multi-session chat** — each user can create, switch between, and delete unlimited independent chat sessions (like ChatGPT); sessions persist across restarts
- **Auto-titled sessions** — the first message in a new chat automatically becomes the session title (up to 60 characters)
- **Real-time streaming** — assistant replies stream token-by-token over Server-Sent Events; the bubble fills in live
- **Markdown rendering** — assistant responses render full GitHub-flavoured markdown: headings, lists, bold/italic, inline and block code, tables, blockquotes, and links
- **Per-session LangChain memory** — each session gets an isolated in-memory LangChain context keyed by `user_id:session_id`; switching sessions switches context
- **Persistent history** — every message is stored in MongoDB scoped to `(user_id, session_id)` so history survives server restarts
- **Clerk authentication** — sign-up / sign-in via Clerk; the backend verifies RS256 JWTs by fetching the Clerk JWKS endpoint
- **Collapsible sidebar** — the session list slides in/out smoothly; toggle with the hamburger button; full-width layout uses 100 % of the viewport
- **Optimistic UI** — user messages appear instantly; the assistant bubble fills in as chunks arrive
- **Error handling** — network failures, 401s, and service unavailability surface as dismissible inline banners

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Markdown | `react-markdown` |
| Auth (client) | `@clerk/clerk-react` |
| HTTP client | Axios + native `fetch` (SSE streaming) |
| Backend | FastAPI 0.115, Python 3.11, Uvicorn |
| Auth (server) | `python-jose`, Clerk JWKS |
| LLM orchestration | LangChain, `langchain-ollama` |
| LLM runtime | Ollama — `llama3.1:8b` |
| Database | MongoDB 6+ (Motor async driver) |

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| [Ollama](https://ollama.com/download) | Latest | Must be running before the backend starts |
| Node.js | 18+ | Used to run the Vite dev server |
| Python | 3.11+ | Backend runtime |
| MongoDB | 6.0+ | Local install or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Clerk account | — | Free tier is sufficient |

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> llm-chatbot
cd llm-chatbot
```

### 2. Create a Clerk application

1. Go to [clerk.com](https://clerk.com) and create a new application.
2. In the Clerk dashboard, open **API Keys**.
3. Copy your **Publishable Key** — it starts with `pk_test_` or `pk_live_`.
4. Your JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`

### 3. Pull the Ollama model

```bash
ollama pull llama3.1:8b
ollama list   # confirm it appears
```

This is a one-time download (~4.7 GB).

### 4. Configure the backend

```bash
cd backend
cp .env.example .env   # or create .env manually
```

Edit `backend/.env`:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=llm_chatbot
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### 5. Install backend dependencies

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 6. Configure the frontend

```bash
cd frontend
```

Create `frontend/.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your-publishable-key>
VITE_API_URL=http://localhost:8000
```

### 7. Install frontend dependencies

```bash
npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | No | `llm_chatbot` | MongoDB database name |
| `CLERK_JWKS_URL` | **Yes** | — | Clerk JWKS endpoint for RS256 JWT verification |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Base URL of the running Ollama instance |
| `OLLAMA_MODEL` | No | `llama3.1:8b` | Model tag passed to Ollama |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | — | Clerk publishable key |
| `VITE_API_URL` | No | `http://localhost:8000` | Base URL of the FastAPI backend |

---

## Running the Application

You need **four terminals** running simultaneously.

```bash
# Terminal 1 — Ollama
ollama serve

# Terminal 2 — MongoDB (macOS Homebrew)
brew services start mongodb-community

# Terminal 3 — FastAPI backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 4 — Vite frontend
cd frontend && npm run dev
```

Open `http://localhost:5173`. Interactive API docs at `http://localhost:8000/docs`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (port 5173)                         │
│                                                                      │
│  ┌─────────────┐    ┌─────────────────────────────────────────────┐  │
│  │  LoginPage  │    │   ChatPage                                  │  │
│  │  <SignIn /> │    │   ├── Sidebar (sessions list, new/delete)   │  │
│  │  (Clerk UI) │    │   ├── ChatWindow (messages + empty state)   │  │
│  └──────┬──────┘    │   └── ChatInput (pill input, SSE stream)    │  │
│         │ JWT       └───────────────┬─────────────────────────────┘  │
│         │                           │ Bearer JWT + session_id        │
└─────────┼───────────────────────────┼────────────────────────────────┘
          │                           ▼
┌─────────┼──────────────────────────────────────────────────────────┐
│         │         FastAPI Backend (port 8000)                       │
│         │                                                           │
│         │  auth.py ── RS256 JWT → user_id                          │
│         │                                                           │
│         │  routes/sessions.py    POST/GET /api/sessions             │
│         │                        DELETE   /api/sessions/{id}        │
│         │                                                           │
│         │  routes/chat.py        POST /api/chat                     │
│         │                        POST /api/chat/stream (SSE)        │
│         │                                                           │
│         │  routes/history.py     GET /api/history?session_id=…      │
│         │                                                           │
│         │  ┌──────────────────┐   ┌────────────────────────────┐  │
│         │  │ llm_service.py   │   │ session_service.py         │  │
│         │  │ LangChain chain  │   │ history_service.py         │  │
│         │  │ key=user:session │   │ Motor async MongoDB driver  │  │
│         │  └────────┬─────────┘   └────────────┬───────────────┘  │
└─────────┼───────────┼──────────────────────────────┼───────────────┘
          ▼           ▼                              ▼
   ┌──────────┐  ┌──────────────────────┐   ┌──────────────────────┐
   │  Clerk   │  │  Ollama (port 11434)  │   │  MongoDB             │
   │  JWKS    │  │  llama3.1:8b         │   │  sessions collection │
   └──────────┘  │  (local inference)   │   │  chat_history        │
                 └──────────────────────┘   └──────────────────────┘
```

---

## Database Schema

### `sessions` collection
```json
{
  "session_id": "<uuid-v4>",
  "user_id":    "<clerk-sub>",
  "title":      "New Chat",
  "created_at": "<ISO UTC>",
  "updated_at": "<ISO UTC>"
}
```
Indexes: `(user_id, created_at)` for listing; `(session_id, user_id)` unique for lookups.

### `chat_history` collection
```json
{
  "user_id":    "<clerk-sub>",
  "session_id": "<uuid-v4>",
  "messages": [
    { "role": "user",      "content": "…", "timestamp": "…" },
    { "role": "assistant", "content": "…", "timestamp": "…" }
  ]
}
```
Index: `(user_id, session_id)` unique compound index.

---

## API Reference

All protected endpoints require `Authorization: Bearer <clerk-jwt>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`    | `/health`                    | No  | Service liveness check |
| `POST`   | `/api/sessions`              | Yes | Create a new chat session |
| `GET`    | `/api/sessions`              | Yes | List all sessions for the user (newest first) |
| `DELETE` | `/api/sessions/{session_id}` | Yes | Delete a session and its history |
| `POST`   | `/api/chat`                  | Yes | Send a message, receive full reply |
| `POST`   | `/api/chat/stream`           | Yes | Send a message, receive SSE stream |
| `GET`    | `/api/history`               | Yes | Get messages for `?session_id=` |

### Key request bodies

**POST /api/chat** and **POST /api/chat/stream**
```json
{ "message": "Explain binary search.", "session_id": "<uuid>" }
```

**POST /api/chat/stream** — SSE events
```
data: "Binary"
data: " search"
data: " works..."
data: {"__title__": "Explain binary search"}   ← emitted once on first message
data: [DONE]
```

---

## How LangChain Is Used

`backend/app/services/llm_service.py` uses three LangChain components:

- **`ChatOllama`** — wraps the local Ollama HTTP API as a LangChain chat model (`temperature=0.7`)
- **`ChatPromptTemplate` + `MessagesPlaceholder`** — builds `[SYSTEM] → [HISTORY] → [HUMAN]` prompt structure; the placeholder is replaced with the session's accumulated messages
- **`RunnableWithMessageHistory`** — adds stateful per-session memory; session key is `"{user_id}:{session_id}"` so every session gets isolated context

> The in-memory `_session_store` resets on server restart. MongoDB is the durable store; LangChain's store is the fast context window for the active chain.

---

## Troubleshooting

### `503 Service Unavailable` on chat
Ollama is not running or the model is missing.
```bash
ollama serve
ollama pull llama3.1:8b
curl http://localhost:11434/api/tags   # verify
```

### `401 Unauthorized` on all requests
- Confirm `CLERK_JWKS_URL` in `backend/.env` matches your Clerk dashboard domain
- Confirm `VITE_CLERK_PUBLISHABLE_KEY` belongs to the same Clerk app
- Sync system clock (`sudo sntp -sS time.apple.com` on macOS)

### CORS errors in browser
The backend allows `http://localhost:5173` by default. If your frontend runs on a different port, add it to `allow_origins` in `backend/app/main.py`.

### MongoDB connection errors
```bash
mongosh --eval "db.adminCommand({ ping: 1 })"
brew services start mongodb-community   # macOS
sudo systemctl start mongod             # Linux
```

### App not using full browser width
Ensure `frontend/src/index.css` does **not** have a `width` or `max-width` on `#root`. The correct rule is:
```css
#root { width: 100%; height: 100vh; }
```
