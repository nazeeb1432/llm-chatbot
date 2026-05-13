import { useState, useRef, useEffect } from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import type { Session } from '../api/chatApi'

interface Props {
  isOpen: boolean
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  isLoading: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString([], {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function BotLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 shrink-0">
      <rect width="32" height="32" rx="8" fill="#3b82f6" />
      <rect x="8" y="13" width="16" height="10" rx="2" fill="white" />
      <circle cx="12.5" cy="18" r="1.5" fill="#3b82f6" />
      <circle cx="19.5" cy="18" r="1.5" fill="#3b82f6" />
      <path d="M16 9v4M13 9h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <span className="text-[10px] text-slate-500 mb-0.5 leading-none">
        {formatDate(session.created_at)}
      </span>
      <div className="flex items-center gap-1">
        <span className="flex-1 text-sm text-slate-300 truncate leading-snug">
          {session.title}
        </span>
        {/* ··· button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className={`shrink-0 p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Session options"
        >
          <DotsIcon />
        </button>
      </div>

      {/* Dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-full mt-1 z-50 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onDelete(); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isLoading,
}: Props) {
  const { signOut } = useClerk()
  const { user } = useUser()

  const initials = (user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase()
  const displayName = user?.firstName ?? user?.username ?? 'User'

  return (
    <aside
      style={{ width: isOpen ? '224px' : '0', minWidth: isOpen ? '224px' : '0' }}
      className="shrink-0 flex flex-col h-full bg-[#111] border-r border-slate-800 overflow-hidden transition-all duration-200 ease-in-out"
    >
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 shrink-0">
        <BotLogo />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 leading-none">AI Chat</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">AI-powered assistant</p>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <PlusIcon />
          Start New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5 scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 mt-1 px-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-600 text-center mt-6">No chats yet.</p>
        ) : (
          sessions.map(session => (
            <SessionItem
              key={session.session_id}
              session={session}
              isActive={session.session_id === activeSessionId}
              onSelect={() => onSelectSession(session.session_id)}
              onDelete={() => onDeleteSession(session.session_id)}
            />
          ))
        )}
      </div>

      {/* User row */}
      <div className="shrink-0 border-t border-slate-800 px-3 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
          {initials}
        </div>
        <span className="flex-1 text-sm text-slate-400 truncate">{displayName}</span>
        <button
          onClick={() => signOut()}
          className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors"
          title="Log out"
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  )
}
