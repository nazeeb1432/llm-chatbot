import axios, { AxiosError } from 'axios'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  reply: string
  message: Message
}

export interface HistoryResponse {
  messages: Message[]
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

export async function sendMessage(token: string, message: string): Promise<ChatResponse> {
  try {
    const { data } = await client.post<ChatResponse>('/api/chat', { message } satisfies ChatRequest, {
      headers: authHeaders(token),
    })
    return data
  } catch (err) {
    handleError(err)
  }
}

export async function sendMessageStream(
  token: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
): Promise<void> {
  const baseURL = import.meta.env.VITE_API_URL as string
  const response = await fetch(`${baseURL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message } satisfies ChatRequest),
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
        const text = JSON.parse(payload) as string
        onChunk(text)
      } catch {
        // malformed chunk — skip
      }
    }
  }
  onDone()
}

export async function getChatHistory(token: string): Promise<HistoryResponse> {
  try {
    const { data } = await client.get<HistoryResponse>('/api/history', {
      headers: authHeaders(token),
    })
    return data
  } catch (err) {
    handleError(err)
  }
}
