import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useChat } from '../hooks/useChat'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import ChatInput from '../components/ChatInput'

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    isLoading: sessionsLoading,
    createSession,
    deleteSession,
    updateSessionTitle,
  } = useSessions()

  const {
    messages,
    isLoading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    clearError,
  } = useChat(activeSessionId, updateSessionTitle)

  const activeTitle = sessions.find(s => s.session_id === activeSessionId)?.title ?? ''

  return (
    <div className="h-screen bg-slate-900 flex overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
        isLoading={sessionsLoading}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar with toggle + session title */}
        <header className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <MenuIcon />
          </button>
          {activeTitle && (
            <span className="text-sm text-slate-400 truncate">{activeTitle}</span>
          )}
        </header>

        {error && (
          <div className="flex items-center justify-between gap-3 mx-4 mt-3 px-4 py-2.5 bg-red-900/40 border border-red-700/50 rounded-lg text-sm text-red-300 shrink-0">
            {error}
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-200 transition-colors shrink-0"
              aria-label="Dismiss error"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <ChatWindow messages={messages} isLoading={isLoading} />

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          isLoading={isLoading || sessionsLoading || !activeSessionId}
        />
      </main>
    </div>
  )
}
