import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { createSession, listSessions, deleteSession } from '../api/chatApi'
import type { Session } from '../api/chatApi'

export function useSessions() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        let list = await listSessions(token)
        if (!cancelled) {
          if (list.length === 0) {
            const newSession = await createSession(token)
            list = [newSession]
          }
          setSessions(list)
          setActiveSessionId(list[0].session_id)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [getToken])

  const handleCreateSession = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const session = await createSession(token)
    setSessions(prev => [session, ...prev])
    setActiveSessionId(session.session_id)
  }, [getToken])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const token = await getToken()
    if (!token) return
    await deleteSession(token, sessionId)
    setSessions(prev => {
      const next = prev.filter(s => s.session_id !== sessionId)
      if (activeSessionId === sessionId) {
        setActiveSessionId(next[0]?.session_id ?? null)
      }
      return next
    })
  }, [getToken, activeSessionId])

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev =>
      prev.map(s => s.session_id === sessionId ? { ...s, title } : s)
    )
  }, [])

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    isLoading,
    createSession: handleCreateSession,
    deleteSession: handleDeleteSession,
    updateSessionTitle,
  }
}
