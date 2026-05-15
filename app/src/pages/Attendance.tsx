import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, CheckCircle2, XCircle, Clock, Plus,
  Users, Pencil, X, LayoutGrid, Table2, List, BarChart2,
  AlertTriangle, CalendarClock,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, fmtDs, normAtt, pct } from '@/lib/utils'
import type { Attendance, AttendanceValue, Designer } from '@/types/database'
import { toast } from 'sonner'
import AttendanceCard from '@/components/attendance/AttendanceCard'
import MatrixView from '@/components/attendance/MatrixView'
import RosterView from '@/components/attendance/RosterView'
import StatsView from '@/components/attendance/StatsView'
import AddSessionModal from '@/components/attendance/AddSessionModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

type AttLayout = 'cards' | 'matrix' | 'roster' | 'stats'

// Week helpers
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday
  d.setHours(0, 0, 0, 0)
  return d
}
function isSessionWeekOver(sessionDate: string): boolean {
  return getWeekStart(new Date(sessionDate + 'T00:00:00')) < getWeekStart(new Date())
}
function getSessionWeekBounds(sessionDate: string): { min: string; max: string } {
  const start = getWeekStart(new Date(sessionDate + 'T00:00:00'))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { min: fmt(start), max: fmt(end) }
}

const LAYOUTS: { id: AttLayout; icon: any; title: string }[] = [
  { id: 'cards',  icon: LayoutGrid, title: 'Cards'  },
  { id: 'matrix', icon: Table2,     title: 'Matrix' },
  { id: 'roster', icon: List,       title: 'Roster' },
  { id: 'stats',  icon: BarChart2,  title: 'Stats'  },
]

