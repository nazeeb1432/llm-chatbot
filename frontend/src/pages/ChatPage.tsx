import { UserButton } from '@clerk/clerk-react'
import { useChat } from '../hooks/useChat'
import ChatWindow from '../components/ChatWindow'
import ChatInput from '../components/ChatInput'

export default function ChatPage() {
  const { messages, isLoading, error, inputValue, setInputValue, sendMessage, clearError } = useChat()

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
        <span className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Chat
        </span>
        <UserButton />
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 mx-4 mt-3 px-4 py-2.5 bg-red-900/40 border border-red-700/50 rounded-lg text-sm text-red-300 shrink-0">
          <span>{error}</span>
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
        isLoading={isLoading}
      />
    </div>
  )
}
