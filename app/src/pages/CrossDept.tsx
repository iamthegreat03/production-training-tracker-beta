import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Plus, Search, ChevronDown, Pencil, Trash2,
  Users, ExternalLink, CalendarDays, X, ClipboardList,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, fmtD, dayName } from '@/lib/utils'
import { toast } from 'sonner'
import type { ExtTraining, ExtSession, ExtTrainingStatus } from '@/types/database'
import ExtTrainingModal from '@/components/crossdept/ExtTrainingModal'
import ExtSessionModal from '@/components/crossdept/ExtSessionModal'
import ConfirmModal from '@/components/shared/ConfirmModal'

const STATUS_META: Record<ExtTrainingStatus, { badge: string; label: string }> = {
  requested:  { badge: 'badge-amber',   label: 'Requested'  },
  scheduled:  { badge: 'badge-blue',    label: 'Scheduled'  },
  completed:  { badge: 'badge-emerald', label: 'Completed'  },
  cancelled:  { badge: 'badge-slate',   label: 'Cancelled'  },
}

const DEPT_PALETTES = [
  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/25'  },
  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/25'  },
  { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25'    },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25'   },
]

function deptPalette(dept: string) {
  let h = 0
  for (const c of dept) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return DEPT_PALETTES[h % DEPT_PALETTES.length]
}

type TrainingModalState = { open: false } | { open: true; training: ExtTraining | null }
type SessionModalState  = { open: false } | { open: true; session: ExtSession | null; trainingId: string }

