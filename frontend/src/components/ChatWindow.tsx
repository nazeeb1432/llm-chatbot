import { useEffect, useRef } from 'react'
import type { Message } from '../api/chatApi'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
  isLoading: boolean
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
          <rect x="3" y="8" width="14" height="9" rx="2" />
          <circle cx="7.5" cy="12.5" r="1.5" fill="#3b82f6" />
          <circle cx="12.5" cy="12.5" r="1.5" fill="#3b82f6" />
          <path d="M10 4v4M8 4h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex items-center gap-1 py-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
            style={{ animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center">
        <svg viewBox="0 0 32 32" fill="none" className="w-9 h-9">
          <rect x="3" y="12" width="26" height="15" rx="3" fill="#3b82f6" />
          <circle cx="11" cy="19.5" r="2.5" fill="white" />
          <circle cx="21" cy="19.5" r="2.5" fill="white" />
          <path d="M16 5v7M13 5h6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-200 mb-1">Hello! Let's Chat.</h2>
        <p className="text-sm text-slate-500">Ask me anything — I'm here to help.</p>
      </div>
    </div>
  )
}

export default function ChatWindow({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <>
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </>
  )
}
