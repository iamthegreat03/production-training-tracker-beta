import { motion } from 'framer-motion'
import { Check, Clock, X, Undo2, MessageSquare, CalendarClock, AlertTriangle } from 'lucide-react'
import { cn, initials, normAtt, pct } from '@/lib/utils'
import type { Designer, Attendance, TrainingSession, AttendanceValue } from '@/types/database'

interface Props {
  designers: Designer[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  optimistic: Record<string, AttendanceValue>
  selSId: string | null
  onMark: (designerId: string, value: AttendanceValue) => void
  onOpenNotes: (designer: Designer) => void
  onReschedule?: (designer: Designer) => void
  canReschedule?: boolean
  isOverdue?: boolean
}

export default function RosterView({
  designers, sessions, attendance, optimistic, selSId, onMark, onOpenNotes,
  onReschedule, canReschedule = false, isOverdue = false,
}: Props) {
  function getVal(designerId: string): AttendanceValue {
    if (!selSId) return null
    const key = `${selSId}_${designerId}`
    if (key in optimistic) return optimistic[key]
    const rec = attendance.find(a => a.session_id === selSId && a.designer_id === designerId)
    return normAtt(rec?.is_present)
  }

  function getRate(designerId: string): number {
    const mySessions = sessions
    const myAtt = mySessions.map(s => {
      const k = `${s.id}_${designerId}`
      if (k in optimistic) return optimistic[k]
      return normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === designerId)?.is_present)
    })
    const present = myAtt.filter(v => v === 'true' || v === 'late').length
    const marked = myAtt.filter(v => v !== null).length
    return pct(present, marked)
  }

  function getNotes(designerId: string): string | null {
    if (!selSId) return null
    return attendance.find(a => a.session_id === selSId && a.designer_id === designerId)?.notes ?? null
  }

  if (designers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-c text-sm">
        No designers scheduled for this session.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="card rounded-2xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Designer</th>
              <th className="hidden sm:table-cell">Team</th>
              <th>Rate</th>
              <th className="text-center">Mark</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {designers.map((d, i) => {
              const val = getVal(d.id)
              const rate = getRate(d.id)
              const notes = getNotes(d.id)
              return (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380, delay: Math.min(i * 0.03, 0.2) }}
                  className={cn(
                    'group',
                    val === 'true'  && 'bg-emerald-500/[0.02] border-l-2 border-l-emerald-500/40',
                    val === 'late'  && 'bg-amber-500/[0.02] border-l-2 border-l-amber-500/40',
                    val === 'false' && 'bg-red-500/[0.02] border-l-2 border-l-red-500/40',
                  )}
                >
                  {/* Designer */}
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {initials(d.name)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-primary leading-tight">{d.name}</div>
                        {notes && (
                          <div className="text-[9px] text-muted-c truncate max-w-[120px]" title={notes}>{notes}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Team */}
                  <td className="hidden sm:table-cell">
                    <span className="badge badge-orange text-[10px]">{d.team || 'Uncategorized'}</span>
                  </td>

                  {/* Rate */}
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'text-xs font-bold',
                        rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {rate}%
                      </span>
                      {val === null && isOverdue && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold uppercase tracking-widest text-amber-400">
                          <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Mark buttons */}
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onMark(d.id, 'true')}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border',
                          val === 'true'
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-surface-2 border-border text-muted-c hover:border-emerald-500/40 hover:text-emerald-500'
                        )}
                      >
                        <Check className="w-3 h-3" /> Present
                      </button>
                      <button
                        onClick={() => onMark(d.id, 'late')}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border',
                          val === 'late'
                            ? 'bg-amber-500 border-amber-400 text-white'
                            : 'bg-surface-2 border-border text-muted-c hover:border-amber-500/40 hover:text-amber-500'
                        )}
                      >
                        <Clock className="w-3 h-3" /> Late
                      </button>
                      <button
                        onClick={() => onMark(d.id, 'false')}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border',
                          val === 'false'
                            ? 'bg-red-500 border-red-400 text-white'
                            : 'bg-surface-2 border-border text-muted-c hover:border-red-500/40 hover:text-red-400'
                        )}
                      >
                        <X className="w-3 h-3" /> Absent
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canReschedule && val === null && onReschedule && (
                        <button
                          onClick={() => onReschedule(d)}
                          className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 transition-colors"
                          title="Reschedule within this week"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenNotes(d)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          notes ? 'text-orange-500' : 'text-muted-c hover:text-orange-500'
                        )}
                        title="Output notes"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {val !== null && (
                        <button
                          onClick={() => onMark(d.id, null)}
                          className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors"
                          title="Clear mark"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
