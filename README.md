# LLM Chatbot

A full-stack AI chat application that runs a large language model **entirely on your own machine** — no third-party AI API keys, no data leaving your network. It uses [Ollama](https://ollama.com) to serve Llama 3.1 locally, [LangChain](https://python.langchain.com) to manage conversation memory, [FastAPI](https://fastapi.tiangolo.com) as the backend API, [MongoDB](https://www.mongodb.com) to persist chat history across sessions, and [Clerk](https://clerk.com) for secure user authentication.

```
┌──────────────────────────────────────────────────────────┐
│  "Your conversations stay private on your machine."       │
└──────────────────────────────────────────────────────────┘
```

---

## Features

- **100 % local LLM inference** — Llama 3.1 8B running via Ollama; nothing is sent to an external AI provider
- **Real-time streaming** — assistant replies stream token-by-token over Server-Sent Events
- **Per-user conversation memory** — LangChain maintains an in-memory message history per Clerk user ID for coherent multi-turn dialogue
- **Persistent chat history** — every message is stored in MongoDB so history survives server restarts
- **Clerk authentication** — sign-up / sign-in via Clerk; the backend verifies RS256 JWTs by fetching the Clerk JWKS endpoint
- **Protected routes** — unauthenticated users are redirected to the login page; signed-in users are redirected away from it
- **Optimistic UI** — user messages appear instantly; the assistant bubble fills in as chunks arrive
- **Error handling** — network failures, 401s, and service unavailability surface as dismissible inline banners

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Auth (client) | `@clerk/clerk-react` |
| HTTP client | Axios + native `fetch` (SSE streaming) |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Auth (server) | `python-jose`, Clerk JWKS |
| LLM orchestration | LangChain, `langchain-ollama` |
| LLM runtime | Ollama — `llama3.1:8b` |
| Database | MongoDB (Motor async driver) |

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| [Ollama](https://ollama.com/download) | Latest | Must be running before the backend starts |
| Node.js | 18+ | Used to run the Vite dev server |
| Python | 3.11+ | Backend runtime |
| MongoDB | 6.0+ | Can be a local install or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Clerk account | — | Free tier is sufficient; needed for auth keys |

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
4. Your JWKS URL is: `https://<your-clerk-domain>/.well-known/jwks.json`  
   (visible in the dashboard under **JWT Templates → Default**; the domain looks like `flexible-monkey-80.clerk.accounts.dev`).

### 3. Pull the Ollama model

```bash
ollama pull llama3.1:8b
```

This is a one-time download (~4.7 GB). Verify it is available:

```bash
ollama list
```

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
cp .env.local.example .env.local   # or create .env.local manually
```

Edit `frontend/.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your-publishable-key>
VITE_API_URL=http://localhost:8000
```

### 7. Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URL` | No | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | No | `llm_chatbot` | MongoDB database name |
| `CLERK_JWKS_URL` | **Yes** | — | Clerk JWKS endpoint used to verify RS256 JWTs |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Base URL of the running Ollama instance |
| `OLLAMA_MODEL` | No | `llama3.1:8b` | Model tag passed to Ollama |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | — | Clerk publishable key (safe to expose in the browser) |
| `VITE_API_URL` | No | `http://localhost:8000` | Base URL of the FastAPI backend |

---

## Running the Application

You need **four terminals** running simultaneously.

### Terminal 1 — Ollama

```bash
ollama serve
```

Ollama listens on `http://localhost:11434`. If Ollama is already running as a system service after installation, you can skip this step.

### Terminal 2 — MongoDB

```bash
mongod --dbpath /usr/local/var/mongodb   # macOS Homebrew path; adjust as needed
```

Or, if MongoDB is running as a system service:

```bash
brew services start mongodb-community   # macOS
sudo systemctl start mongod             # Linux
```

### Terminal 3 — FastAPI Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

### Terminal 4 — Vite Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (port 5173)                         │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │  LoginPage  │    │   ChatPage   │    │  useChat (hook)        │ │
│  │  <SignIn /> │    │  <ChatWindow>│───▶│  sendMessageStream()   │ │
│  │  (Clerk UI) │    │  <ChatInput> │    │  getChatHistory()      │ │
│  └──────┬──────┘    └──────┬───────┘    └──────────┬─────────────┘ │
│         │ JWT token        │                        │               │
└─────────┼──────────────────┼────────────────────────┼───────────────┘
          │                  │  Bearer JWT             │
          │                  ▼                         │
┌─────────┼──────────────────────────────────────────────────────────┐
│         │        FastAPI Backend (port 8000)                        │
│         │                                                           │
│         │  ┌──────────────────────────────────────────────────┐    │
│         │  │  auth.py — verify_token()                        │    │
│         │  │  • Fetches JWKS from Clerk on first request      │    │
│         │  │  • Validates RS256 JWT, extracts sub (user_id)   │    │
│         │  └───────────────────┬──────────────────────────────┘    │
│         │                      │ user_id                            │
│         │  ┌───────────────────▼──────────────────────────────┐    │
│         │  │  routes/chat.py        routes/history.py          │    │
│         │  │  POST /api/chat        GET /api/history           │    │
│         │  │  POST /api/chat/stream                            │    │
│         │  └──────┬────────────────────────────────┬───────────┘    │
│         │         │                                │               │
│         │  ┌──────▼──────────┐    ┌───────────────▼─────────────┐ │
│         │  │  llm_service.py │    │  history_service.py         │ │
│         │  │  LangChain chain│    │  Motor async MongoDB driver  │ │
│         │  │  per-user memory│    │  upsert / find_one          │ │
│         │  └──────┬──────────┘    └───────────────┬─────────────┘ │
└─────────┼─────────┼──────────────────────────────────┼─────────────┘
          │         │                                  │
          ▼         ▼                                  ▼
   ┌────────────┐  ┌─────────────────────┐   ┌──────────────────┐
   │  Clerk     │  │  Ollama (port 11434) │   │  MongoDB         │
   │  JWKS URL  │  │  llama3.1:8b        │   │  llm_chatbot db  │
   │  (HTTPS)   │  │  (local inference)  │   │  chat_history    │
   └────────────┘  └─────────────────────┘   └──────────────────┘
```

---

## How LangChain Is Used

LangChain serves as the **LLM orchestration layer** in `backend/app/services/llm_service.py`. Here is exactly what each component does in this project:

### `ChatOllama`
Wraps the locally running Ollama HTTP API as a LangChain-compatible chat model. Configured with `temperature=0.7` for a balance between creativity and coherence.

```python
_llm = ChatOllama(base_url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL, temperature=0.7)
```

### `ChatPromptTemplate` + `MessagesPlaceholder`
Defines the prompt structure that is sent to the model on every turn:

```
[SYSTEM]  You are a helpful AI assistant.
[HISTORY] <all previous messages for this user>
[HUMAN]   <current user message>
```

The `MessagesPlaceholder` is the slot where LangChain automatically injects the accumulated conversation history before each call.

### `RunnableWithMessageHistory`
Wraps the `prompt | llm` chain and adds **stateful, per-session memory management**. On every call it:

1. Loads the history for the given `session_id` (mapped to Clerk's `user_id`)
2. Injects it into the prompt via the `MessagesPlaceholder`
3. Appends the new human message before invoking
4. Appends the model's reply after invoking

This means the model always sees the full conversation context without the route handler managing any state manually.

### `ainvoke` / `astream`
Both are async. `ainvoke` returns the full reply at once (used by `POST /api/chat`). `astream` yields text chunks as they are produced by Ollama (used by `POST /api/chat/stream` for the SSE endpoint).

> **Note:** LangChain's in-memory session store (`_session_store`) resets when the backend restarts. MongoDB provides the durable history; the in-memory store is the fast, per-process context window for the active model chain.

---

## API Endpoints

All protected endpoints require an `Authorization: Bearer <clerk-jwt>` header.

### `GET /health`

Check service liveness.

| | |
|---|---|
| Auth required | No |
| Request body | None |

**Response `200`**
```json
{
  "status": "ok",
  "model": "llama3.1:8b"
}
```

---

### `POST /api/chat`

Send a message and receive the full reply in one response.

| | |
|---|---|
| Auth required | Yes |
| Content-Type | `application/json` |

**Request body**
```json
{
  "message": "Explain the difference between async and sync Python."
}
```

**Response `200`**
```json
{
  "reply": "In Python, synchronous code...",
  "message": {
    "role": "assistant",
    "content": "In Python, synchronous code...",
    "timestamp": "2026-05-11T10:23:45.123456Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing, expired, or invalid JWT |
| `503 Service Unavailable` | Ollama is not running or the model is not loaded |

---

### `POST /api/chat/stream`

Stream the assistant reply as **Server-Sent Events**. Each event is a JSON-encoded text chunk. The stream ends with `data: [DONE]`.

| | |
|---|---|
| Auth required | Yes |
| Content-Type | `application/json` |
| Response type | `text/event-stream` |

**Request body**
```json
{
  "message": "Write a haiku about distributed systems."
}
```

**SSE stream**
```
data: "Nodes"

data: " whisper"

data: " across"

data: " the wire,"

...

data: [DONE]
```

On error, a single event is emitted before the stream closes:
```
data: {"error": "LLM service unavailable: ..."}
```

---

### `GET /api/history`

Retrieve the authenticated user's full conversation history, sorted oldest-first.

| | |
|---|---|
| Auth required | Yes |
| Request body | None |

**Response `200`**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!",
      "timestamp": "2026-05-11T09:00:00.000000Z"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you today?",
      "timestamp": "2026-05-11T09:00:01.234567Z"
    }
  ]
}
```

Returns `{"messages": []}` if the user has no history yet.

---

## Troubleshooting

### Ollama is not running

**Symptom:** `POST /api/chat` returns `503 Service Unavailable` with a message like `LLM service unavailable: Connection refused`.

**Fix:**
```bash
# Start Ollama
ollama serve

# Verify it responds
curl http://localhost:11434/api/tags
```

If the port is occupied, another Ollama process is already running — check with `lsof -i :11434`.

---

### Model not found in Ollama

**Symptom:** `503` with a message like `model "llama3.1:8b" not found`.

**Fix:**
```bash
ollama pull llama3.1:8b
ollama list   # confirm it appears
```

If you want to use a different model, update `OLLAMA_MODEL` in `backend/.env` to match the tag shown by `ollama list`.

---

### CORS errors in the browser

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors; requests to `localhost:8000` are blocked.

**Cause:** The backend only allows `http://localhost:5173` by default (set in `app/main.py`). If your frontend runs on a different port, the CORS preflight fails.

**Fix:** Edit `backend/app/main.py` and add your origin to `allow_origins`:

```python
allow_origins=["http://localhost:5173", "http://localhost:3000"],
```

Alternatively, set `allow_origins=["*"]` during local development only — never in production.

---

### Clerk JWT verification failures

**Symptom:** All protected endpoints return `401 Unauthorized` even when the user is signed in. Backend logs may show `JWTError`, `Signing key not found`, or `Token has expired`.

**Diagnosis checklist:**

1. **Wrong JWKS URL** — Confirm `CLERK_JWKS_URL` in `backend/.env` matches the domain shown in your Clerk dashboard. It must be reachable from the backend:
   ```bash
   curl $CLERK_JWKS_URL
   ```

2. **Publishable key mismatch** — `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local` must belong to the same Clerk application as the JWKS URL. Mixing keys from two different Clerk apps causes signature failures.

3. **System clock skew** — RS256 JWTs have a short expiry. If your machine clock is off by more than a minute, tokens appear expired immediately. Sync your clock:
   ```bash
   # macOS
   sudo sntp -sS time.apple.com
   ```

4. **Token not sent** — Verify the request includes the header in browser DevTools → Network → request headers:
   ```
   Authorization: Bearer eyJ...
   ```

---

### MongoDB connection errors

**Symptom:** Backend fails to start or returns `500` on history endpoints with a message about the database client not being initialized.

**Fix:**
```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand({ ping: 1 })"

# Start it if not
brew services start mongodb-community   # macOS
sudo systemctl start mongod             # Linux
```

Confirm `MONGODB_URL` in `backend/.env` matches your MongoDB instance (default: `mongodb://localhost:27017`).

---

### Frontend shows blank page after sign-in

**Symptom:** After signing in via Clerk, the app redirects to `/` but renders nothing.

**Likely cause:** The Vite dev server is not running, or `VITE_API_URL` points to the wrong address and the initial history fetch silently fails.

**Fix:** Ensure all four terminals are running and check the browser console for errors. Confirm `VITE_API_URL=http://localhost:8000` and that the backend is healthy at `http://localhost:8000/health`.
