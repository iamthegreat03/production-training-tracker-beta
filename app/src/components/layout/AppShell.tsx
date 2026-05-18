import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  UserCog, Shield, Star, Map, History, Trophy, Library, Building2,
  X, LogOut, Sun, Moon, ChevronRight, Settings, MoreHorizontal,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn, initials } from '@/lib/utils'
import SettingsPanel, { useGlassBlur, applyStoredGlassBlur, useBgOpacity, applyStoredBgOpacity } from './SettingsPanel'

const STAFF_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'designers', label: 'Designers', icon: Users },
  { id: 'trainings', label: 'Trainings', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'teams', label: 'Teams', icon: UserCog },
  { id: 'skillset', label: 'Skill Set', icon: Star },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'hub', label: 'Hub', icon: Library },
  { id: 'crossdept', label: 'Cross-Dept', icon: Building2 },
  { id: 'users', label: 'User Mgmt', icon: Shield },
]

const DESIGNER_TABS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'history', label: 'History', icon: History },
  { id: 'badges', label: 'Badges', icon: Star },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
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
  const [dark, toggleDark] = useDarkMode()
  const [blur, setBlur] = useGlassBlur()
  const [bgOpacity, setBgOpacity] = useBgOpacity()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => { applyStoredGlassBlur(); applyStoredBgOpacity() }, [])

  const tabs = state.role === 'designer' ? DESIGNER_TABS : STAFF_TABS
  const visibleTabs = tabs.filter(t => !tabHidden(t.id))

  const PRIMARY_COUNT = 4
  const hasNavOverflow = visibleTabs.length > PRIMARY_COUNT
  const overflowNavTabs = hasNavOverflow ? visibleTabs.slice(PRIMARY_COUNT) : []
  const activeInOverflow = hasNavOverflow && overflowNavTabs.some(t => t.id === state.page)
  const displayedNavTabs = activeInOverflow
    ? [...visibleTabs.slice(0, PRIMARY_COUNT - 1), visibleTabs.find(t => t.id === state.page)!]
    : visibleTabs.slice(0, PRIMARY_COUNT)

  function navigate(page: string) {
    dispatch({ type: 'SET_PAGE', payload: page })
  }

  const designer = state.designer
  const displayName = designer?.name ?? state.user?.email ?? 'User'
  const roleLabel = state.role === 'admin' ? 'Admin'
    : state.role === 'trainer' ? 'Trainer'
      : state.role === 'staff' ? 'Staff'
        : 'Designer'

  return (
    <div className="flex h-dvh bg-app relative overflow-hidden">
      {/* ── Global background ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 'var(--bg-opacity, 1)' }}>
        <div className="absolute inset-0 dark:bg-grid-dark bg-grid-light" />
        <div
          className="absolute -top-10 -left-10 w-[600px] h-[500px]"
          style={{ background: 'radial-gradient(ellipse at 10% 10%, rgba(249,115,22,0.28) 0%, rgba(249,115,22,0.08) 45%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(249,115,22,0.15) 0%, transparent 60%)' }}
        />
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-60 border-r shrink-0 relative z-10 glass"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <SidebarContent
          tabs={visibleTabs}
          page={state.page}
          navigate={navigate}
          dark={dark}
          toggleDark={toggleDark}
          displayName={displayName}
          roleLabel={roleLabel}
          signOut={signOut}
          onSettings={() => setSettingsOpen(v => !v)}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 mobile-bar"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5">
            <img src="/rs-logo.png" alt="RS" className="w-7 h-7 rounded-full shrink-0" />
            <span className="font-display font-bold text-sm text-primary">Rockstar Tracker</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark} className="p-1.5 rounded-lg btn-ghost">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setSettingsOpen(v => !v)} className="p-1.5 rounded-lg btn-ghost text-muted-c hover:text-orange-400 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="p-1.5 rounded-lg btn-ghost text-muted-c hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
        <nav className="md:hidden flex border-t shrink-0 mobile-bar px-2"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {displayedNavTabs.map(tab => {
            const Icon = tab.icon
            const active = state.page === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { navigate(tab.id); setMoreOpen(false) }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors',
                  active ? 'text-orange-500' : 'text-muted-c',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[8px] font-medium whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
          {hasNavOverflow && (
            <button
              onClick={() => setMoreOpen(v => !v)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors',
                (moreOpen || activeInOverflow) ? 'text-orange-500' : 'text-muted-c',
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[8px] font-medium">More</span>
            </button>
          )}
        </nav>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        blur={blur}
        setBlur={setBlur}
        bgOpacity={bgOpacity}
        setBgOpacity={setBgOpacity}
      />

      {/* More drawer (mobile) */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-bar rounded-t-2xl border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="px-4 pt-3 pb-8">
                <div className="w-8 h-1 rounded-full bg-border mx-auto mb-4" />
                <div className="grid grid-cols-4 gap-2">
                  {visibleTabs.map(tab => {
                    const Icon = tab.icon
                    const active = state.page === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { navigate(tab.id); setMoreOpen(false) }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                          active
                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                            : 'border-border bg-surface-2 text-muted-c',
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[9px] font-semibold leading-tight text-center">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  onSettings?: () => void
}

function SidebarContent({
  tabs, page, navigate, dark, toggleDark, displayName, roleLabel, signOut, onClose, onSettings,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/rs-logo.png" alt="RS" className="w-8 h-8 rounded-full shrink-0" />
          <div>
            <div className="font-display font-bold text-sm text-primary leading-none">Rockstar</div>
            <div className="text-[10px] text-muted-c mt-0.5">Training Tracker</div>
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
      <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {/* Theme + Settings row */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: 'rgb(var(--text-secondary))' }}
          >
            {dark
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-blue-400" />}
            <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg transition-colors text-muted-c hover:text-orange-400 hover:bg-orange-500/10"
              title="Appearance settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User avatar + sign out */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
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
