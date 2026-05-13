import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { sendMessageStream, getChatHistory } from '../api/chatApi'
import type { Message } from '../api/chatApi'

export function useChat(
  sessionId: string | null,
  onTitleUpdate?: (sessionId: string, title: string) => void,
) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const shouldScrollRef = useRef(false)

  // Reset and reload whenever the active session changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }

    let cancelled = false
    setMessages([])
    setError(null)
    setIsLoading(true)

    async function loadHistory() {
      try {
        const token = await getToken()
        if (!token) return
        const { messages: history } = await getChatHistory(token, sessionId!)
        if (!cancelled) {
          setMessages(history)
          shouldScrollRef.current = true
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load chat history.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadHistory()
    return () => { cancelled = true }
  }, [sessionId, getToken])

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) return
    const trimmed = content.trim()
    if (!trimmed || isLoading) return

    const optimisticUser: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    const placeholderAssistant: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticUser, placeholderAssistant])
    shouldScrollRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')

      await sendMessageStream(
        token,
        trimmed,
        sessionId,
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
            return updated
          })
          shouldScrollRef.current = true
        },
        () => {
          setIsLoading(false)
        },
        (title) => {
          if (onTitleUpdate) onTitleUpdate(sessionId, title)
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.')
      setMessages(prev => prev.slice(0, -2))
      setIsLoading(false)
    }
  }, [sessionId, getToken, isLoading, onTitleUpdate])

  const clearError = useCallback(() => setError(null), [])

  return {
    messages,
    isLoading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    clearError,
    shouldScrollRef,
  }
}
