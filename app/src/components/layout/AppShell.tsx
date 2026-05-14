import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  UserCog, Shield, Star, Map, History, Trophy, Library,
  Menu, X, LogOut, Sun, Moon, Zap, ChevronRight,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn, initials } from '@/lib/utils'

const STAFF_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'designers', label: 'Designers', icon: Users },
  { id: 'trainings', label: 'Trainings', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'teams', label: 'Teams', icon: UserCog },
  { id: 'skillset', label: 'Skill Set', icon: Star },
  { id: 'hub', label: 'Hub', icon: Library },
  { id: 'users', label: 'User Mgmt', icon: Shield },
]

const DESIGNER_TABS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'history', label: 'History', icon: History },
  { id: 'badges', label: 'Badges', icon: Trophy },
  { id: 'hub', label: 'Hub', icon: Library },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('pt-th')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('pt-th', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(v => !v)] as const
}

interface AppShellProps { children: React.ReactNode }

export default function AppShell({ children }: AppShellProps) {
  const { state, dispatch, signOut, tabHidden } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, toggleDark] = useDarkMode()

  const tabs = state.role === 'designer' ? DESIGNER_TABS : STAFF_TABS
  const visibleTabs = tabs.filter(t => !tabHidden(t.id))

  function navigate(page: string) {
    dispatch({ type: 'SET_PAGE', payload: page })
    setSidebarOpen(false)
  }

  const designer = state.designer
  const displayName = designer?.name ?? state.user?.email ?? 'User'
  const roleLabel = state.role === 'admin' ? 'Admin'
    : state.role === 'trainer' ? 'Trainer'
      : state.role === 'staff' ? 'Staff'
        : 'Designer'

  return (
    <div className="flex h-dvh bg-app">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-60 border-r shrink-0"
        style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}>
        <SidebarContent
          tabs={visibleTabs}
          page={state.page}
          navigate={navigate}
          dark={dark}
          toggleDark={toggleDark}
          displayName={displayName}
          roleLabel={roleLabel}
          signOut={signOut}
        />
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 md:hidden flex flex-col border-r"
              style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}
            >
              <SidebarContent
                tabs={visibleTabs}
                page={state.page}
                navigate={navigate}
                dark={dark}
                toggleDark={toggleDark}
                displayName={displayName}
                roleLabel={roleLabel}
                signOut={signOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg btn-ghost">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-orange-gradient flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-display font-bold text-sm text-primary">PT Tracker</span>
          </div>
          <button onClick={toggleDark} className="p-1.5 rounded-lg btn-ghost">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden flex border-t shrink-0"
          style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}>
          {visibleTabs.slice(0, 5).map(tab => {
            const Icon = tab.icon
            const active = state.page === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
                  active ? 'text-orange-500' : 'text-muted-c',
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'text-orange-500')} />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  tabs: typeof STAFF_TABS
  page: string
  navigate: (p: string) => void
  dark: boolean
  toggleDark: () => void
  displayName: string
  roleLabel: string
  signOut: () => void
  onClose?: () => void
}

function SidebarContent({
  tabs, page, navigate, dark, toggleDark, displayName, roleLabel, signOut, onClose,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-primary leading-none">PT Tracker</div>
            <div className="text-[10px] text-muted-c mt-0.5">Command Center</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg btn-ghost text-muted-c">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-c px-3 pb-2 pt-1">
          Navigation
        </div>
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = page === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={cn('nav-item w-full text-left', active && 'active')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{tab.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgb(var(--border))' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          {dark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-blue-400" />}
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User avatar + sign out */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
          style={{ background: 'rgb(var(--bg-subtle))' }}>
          <div className="w-8 h-8 rounded-full bg-orange-gradient flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {initials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-primary truncate">{displayName}</div>
            <div className="text-[10px] text-muted-c">{roleLabel}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-1.5 rounded-lg transition-colors hover:text-red-400 text-muted-c"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
