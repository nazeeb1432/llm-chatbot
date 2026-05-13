import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: (content: string) => void
  isLoading: boolean
}

const MAX_ROWS = 6
const LINE_HEIGHT = 24

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ChatInput({ value, onChange, onSend, isLoading }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT)}px`
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
  }

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    onChange('')
  }

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div className="shrink-0 px-4 pb-4 pt-3 bg-slate-900">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-slate-800 rounded-2xl border border-slate-700 px-4 py-2.5 focus-within:border-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            placeholder="Ask anything…"
            className="flex-1 resize-none bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none disabled:opacity-50 leading-6 overflow-y-auto"
            style={{ maxHeight: `${MAX_ROWS * LINE_HEIGHT}px` }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none mb-0.5"
            aria-label="Send message"
          >
            {isLoading ? <Spinner /> : <SendIcon />}
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-600 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
