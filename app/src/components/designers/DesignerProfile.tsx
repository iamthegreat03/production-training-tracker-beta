import { motion } from 'framer-motion'
import { X, Pencil, CalendarCheck, AlertCircle } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn, initials, pct, fmtD } from '@/lib/utils'
import type {
  Designer, Training, TrainingEnrollment,
  TrainingSession, Attendance,
} from '@/types/database'

interface Props {
  designer: Designer
  onClose: () => void
  onEdit: (d: Designer) => void
  trainings: Training[]
  enrollments: TrainingEnrollment[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  canEdit: boolean
}

const RANK_COLORS: Record<string, string> = {
  'Tier 1': 'badge-purple', 'Tier 2': 'badge-blue', 'Tier 3': 'badge-emerald',
}

function AttDot({ val, scheduled = true }: { val: string | null; scheduled?: boolean }) {
  if (!scheduled) return <div className="w-2 h-2 rounded-full bg-slate-400/[0.06]" title="Not scheduled" />
  if (val === 'true') return <div className="dot-present" title="Present" />
  if (val === 'late') return <div className="dot-late" title="Late" />
  if (val === 'false') return <div className="dot-absent" title="Absent" />
  return <div className="dot-blank" title="Unmarked" />
}

export default function DesignerProfile({ designer, onClose, onEdit, trainings, enrollments, sessions, attendance, canEdit }: Props) {
  const { state } = useApp()
  const { designerSkills } = state

  const myEnrollments = enrollments.filter(e => e.designer_id === designer.id)
  const myTrainingIds = new Set(myEnrollments.map(e => e.training_id))
  const myTrainings = trainings.filter(t => myTrainingIds.has(t.id))

  // Overall attendance
  const myAtt = attendance.filter(a => a.designer_id === designer.id)
  const myPresent = myAtt.filter(a => a.is_present === 'true' || a.is_present === 'late')
  const myMarked = myAtt.filter(a => a.is_present !== null)
  const overallRate = pct(myPresent.length, myMarked.length)

  // Absences
  const absences = myAtt.filter(a => a.is_present === 'false')
  const absenceSessions = absences.map(a => sessions.find(s => s.id === a.session_id)).filter(Boolean) as TrainingSession[]

  // Skills
  const mySkills = designerSkills.filter(s => s.designer_id === designer.id && !s.platform.startsWith('DSG:'))

  const standingColor = overallRate >= 80 ? 'text-emerald-400' : overallRate >= 60 ? 'text-amber-400' : 'text-red-400'
  const standingLabel = overallRate >= 80 ? 'Good Standing' : overallRate >= 60 ? 'At Risk' : 'Critical'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
             style={{ borderColor: 'rgb(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-gradient flex items-center justify-center text-white font-bold">
              {initials(designer.name)}
            </div>
            <div>
              <div className="font-display font-bold text-primary">{designer.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {designer.team && <span className="badge badge-orange text-[10px]">{designer.team}</span>}
                <span className={cn('badge text-[10px]', RANK_COLORS[designer.rank] ?? 'badge-slate')}>{designer.rank}</span>
                <span className={cn('text-[11px] font-semibold', standingColor)}>{standingLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button onClick={() => onEdit(designer)} className="p-1.5 rounded-lg text-muted-c hover:text-orange-500 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attendance', value: `${overallRate}%` },
              { label: 'Trainings', value: myTrainings.length },
              { label: 'Absences', value: absences.length },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                   style={{ background: 'rgb(var(--surface-2))' }}>
                <div className="font-display font-bold text-xl text-primary">{s.value}</div>
                <div className="text-[11px] text-muted-c mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-c">
              <span>Overall Attendance</span><span>{overallRate}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${overallRate}%` }} />
            </div>
          </div>

          {/* Skills */}
          {mySkills.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-c mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {mySkills.map(s => (
                  <span key={s.id} className="badge badge-amber text-[11px]">
                    {s.platform} · {s.level.slice(0, 3).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-training heatmaps */}
          {myTrainings.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-c mb-2">
                Training History
              </div>
              <div className="space-y-3">
                {myTrainings.map(tr => {
                  const trSessions = sessions.filter(s => s.training_id === tr.id)
                    .sort((a, b) => a.session_date.localeCompare(b.session_date))

                  // Compute which sessions this designer is scheduled for
                  const enrollment = enrollments.find(e => e.training_id === tr.id && e.designer_id === designer.id)
                  const sched = enrollment?.designer_schedule ?? []
                  const scheduledIds = new Set(
                    sched.length === 0
                      ? trSessions.map(s => s.id)
                      : trSessions.filter(s =>
                          tr.type === 'Hands-On'
                            ? sched.includes(s.day_of_week ?? '')
                            : sched.includes(s.session_date)
                        ).map(s => s.id)
                  )

                  const trDots = trSessions.map(s => ({
                    id: s.id,
                    val: attendance.find(a => a.session_id === s.id && a.designer_id === designer.id)?.is_present ?? null,
                    scheduled: scheduledIds.has(s.id),
                  }))
                  const trPresent = trDots.filter(d => d.scheduled && (d.val === 'true' || d.val === 'late')).length
                  const trMarked = trDots.filter(d => d.scheduled && d.val !== null).length
                  const trRate = pct(trPresent, trMarked)

                  return (
                    <div key={tr.id} className="p-3 rounded-xl" style={{ background: 'rgb(var(--surface-2))' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary truncate pr-2">{tr.name}</span>
                        <span className="text-xs font-bold text-orange-500 shrink-0">{trRate}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {trDots.map(d => <AttDot key={d.id} val={d.val} scheduled={d.scheduled} />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Absences */}
          {absenceSessions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-c">Absences</div>
              </div>
              <div className="space-y-1">
                {absenceSessions.map(s => {
                  const tr = trainings.find(t => t.id === s.training_id)
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg"
                         style={{ background: 'rgb(var(--surface-2))' }}>
                      <span className="text-primary">{tr?.name ?? '—'}</span>
                      <div className="flex items-center gap-1.5 text-muted-c">
                        <CalendarCheck className="w-3 h-3" />
                        {fmtD(s.session_date)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {designer.notes && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-c mb-1">Notes</div>
              <p className="text-sm text-secondary p-3 rounded-xl"
                 style={{ background: 'rgb(var(--surface-2))' }}>{designer.notes}</p>
            </div>
          )}

          {/* Email */}
          {designer.email && (
            <div className="text-xs text-muted-c flex items-center gap-1.5">
              <span>Email:</span>
              <a href={`mailto:${designer.email}`} className="text-orange-500 hover:underline">{designer.email}</a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
