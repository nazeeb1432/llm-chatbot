# Multi-Session Chat — Implementation Plan

## Goal
Each user can maintain multiple independent chat sessions (like ChatGPT / Claude), switch between them in a sidebar, create new ones, and delete old ones. Each session has its own isolated LLM context and persisted message history.

---

## 1. MongoDB Schema Changes

### New `sessions` collection
```json
{
  "session_id": "<uuid-v4>",
  "user_id":    "<clerk_sub>",
  "title":      "New Chat",
  "created_at": "<ISO UTC>",
  "updated_at": "<ISO UTC>"
}
```
Indexes:
- `(user_id, created_at)` — for listing sessions newest-first
- `(session_id, user_id)` unique — for lookups

### Updated `chat_history` collection
Add `session_id` field. Old single-document-per-user design becomes one document per **(user_id, session_id)** pair.
```json
{
  "user_id":    "<clerk_sub>",
  "session_id": "<uuid-v4>",
  "messages":   [...]
}
```
Index: `(user_id, session_id)` unique compound index.

---

## 2. Backend Changes

### `app/models.py`
- Add `Session` model: `session_id`, `user_id`, `title`, `created_at`, `updated_at`
- Add `SessionResponse`, `SessionsListResponse`
- Update `ChatRequest`: add `session_id: str`
- Update `HistoryResponse` — no schema change needed, but route now scoped

### `app/database.py`
- Add indexes for `sessions` collection and the compound `(user_id, session_id)` on `chat_history`

### `app/services/history_service.py`
- `save_message(db, user_id, session_id, message)` — filter by both fields
- `get_history(db, user_id, session_id)` — scoped to session

### `app/services/llm_service.py`
- Change session key from `user_id` to `f"{user_id}:{session_id}"` so each session gets an isolated in-memory LangChain history

### `app/services/session_service.py`  *(new)*
- `create_session(db, user_id) -> Session`
- `list_sessions(db, user_id) -> list[Session]`
- `get_session(db, user_id, session_id) -> Session | None`
- `delete_session(db, user_id, session_id)` — removes session doc + its chat_history doc
- `update_session_title(db, user_id, session_id, title)` — called after first message

### `app/routes/sessions.py`  *(new)*
| Method | Path | Action |
|--------|------|--------|
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions` | List all sessions for user |
| DELETE | `/api/sessions/{session_id}` | Delete session + its history |

### `app/routes/chat.py`
- Both `/api/chat` and `/api/chat/stream` now read `session_id` from the request body
- Pass `session_id` to `history_service` and `llm_service`
- After first assistant reply, call `update_session_title` with the first 60 chars of user message

### `app/routes/history.py`
- `GET /api/history?session_id=<id>` — add `session_id` query param

### `app/main.py`
- Include `sessions.router` under `/api` prefix

---

## 3. Frontend Changes

### `api/chatApi.ts`
New types: `Session`, `SessionsListResponse`  
New functions:
- `createSession(token)` → `Session`
- `listSessions(token)` → `Session[]`
- `deleteSession(token, sessionId)` → `void`

Updated functions (add `sessionId` param):
- `sendMessageStream(token, message, sessionId, onChunk, onDone)`
- `getChatHistory(token, sessionId)`

### `hooks/useSessions.ts`  *(new)*
Manages:
- `sessions: Session[]` — list from API
- `activeSessionId: string | null`
- `createSession()` — POST, prepend to list, set active
- `deleteSession(id)` — DELETE, remove from list, switch active if needed
- Auto-creates a session on first load if none exist

### `hooks/useChat.ts`
- Accept `sessionId: string | null` as parameter
- Reset `messages` to `[]` whenever `sessionId` changes
- Load history scoped to `sessionId`
- Pass `sessionId` to `sendMessageStream`
- Guard: no-op if `sessionId` is null

### `components/Sidebar.tsx`  *(new)*
- "New Chat" button at top
- Scrollable list of sessions, newest first
- Active session highlighted
- Each item: title + delete button (trash icon, confirm on click)
- Collapsible on mobile (hamburger toggle)

### `pages/ChatPage.tsx`
- Import `useSessions` and pass `activeSessionId` to `useChat`
- Layout: `flex-row` with `Sidebar` on the left + existing chat area on the right
- Pass `createSession`, `deleteSession`, `sessions`, `activeSessionId`, `setActiveSessionId` to Sidebar

---

## 4. Data Migration
No migration needed — existing single-session users will simply see an empty session list and a new "New Chat" will be created automatically. Old `chat_history` documents (without `session_id`) are ignored by the new scoped queries.

---

## 5. Execution Order
1. Backend models → database indexes → session_service → history_service → llm_service → routes → main
2. Frontend api layer → useSessions hook → useChat hook → Sidebar component → ChatPage
