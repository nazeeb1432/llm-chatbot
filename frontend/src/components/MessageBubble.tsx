import ReactMarkdown from 'react-markdown'
import type { Message } from '../api/chatApi'

interface Props {
  message: Message
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
      <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
        <rect x="3" y="8" width="14" height="9" rx="2" />
        <circle cx="7.5" cy="12.5" r="1.5" fill="#3b82f6" />
        <circle cx="12.5" cy="12.5" r="1.5" fill="#3b82f6" />
        <path d="M10 4v4M8 4h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  pre: ({ children }) => (
    <pre className="bg-slate-950 rounded-lg my-2 overflow-x-auto max-w-full">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className
    return isBlock ? (
      <code className="block text-xs font-mono text-slate-200 px-4 py-3 whitespace-pre">
        {children}
      </code>
    ) : (
      <code className="bg-slate-950 text-blue-300 rounded px-1.5 py-0.5 text-xs font-mono">
        {children}
      </code>
    )
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-600 pl-3 text-slate-400 italic my-2">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
      {children}
    </a>
  ),
  hr: () => <hr className="border-slate-700 my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-700 px-3 py-1.5 bg-slate-800 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-700 px-3 py-1.5">{children}</td>,
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end" style={{ animation: 'bubbleIn 0.15s ease-out both' }}>
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div className="bg-blue-600 text-white text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-br-sm break-words">
            {message.content}
          </div>
          <span className="text-[10px] text-slate-600 px-1">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3" style={{ animation: 'bubbleIn 0.15s ease-out both' }}>
      <BotAvatar />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-100">
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
        <span className="text-[10px] text-slate-600 mt-1 block">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}
