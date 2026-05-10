import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: (content: string) => void
  isLoading: boolean
}

const MAX_ROWS = 4
const LINE_HEIGHT = 24

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
    <div className="flex items-end gap-2 p-4 border-t border-slate-700 bg-slate-900">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        rows={1}
        placeholder="Message…"
        className="flex-1 resize-none bg-slate-800 text-slate-100 placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 leading-6 overflow-y-auto"
        style={{ maxHeight: `${MAX_ROWS * LINE_HEIGHT}px` }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-label="Send message"
      >
        {isLoading ? <Spinner /> : <SendIcon />}
      </button>
    </div>
  )
}