export default function AttendancePage() {
  const { state, loadAll, dispatch, can } = useApp()
  const { trainings, sessions, attendance, designers, enrollments } = state

  const [layout, setLayout] = useState<AttLayout>('cards')
  const [selTId, setSelTId] = useState<string | null>(null)
  const [selSId, setSelSId] = useState<string | null>(null)
  const [attFilter, setAttFilter] = useState<AttendanceValue | 'all' | 'unmarked'>('all')
  const [search, setSearch] = useState('')
  const [showAddSession, setShowAddSession] = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicText, setTopicText] = useState('')

  // Notes modal state (shared between cards and roster)
  const [notesTarget, setNotesTarget] = useState<Designer | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Designer | null>(null)
  const [makeupDate, setMakeupDate] = useState('')
  const [savingMakeup, setSavingMakeup] = useState(false)

  const [optimistic, setOptimistic] = useState<Record<string, AttendanceValue>>({})
  const [pendingOverdueDes, setPendingOverdueDes] = useState<Designer[] | null>(null)
  const [pendingMarkAllValue, setPendingMarkAllValue] = useState<AttendanceValue | null>(null)

  // Drag-to-scroll on session selector
  const sessionScrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ active: false, x: 0, sl: 0, dragged: false })

  function onSessionMouseDown(e: React.MouseEvent) {
    const el = sessionScrollRef.current; if (!el) return
    dragState.current = { active: true, x: e.clientX, sl: el.scrollLeft, dragged: false }
  }
  function onSessionMouseMove(e: React.MouseEvent) {
    if (!dragState.current.active || !sessionScrollRef.current) return
    const dx = e.clientX - dragState.current.x
    if (Math.abs(dx) < 5) return
    dragState.current.dragged = true
    sessionScrollRef.current.scrollLeft = dragState.current.sl - dx
  }
  function onSessionMouseUp() { dragState.current.active = false }

  const activeTrainings = useMemo(() =>
    trainings.filter(t => t.status !== 'completed'),
  [trainings])

  const selT = useMemo(() =>
    trainings.find(t => t.id === selTId),
  [trainings, selTId])

  const tSessions = useMemo(() =>
    sessions.filter(s => s.training_id === selTId)
      .sort((a, b) => a.session_date.localeCompare(b.session_date)),
  [sessions, selTId])

  const selS = useMemo(() =>
    sessions.find(s => s.id === selSId),
  [sessions, selSId])

  // All enrolled designers for this training (used by matrix/stats)
  const enrolledDesigners = useMemo(() => {
    const ids = new Set(enrollments.filter(e => e.training_id === selTId).map(e => e.designer_id))
    return designers.filter(d => ids.has(d.id))
  }, [designers, enrollments, selTId])

  useEffect(() => {
    if (tSessions.length > 0 && !tSessions.find(s => s.id === selSId)) {
      setSelSId(tSessions[tSessions.length - 1].id)
    }
  }, [tSessions])

  function getVal(sessionId: string, designerId: string): AttendanceValue {
    const key = `${sessionId}_${designerId}`
    if (key in optimistic) return optimistic[key]
    const rec = attendance.find(a => a.session_id === sessionId && a.designer_id === designerId)
    return normAtt(rec?.is_present)
  }

  function patchAttendance(saved: Attendance, existing: Attendance | undefined) {
    const updated = existing
      ? attendance.map(a => a.id === existing.id ? saved : a)
      : [...attendance, saved]
    dispatch({ type: 'SET_DATA', payload: { attendance: updated } })
  }

  function getScheduledSessionIds(designerId: string): Set<string> {
    const enrollment = enrollments.find(e => e.training_id === selTId && e.designer_id === designerId)
    const sched = enrollment?.designer_schedule ?? []
    if (sched.length === 0) return new Set(tSessions.map(s => s.id))
    return new Set(
      tSessions.filter(s => selT?.type === 'Hands-On'
        ? sched.includes(s.day_of_week ?? '')
        : sched.includes(s.session_date)
      ).map(s => s.id)
    )
  }

  const visibleDesigners = useMemo(() => {
    if (!selTId || !selSId || !selS) return []
    const enrolledIds = new Set(enrollments.filter(e => e.training_id === selTId).map(e => e.designer_id))
    let list = designers.filter(d => enrolledIds.has(d.id))
    list = list.filter(d => {
      const enrollment = enrollments.find(e => e.training_id === selTId && e.designer_id === d.id)
      if (!enrollment) return false
      const sched = enrollment.designer_schedule ?? []
      if (sched.length === 0) return true
      return selT?.type === 'Hands-On'
        ? sched.includes(selS.day_of_week ?? '')
        : sched.includes(selS.session_date)
    })
    if (attFilter !== 'all') {
      list = list.filter(d => {
        const val = getVal(selSId, d.id)
        return attFilter === 'unmarked' ? val === null : val === attFilter
      })
    }
    if (search) list = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [designers, enrollments, selTId, selSId, selS, attFilter, search, selT, attendance, optimistic])

  const sessionStats = useMemo(() => {
    if (!selSId) return null
    const enrolledIds = enrollments.filter(e => e.training_id === selTId).map(e => e.designer_id).filter(Boolean) as string[]
    let present = 0, late = 0, absent = 0, unmarked = 0
    enrolledIds.forEach(did => {
      const val = getVal(selSId, did)
      if (val === 'true') present++
      else if (val === 'late') late++
      else if (val === 'false') absent++
      else unmarked++
    })
    return { present, late, absent, unmarked, total: enrolledIds.length, rate: pct(present + late, present + late + absent) }
  }, [attendance, optimistic, selSId, selTId, enrollments])

  // Week-based reschedule flags for the selected session
  const sessionIsOverdue = selS ? isSessionWeekOver(selS.session_date) : false
  const sessionCanReschedule = selS ? !isSessionWeekOver(selS.session_date) && new Date(selS.session_date + 'T00:00:00') < new Date() : false

  const overdueCount = useMemo(() => {
    if (!selSId || !selS || !sessionIsOverdue) return 0
    const enrolledIds = new Set(enrollments.filter(e => e.training_id === selTId).map(e => e.designer_id))
    return designers.filter(d => enrolledIds.has(d.id) && getVal(selSId, d.id) === null).length
  }, [selSId, selS, sessionIsOverdue, designers, enrollments, selTId, attendance, optimistic])

  function openRescheduleModal(d: Designer) {
    if (!selS) return
    const bounds = getSessionWeekBounds(selS.session_date)
    const today = new Date().toISOString().split('T')[0]
    setMakeupDate(today >= bounds.min && today <= bounds.max ? today : bounds.min)
    setRescheduleTarget(d)
  }

  async function saveReschedule() {
    if (!rescheduleTarget || !makeupDate || !selT || !selSId) return
    setSavingMakeup(true)
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const { error } = await supabase.from('makeup_sessions').insert({
      designer_id: rescheduleTarget.id,
      training_id: selT.id,
      original_session_id: selSId,
      makeup_date: makeupDate,
      day_of_week: days[new Date(makeupDate + 'T00:00:00').getDay()],
      is_attended: null,
    })
    setSavingMakeup(false)
    if (error) { toast.error('Failed to schedule makeup'); return }
    toast.success(`Makeup scheduled for ${fmtDs(makeupDate)}`)
    setRescheduleTarget(null)
    await loadAll()
  }

  function markOverdueAbsent() {
    if (!selSId || !sessionIsOverdue) return
    const enrolledIds = new Set(enrollments.filter(e => e.training_id === selTId).map(e => e.designer_id))
    const overdueDes = designers.filter(d => enrolledIds.has(d.id) && getVal(selSId, d.id) === null)
    if (overdueDes.length === 0) return
    setPendingOverdueDes(overdueDes)
  }

  async function confirmMarkOverdueAbsent() {
    const overdueDes = pendingOverdueDes
    if (!overdueDes || !selSId) return
    setPendingOverdueDes(null)
    setOptimistic(prev => {
      const next = { ...prev }
      overdueDes.forEach(d => { next[`${selSId}_${d.id}`] = 'false' })
      return next
    })
    const results = await Promise.all(overdueDes.map(d => {
      const existing = attendance.find(a => a.session_id === selSId && a.designer_id === d.id)
      const payload = { session_id: selSId, designer_id: d.id, is_present: 'false', marked_at: new Date().toISOString() }
      return existing
        ? supabase.from('attendance').update(payload).eq('id', existing.id).select().single()
        : supabase.from('attendance').insert(payload).select().single()
    }))
    const failed = results.filter(r => r.error).length
    const saved = results.filter(r => !r.error).map(r => r.data as Attendance)
    if (failed) toast.error(`${failed} records failed`)
    else toast.success(`${overdueDes.length} designer(s) marked absent`)
    if (saved.length) {
      const ids = new Set(overdueDes.map(d => d.id))
      const base = attendance.filter(a => !(a.session_id === selSId && ids.has(a.designer_id ?? '')))
      dispatch({ type: 'SET_DATA', payload: { attendance: [...base, ...saved] } })
    }
    setOptimistic(prev => {
      const n = { ...prev }
      overdueDes.forEach(d => delete n[`${selSId}_${d.id}`])
      return n
    })
  }

  // mark accepts optional sessionId for matrix view
  async function mark(designerId: string, value: AttendanceValue, sessionId?: string) {
    const sid = sessionId ?? selSId
    if (!sid) return
    const key = `${sid}_${designerId}`
    setOptimistic(prev => ({ ...prev, [key]: value }))
    const existing = attendance.find(a => a.session_id === sid && a.designer_id === designerId)
    const payload = { session_id: sid, designer_id: designerId, is_present: value, marked_at: new Date().toISOString() }
    const { data: saved, error } = existing
      ? await supabase.from('attendance').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('attendance').insert(payload).select().single()
    if (error) {
      toast.error('Failed to save attendance')
      setOptimistic(prev => { const n = { ...prev }; delete n[key]; return n })
      return
    }
    patchAttendance(saved as Attendance, existing)
    setOptimistic(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  async function updateNotes(designerId: string, note: string) {
    if (!selSId) return
    const existing = attendance.find(a => a.session_id === selSId && a.designer_id === designerId)
    const noteVal = note.trim() || null
    if (existing) {
      const { data: saved, error } = await supabase.from('attendance').update({ notes: noteVal }).eq('id', existing.id).select().single()
      if (error) { toast.error('Failed to save notes'); return }
      patchAttendance(saved as Attendance, existing)
    } else {
      const { data: saved, error } = await supabase.from('attendance')
        .insert({ session_id: selSId, designer_id: designerId, is_present: null, notes: noteVal, marked_at: new Date().toISOString() })
        .select().single()
      if (error) { toast.error('Failed to save notes'); return }
      patchAttendance(saved as Attendance, undefined)
    }
    toast.success('Notes saved')
  }

  function openNotesModal(d: Designer) {
    const notes = selSId ? (attendance.find(a => a.session_id === selSId && a.designer_id === d.id)?.notes ?? '') : ''
    setNoteText(notes)
    setNotesTarget(d)
  }

  async function handleSaveNotes() {
    if (!notesTarget) return
    setSavingNote(true)
    await updateNotes(notesTarget.id, noteText)
    setSavingNote(false)
    setNotesTarget(null)
  }

  function markAll(value: AttendanceValue) {
    if (!selSId || visibleDesigners.length === 0) return
    setPendingMarkAllValue(value)
  }

  async function confirmMarkAll() {
    const value = pendingMarkAllValue
    if (!selSId || !value || visibleDesigners.length === 0) return
    const label = value === 'true' ? 'PRESENT' : 'ABSENT'
    setPendingMarkAllValue(null)
    setOptimistic(prev => {
      const next = { ...prev }
      visibleDesigners.forEach(d => { next[`${selSId}_${d.id}`] = value })
      return next
    })
    const results = await Promise.all(
      visibleDesigners.map(d => {
        const existing = attendance.find(a => a.session_id === selSId && a.designer_id === d.id)
        const payload = { session_id: selSId, designer_id: d.id, is_present: value, marked_at: new Date().toISOString() }
        return existing
          ? supabase.from('attendance').update(payload).eq('id', existing.id).select().single()
          : supabase.from('attendance').insert(payload).select().single()
      })
    )
    const failed = results.filter(r => r.error).length
    const saved = results.filter(r => !r.error).map(r => r.data as Attendance)
    if (failed > 0) toast.error(`${failed} records failed to save`)
    else toast.success(`${visibleDesigners.length} designers marked ${label.toLowerCase()}`)
    if (saved.length > 0) {
      const affectedDesIds = new Set(visibleDesigners.map(d => d.id))
      const base = attendance.filter(a => !(a.session_id === selSId && affectedDesIds.has(a.designer_id ?? '')))
      dispatch({ type: 'SET_DATA', payload: { attendance: [...base, ...saved] } })
    }
    setOptimistic(prev => {
      const n = { ...prev }
      visibleDesigners.forEach(d => delete n[`${selSId}_${d.id}`])
      return n
    })
  }

  async function saveTopic() {
    if (!selSId) return
    const { error } = await supabase.from('training_sessions').update({ notes: topicText.trim() || null }).eq('id', selSId)
    if (error) { toast.error('Failed to save topic'); return }
    dispatch({ type: 'SET_DATA', payload: { sessions: sessions.map(s => s.id === selSId ? { ...s, notes: topicText.trim() || null } : s) } })
    setEditingTopic(false)
    toast.success(selT?.type === 'Discussion' ? 'Topic saved' : 'Session notes saved')
  }

  const showSessionSelector = layout === 'cards' || layout === 'roster'

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="page-header shrink-0">
        <h1 className="page-title font-display">Attendance</h1>
        <p className="page-subtitle">Track participation for active programs</p>
      </div>

      {/* Training chips + layout toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {activeTrainings.length === 0 && <p className="text-sm text-muted-c">No active trainings.</p>}
          {activeTrainings.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelTId(t.id); setSelSId(null) }}
              className={cn(
                'chip h-10 px-4 whitespace-nowrap gap-2 flex-shrink-0',
                selTId === t.id && 'active border-orange-500/50 bg-orange-500/10'
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full', t.type === 'Hands-On' ? 'bg-orange-500' : 'bg-purple-500')} />
              <span className="font-medium">{t.name}</span>
            </button>
          ))}
        </div>

        {/* Layout toggle */}
        {selTId && (
          <div className="flex p-1 rounded-xl bg-surface-2 border border-border shrink-0">
            {LAYOUTS.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setLayout(id)}
                title={title}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  layout === id ? 'bg-surface shadow-sm text-orange-500' : 'text-muted-c hover:text-primary'
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selTId ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">

          {/* Session selector (cards + roster only) */}
          {showSessionSelector && (
            <div className="flex items-center gap-3 shrink-0">
              <div
                ref={sessionScrollRef}
                className="flex-1 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none"
                style={{ cursor: 'grab' }}
                onMouseDown={onSessionMouseDown}
                onMouseMove={onSessionMouseMove}
                onMouseUp={onSessionMouseUp}
                onMouseLeave={onSessionMouseUp}
              >
                {tSessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { if (dragState.current.dragged) return; setSelSId(s.id) }}
                    className={cn(
                      'flex flex-col items-center justify-center min-w-[60px] h-14 rounded-xl border transition-all',
                      selSId === s.id
                        ? 'bg-orange-gradient text-white border-orange-500 shadow-orange-sm'
                        : 'bg-surface-2 border-border text-muted-c hover:border-orange-500/30'
                    )}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-tighter opacity-80">{s.day_of_week?.slice(0, 3)}</span>
                    <span className="text-sm font-bold leading-tight">{fmtDs(s.session_date).split(' ')[1]}</span>
                    <span className="text-[8px] opacity-60">{fmtDs(s.session_date).split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddSession(true)}
                className="w-14 h-14 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-c hover:text-orange-500 hover:border-orange-500/40 transition-all shrink-0"
                title="Add session"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Session topic (cards + roster) */}
          {showSessionSelector && selSId && selS && (
            <div className="flex items-center gap-2 px-1 shrink-0 min-h-[28px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-c shrink-0">
                {selT?.type === 'Discussion' ? 'Topic' : 'Notes'}
              </span>
              {editingTopic ? (
                <div className="flex-1 flex gap-2">
                  <input
                    className="input h-8 flex-1 text-xs" value={topicText} autoFocus
                    onChange={e => setTopicText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTopic(); if (e.key === 'Escape') setEditingTopic(false) }}
                  />
                  <button className="btn-primary h-8 px-3 text-xs" onClick={saveTopic}>Save</button>
                  <button className="btn-ghost h-8 px-3 text-xs" onClick={() => setEditingTopic(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <span className="text-xs text-secondary flex-1 truncate">
                    {selS.notes || <span className="text-muted-c italic text-xs">No topic set</span>}
                  </span>
                  {can('canAddSessions') && (
                    <button className="p-1 text-muted-c hover:text-orange-500 transition-colors"
                      onClick={() => { setTopicText(selS.notes ?? ''); setEditingTopic(true) }}>
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Session stats (cards + roster) */}
          {showSessionSelector && selSId && sessionStats && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0"
            >
              {[
                { label: 'Present',  value: sessionStats.present,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Late',     value: sessionStats.late,     color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Absent',   value: sessionStats.absent,   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
                { label: 'Unmarked', value: sessionStats.unmarked, color: 'text-muted-c',     bg: 'bg-surface-2 border-border' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-xl border p-3 text-center backdrop-blur-[2px]', s.bg)}>
                  <div className={cn('text-lg font-bold font-display leading-none', s.color)}><AnimatedNumber value={s.value} /></div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-c mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Overdue banner */}
          {showSessionSelector && selSId && sessionIsOverdue && overdueCount > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-500/20 shrink-0" style={{ background: 'rgba(245,158,11,0.08)', backdropFilter: 'blur(var(--glass-blur-strong-px))', WebkitBackdropFilter: 'blur(var(--glass-blur-strong-px))' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-amber-400">
                  {overdueCount} designer{overdueCount !== 1 ? 's' : ''} still unmarked — session week has ended
                </span>
              </div>
              <button
                onClick={markOverdueAbsent}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 whitespace-nowrap transition-colors"
              >
                Mark all absent
              </button>
            </div>
          )}

          {/* Cards view filter bar */}
          {layout === 'cards' && (
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex p-1 rounded-xl bg-surface-2 border border-border">
                {[
                  { id: 'all', label: 'All', icon: Filter, color: '' },
                  { id: 'true', label: 'Present', icon: CheckCircle2, color: 'text-emerald-400' },
                  { id: 'false', label: 'Absent', icon: XCircle, color: 'text-red-400' },
                  { id: 'unmarked', label: 'Unmarked', icon: Clock, color: 'text-amber-400' },
                ].map(f => {
                  const Icon = f.icon
                  const active = attFilter === f.id
                  return (
                    <button key={f.id} onClick={() => setAttFilter(f.id as typeof attFilter)}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        active ? 'bg-surface shadow-sm text-primary' : 'text-muted-c hover:text-secondary')}>
                      <Icon className={cn('w-3.5 h-3.5', active ? f.color : 'opacity-40')} />
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-c z-10" />
                  <input className="input h-9 w-28 sm:w-36 pl-9 text-xs" placeholder="Search…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="hidden sm:block h-8 w-px bg-border" />
                <button onClick={() => markAll('true')}
                  className="btn-outline h-9 px-3 text-[10px] uppercase tracking-widest font-bold text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/5">
                  All Present
                </button>
                <button onClick={() => markAll('false')}
                  className="btn-outline h-9 px-3 text-[10px] uppercase tracking-widest font-bold text-red-400 border-red-500/20 hover:bg-red-500/5">
                  All Absent
                </button>
              </div>
            </div>
          )}

          {/* ── Views ── */}
          <AnimatePresence mode="wait">
            {layout === 'cards' && (
              <motion.div key="cards" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }} className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleDesigners.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-muted-c border border-dashed border-border rounded-2xl bg-surface-2/50">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No designers match the current filters.</p>
                    </div>
                  ) : (
                    visibleDesigners.map((d, i) => {
                      const key = `${selSId}_${d.id}`
                      const optVal = key in optimistic ? optimistic[key] : undefined
                      const dbAtt = attendance.find(a => a.session_id === selSId && a.designer_id === d.id)
                      const effectiveAtt = optVal !== undefined
                        ? { id: dbAtt?.id ?? '', session_id: selSId!, designer_id: d.id, is_present: optVal, notes: dbAtt?.notes ?? null, marked_at: dbAtt?.marked_at ?? null } satisfies Attendance
                        : dbAtt ?? null
                      const fullAtt = attendance.filter(a => a.designer_id === d.id && tSessions.some(ts => ts.id === a.session_id))
                      const fullAttWithOptimistic = tSessions.map(s => {
                        const k = `${s.id}_${d.id}`
                        const ov = k in optimistic ? optimistic[k] : undefined
                        const db = fullAtt.find(a => a.session_id === s.id)
                        if (ov !== undefined) return { id: db?.id ?? '', session_id: s.id, designer_id: d.id, is_present: ov, notes: null, marked_at: null } satisfies Attendance
                        return db ?? null
                      }).filter(Boolean) as Attendance[]
                      return (
                        <AttendanceCard
                          key={d.id}
                          designer={d}
                          attendance={effectiveAtt}
                          allAttendance={fullAttWithOptimistic}
                          sessions={tSessions}
                          scheduledSessionIds={getScheduledSessionIds(d.id)}
                          onMark={v => mark(d.id, v)}
                          onSaveNotes={note => updateNotes(d.id, note)}
                          onReschedule={() => openRescheduleModal(d)}
                          canReschedule={sessionCanReschedule}
                          isOverdue={sessionIsOverdue}
                          index={i}
                        />
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}

            {layout === 'matrix' && (
              <motion.div key="matrix" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }} className="flex-1 min-h-0 flex flex-col card glass rounded-2xl overflow-hidden">
                <MatrixView
                  designers={enrolledDesigners}
                  sessions={tSessions}
                  attendance={attendance}
                  optimistic={optimistic}
                  training={selT!}
                  enrollments={enrollments}
                  onMark={mark}
                />
              </motion.div>
            )}

            {layout === 'roster' && (
              <motion.div key="roster" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }} className="flex-1 min-h-0 flex flex-col">
                <RosterView
                  designers={visibleDesigners}
                  sessions={tSessions}
                  attendance={attendance}
                  optimistic={optimistic}
                  selSId={selSId}
                  onMark={(designerId, value) => mark(designerId, value)}
                  onOpenNotes={openNotesModal}
                  onReschedule={openRescheduleModal}
                  canReschedule={sessionCanReschedule}
                  isOverdue={sessionIsOverdue}
                />
              </motion.div>
            )}

            {layout === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }} className="flex-1 min-h-0 flex flex-col">
                <StatsView
                  designers={enrolledDesigners}
                  sessions={tSessions}
                  attendance={attendance}
                  training={selT!}
                  enrollments={enrollments}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center card border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-orange-gradient flex items-center justify-center glow-orange-md mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-xl text-primary">No Training Selected</h2>
          <p className="text-sm text-muted-c mt-2 max-w-sm">Select an active training above to start tracking attendance.</p>
        </div>
      )}

      {/* Shared Notes Modal */}
      <AnimatePresence>
        {notesTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setNotesTarget(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
              className="modal-glass rounded-2xl w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-primary">{notesTarget.name}</h3>
                  <p className="text-xs text-muted-c mt-0.5">Output / Progress Notes</p>
                </div>
                <button onClick={() => setNotesTarget(null)} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                className="input resize-none w-full"
                rows={4}
                placeholder="What did this designer work on or produce this session?"
                value={noteText} onChange={e => setNoteText(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setNotesTarget(null)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleSaveNotes} disabled={savingNote}>
                  {savingNote ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleTarget && selS && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setRescheduleTarget(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
              className="modal-glass rounded-2xl w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-purple-400" />
                    <h3 className="font-display font-semibold text-primary">Reschedule Makeup</h3>
                  </div>
                  <p className="text-xs text-muted-c mt-0.5">{rescheduleTarget.name}</p>
                </div>
                <button onClick={() => setRescheduleTarget(null)} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-c">
                  Makeup Date <span className="normal-case text-purple-400">(within this week only)</span>
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={makeupDate}
                  min={getSessionWeekBounds(selS.session_date).min}
                  max={getSessionWeekBounds(selS.session_date).max}
                  onChange={e => setMakeupDate(e.target.value)}
                />
                <p className="text-[10px] text-muted-c">
                  Week: {fmtDs(getSessionWeekBounds(selS.session_date).min)} – {fmtDs(getSessionWeekBounds(selS.session_date).max)}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setRescheduleTarget(null)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
                  onClick={saveReschedule}
                  disabled={savingMakeup || !makeupDate}
                >
                  {savingMakeup ? 'Scheduling…' : 'Schedule Makeup'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark Overdue Absent Confirm */}
      <AnimatePresence>
        {pendingOverdueDes && (
          <ConfirmModal
            title="Mark Overdue as Absent"
            message={<><span className="font-semibold text-primary">{pendingOverdueDes.length} designer{pendingOverdueDes.length !== 1 ? 's' : ''}</span> are still unmarked and the session week has ended. Mark them all as absent?</>}
            confirmLabel="Mark Absent"
            onConfirm={confirmMarkOverdueAbsent}
            onCancel={() => setPendingOverdueDes(null)}
          />
        )}
      </AnimatePresence>

      {/* Mark All Confirm */}
      <AnimatePresence>
        {pendingMarkAllValue !== null && (
          <ConfirmModal
            title={pendingMarkAllValue === 'true' ? 'Mark All Present' : 'Mark All Absent'}
            message={<>Mark all <span className="font-semibold text-primary">{visibleDesigners.length} visible designer{visibleDesigners.length !== 1 ? 's' : ''}</span> as <span className="font-semibold text-primary">{pendingMarkAllValue === 'true' ? 'present' : 'absent'}</span>? This will overwrite any existing attendance for this session.</>}
            confirmLabel={pendingMarkAllValue === 'true' ? 'Mark All Present' : 'Mark All Absent'}
            onConfirm={confirmMarkAll}
            onCancel={() => setPendingMarkAllValue(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddSession && selT && (
          <AddSessionModal
            trainingId={selT.id}
            trainingName={selT.name}
            onClose={() => setShowAddSession(false)}
            onSaved={() => { loadAll(); setShowAddSession(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
