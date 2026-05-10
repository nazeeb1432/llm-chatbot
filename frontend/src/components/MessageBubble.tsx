import type { Message } from '../api/chatApi'

interface Props {
  message: Message
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex flex-col gap-1 animate-in ${isUser ? 'items-end' : 'items-start'}`}
      style={{ animation: 'bubbleIn 0.2s ease-out both' }}
    >
      <span className="text-xs text-slate-500 px-1">
        {isUser ? 'You' : 'Assistant'}
      </span>
      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed break-words ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-slate-700 text-slate-100 rounded-2xl rounded-bl-sm'
        }`}
      >
        {message.content}
      </div>
      <span className="text-xs text-slate-600 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  )
}