export default function CrossDept() {
  const { state, loadAll, can } = useApp()
  const { extTrainings, extSessions } = state

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExtTrainingStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [trainingModal, setTrainingModal] = useState<TrainingModalState>({ open: false })
  const [sessionModal, setSessionModal]   = useState<SessionModalState>({ open: false })
  const [deleteTraining, setDeleteTraining] = useState<ExtTraining | null>(null)
  const [deleteSession, setDeleteSession]   = useState<ExtSession | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManage = can('canAddEditTrainings')

  const totalAttendees = useMemo(() =>
    extSessions.reduce((sum, s) => sum + s.attendee_count, 0),
  [extSessions])

  const uniqueDepts = useMemo(() =>
    new Set(extTrainings.map(t => t.department)).size,
  [extTrainings])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: extTrainings.length }
    for (const t of extTrainings) c[t.status] = (c[t.status] ?? 0) + 1
    return c
  }, [extTrainings])

  const filtered = useMemo(() => {
    let list = [...extTrainings]
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        (t.topic ?? '').toLowerCase().includes(q) ||
        (t.requested_by ?? '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  }, [extTrainings, statusFilter, search])

  function sessionsFor(trainingId: string) {
    return extSessions
      .filter(s => s.training_id === trainingId)
      .sort((a, b) => b.session_date.localeCompare(a.session_date))
  }

  async function handleDeleteTraining() {
    if (!deleteTraining) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('ext_trainings').delete().eq('id', deleteTraining.id)
      if (error) toast.error(error.message)
      else { toast.success('Program removed'); await loadAll() }
      setDeleteTraining(null)
    } finally { setDeleting(false) }
  }

  async function handleDeleteSession() {
    if (!deleteSession) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('ext_sessions').delete().eq('id', deleteSession.id)
      if (error) toast.error(error.message)
      else { toast.success('Session removed'); await loadAll() }
      setDeleteSession(null)
    } finally { setDeleting(false) }
  }

  const isEmpty = extTrainings.length === 0

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Cross-Dept Training</h1>
          <p className="page-subtitle">
            Product knowledge sessions for other departments · {extTrainings.length} program{extTrainings.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setTrainingModal({ open: true, training: null })}>
            <Plus className="w-4 h-4" /> Add Program
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Programs',      value: extTrainings.length, icon: ClipboardList, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
          { label: 'Departments',   value: uniqueDepts,          icon: Building2,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
          { label: 'Sessions Held', value: extSessions.length,   icon: CalendarDays,  color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
          { label: 'Total Trained', value: totalAttendees,       icon: Users,         color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ] as const).map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="stat-label mb-1.5">{s.label}</div>
                  <div className="text-2xl font-bold text-primary">{s.value}</div>
                </div>
                <div className={cn('p-2 rounded-xl', s.bg)}>
                  <Icon className={cn('w-4 h-4', s.color)} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'requested', 'scheduled', 'completed', 'cancelled'] as const).map(s => {
          const active = statusFilter === s
          return (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border',
                active
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                  : 'bg-surface-2 text-muted-c border-border hover:text-primary'
              )}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
              <span className={cn('font-black', active ? 'opacity-70' : 'opacity-40')}>
                {statusCounts[s] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-c z-10" />
        <input
          type="text"
          placeholder="Search by title, department, or topic…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full pl-9 pr-9 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-c hover:text-primary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !search ? (
        <div className="flex flex-col items-center justify-center py-24 text-center card border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-gradient flex items-center justify-center glow-orange-md mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display font-bold text-xl text-primary">No programs yet</h2>
          <p className="text-sm text-muted-c mt-2 max-w-sm">
            {canManage
              ? 'Add your first cross-department training program.'
              : 'No cross-department training programs have been added yet.'}
          </p>
          {canManage && (
            <button className="btn-primary mt-6" onClick={() => setTrainingModal({ open: true, training: null })}>
              <Plus className="w-4 h-4" /> Add Program
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card rounded-2xl py-14 text-center border-dashed">
          <Search className="w-8 h-8 mx-auto mb-3 text-muted-c opacity-40" />
          <p className="text-sm font-bold text-primary">No results found</p>
          <p className="text-xs text-muted-c mt-1">Try a different keyword or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((training, i) => {
            const sessions = sessionsFor(training.id)
            const isExpanded = expandedId === training.id
            const palette = deptPalette(training.department)
            const lastSession = sessions[0]
            const totalAtt = sessions.reduce((s, e) => s + e.attendee_count, 0)

            return (
              <motion.div key={training.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 360, delay: Math.min(i * 0.04, 0.2) }}
                className="card rounded-2xl overflow-hidden group"
              >
                {/* Card header */}
                <div className="p-4 flex items-center gap-3">
                  {/* Dept color bar */}
                  <div className={cn('w-1 self-stretch rounded-full shrink-0', palette.bg, 'border', palette.border)} />

                  {/* Main info — clickable to expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : training.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest', palette.bg, palette.text)}>
                        {training.department}
                      </span>
                      <span className={cn('badge text-[9px] uppercase', STATUS_META[training.status].badge)}>
                        {STATUS_META[training.status].label}
                      </span>
                    </div>
                    <div className="font-bold text-primary text-sm leading-tight">{training.title}</div>
                    {training.topic && (
                      <div className="text-[10px] text-muted-c mt-0.5 truncate">{training.topic}</div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-muted-c">
                      {training.requested_by && (
                        <span>Requested by <span className="text-secondary font-medium">{training.requested_by}</span></span>
                      )}
                      {training.facilitator && (
                        <span>Led by <span className="text-secondary font-medium">{training.facilitator}</span></span>
                      )}
                      {lastSession && (
                        <span>Last session: <span className="text-secondary font-medium">{fmtD(lastSession.session_date)}</span></span>
                      )}
                    </div>
                  </button>

                  {/* Session + attendee counts */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 gap-2 text-right">
                    <div>
                      <div className="text-sm font-bold text-primary">{sessions.length}</div>
                      <div className="text-[9px] text-muted-c uppercase tracking-widest">Sessions</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">{totalAtt}</div>
                      <div className="text-[9px] text-muted-c uppercase tracking-widest">Trained</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {canManage && (
                      <>
                        <button
                          onClick={() => setTrainingModal({ open: true, training })}
                          className="p-2 rounded-xl hover:bg-orange-500/10 text-muted-c hover:text-orange-500 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTraining(training)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-muted-c hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : training.id)}
                      className="p-2 rounded-xl hover:bg-surface-2 text-muted-c transition-all"
                    >
                      <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-180')} />
                    </button>
                  </div>
                </div>

                {/* Expanded session history */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border">
                        {sessions.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-muted-c italic">
                            No sessions logged yet.
                          </p>
                        ) : (
                          sessions.map(s => (
                            <div key={s.id}
                              className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0 hover:bg-surface-2/40 group/sess transition-colors"
                            >
                              {/* Date */}
                              <div className="w-28 shrink-0">
                                <div className="text-xs font-bold text-primary">{fmtD(s.session_date)}</div>
                                <div className="text-[9px] text-muted-c uppercase">{dayName(s.session_date).slice(0, 3)}</div>
                              </div>

                              {/* Notes */}
                              <div className="flex-1 min-w-0">
                                {s.notes
                                  ? <p className="text-xs text-secondary truncate">{s.notes}</p>
                                  : <p className="text-xs text-muted-c italic">No notes</p>
                                }
                              </div>

                              {/* Attendees */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Users className="w-3 h-3 text-muted-c" />
                                <span className="text-xs font-bold text-primary">{s.attendee_count}</span>
                                <span className="text-[9px] text-muted-c hidden sm:inline">attendees</span>
                              </div>

                              {/* Proof link */}
                              {s.proof_url && (
                                <a href={s.proof_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 text-muted-c hover:text-blue-400 transition-colors shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Session actions */}
                              {canManage && (
                                <div className="flex gap-1 opacity-0 group-hover/sess:opacity-100 transition-opacity shrink-0">
                                  <button
                                    onClick={() => setSessionModal({ open: true, session: s, trainingId: training.id })}
                                    className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-c hover:text-orange-500 transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteSession(s)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-c hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {canManage && (
                          <div className="px-5 py-3 border-t border-border/50">
                            <button
                              onClick={() => setSessionModal({ open: true, session: null, trainingId: training.id })}
                              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Log Session
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {trainingModal.open && (
          <ExtTrainingModal
            training={trainingModal.training}
            onClose={() => setTrainingModal({ open: false })}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionModal.open && (
          <ExtSessionModal
            session={sessionModal.session}
            trainingId={sessionModal.open ? sessionModal.trainingId : ''}
            onClose={() => setSessionModal({ open: false })}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTraining && (
          <ConfirmModal
            title="Remove Training Program"
            message={<>Permanently delete <span className="font-semibold text-primary">"{deleteTraining.title}"</span>? All logged sessions will also be removed.</>}
            confirmLabel="Delete Program"
            danger
            loading={deleting}
            onConfirm={handleDeleteTraining}
            onCancel={() => setDeleteTraining(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteSession && (
          <ConfirmModal
            title="Remove Session"
            message={<>Remove the session on <span className="font-semibold text-primary">{fmtD(deleteSession.session_date)}</span>? This cannot be undone.</>}
            confirmLabel="Delete Session"
            danger
            loading={deleting}
            onConfirm={handleDeleteSession}
            onCancel={() => setDeleteSession(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
