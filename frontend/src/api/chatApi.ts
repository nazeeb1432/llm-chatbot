import axios, { AxiosError } from 'axios'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  session_id: string
}

export interface ChatResponse {
  reply: string
  message: Message
}

export interface HistoryResponse {
  messages: Message[]
}

export interface Session {
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SessionsListResponse {
  sessions: Session[]
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

function handleError(err: unknown): never {
  if (err instanceof AxiosError) {
    const serverMessage = err.response?.data?.detail ?? err.response?.data?.message
    if (serverMessage) throw new Error(serverMessage)
    if (err.response?.status === 401) throw new Error('Unauthorized. Please sign in again.')
    if (err.response?.status === 429) throw new Error('Too many requests. Please slow down.')
    if (err.code === 'ERR_NETWORK') throw new Error('Cannot reach the server. Check your connection.')
  }
  throw new Error('An unexpected error occurred. Please try again.')
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(token: string): Promise<Session> {
  try {
    const { data } = await client.post<Session>('/api/sessions', null, {
      headers: authHeaders(token),
    })
    return data
  } catch (err) {
    handleError(err)
  }
}

export async function listSessions(token: string): Promise<Session[]> {
  try {
    const { data } = await client.get<SessionsListResponse>('/api/sessions', {
      headers: authHeaders(token),
    })
    return data.sessions
  } catch (err) {
    handleError(err)
  }
}

export async function deleteSession(token: string, sessionId: string): Promise<void> {
  try {
    await client.delete(`/api/sessions/${sessionId}`, {
      headers: authHeaders(token),
    })
  } catch (err) {
    handleError(err)
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function sendMessage(
  token: string,
  message: string,
  sessionId: string,
): Promise<ChatResponse> {
  try {
    const { data } = await client.post<ChatResponse>(
      '/api/chat',
      { message, session_id: sessionId } satisfies ChatRequest,
      { headers: authHeaders(token) },
    )
    return data
  } catch (err) {
    handleError(err)
  }
}

export async function sendMessageStream(
  token: string,
  message: string,
  sessionId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onTitleUpdate?: (title: string) => void,
): Promise<void> {
  const baseURL = import.meta.env.VITE_API_URL as string
  const response = await fetch(`${baseURL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, session_id: sessionId } satisfies ChatRequest),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((data.detail as string | undefined) ?? 'Stream request failed.')
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(payload) as string | { error?: string; __title__?: string }
        if (typeof parsed === 'string') {
          onChunk(parsed)
        } else if (parsed.__title__ && onTitleUpdate) {
          onTitleUpdate(parsed.__title__)
        }
      } catch {
        // malformed chunk — skip
      }
    }
  }
  onDone()
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getChatHistory(token: string, sessionId: string): Promise<HistoryResponse> {
  try {
    const { data } = await client.get<HistoryResponse>('/api/history', {
      headers: authHeaders(token),
      params: { session_id: sessionId },
    })
    return data
  } catch (err) {
    handleError(err)
  }
}
