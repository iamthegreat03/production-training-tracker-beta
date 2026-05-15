import { useRef } from 'react'
import { Check, Clock, X } from 'lucide-react'
import { cn, initials, normAtt, pct, fmtDs } from '@/lib/utils'
import type {
  Designer, Attendance, TrainingSession,
  AttendanceValue, Training, TrainingEnrollment,
} from '@/types/database'

function scheduledIds(
  designerId: string,
  sessions: TrainingSession[],
  training: Training,
  enrollments: TrainingEnrollment[],
): Set<string> {
  const enrollment = enrollments.find(e => e.training_id === training.id && e.designer_id === designerId)
  const sched = enrollment?.designer_schedule ?? []
  if (sched.length === 0) return new Set(sessions.map(s => s.id))
  return new Set(
    sessions
      .filter(s => training.type === 'Hands-On'
        ? sched.includes(s.day_of_week ?? '')
        : sched.includes(s.session_date))
      .map(s => s.id)
  )
}

interface Props {
  designers: Designer[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  optimistic: Record<string, AttendanceValue>
  training: Training
  enrollments: TrainingEnrollment[]
  onMark: (designerId: string, value: AttendanceValue, sessionId: string) => void
}

export default function MatrixView({
  designers, sessions, attendance, optimistic, training, enrollments, onMark,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, x: 0, sl: 0, moved: false })

  function onMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    drag.current = { active: true, x: e.clientX, sl: scrollRef.current?.scrollLeft ?? 0, moved: false }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active || !scrollRef.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    scrollRef.current.scrollLeft = drag.current.sl - dx
  }
  function onMouseUp() { drag.current.active = false }

  function getVal(sessionId: string, designerId: string): AttendanceValue {
    const key = `${sessionId}_${designerId}`
    if (key in optimistic) return optimistic[key]
    const rec = attendance.find(a => a.session_id === sessionId && a.designer_id === designerId)
    return normAtt(rec?.is_present)
  }

  function cycle(designerId: string, sessionId: string) {
    const cur = getVal(sessionId, designerId)
    const next: AttendanceValue =
      cur === null ? 'true' : cur === 'true' ? 'late' : cur === 'late' ? 'false' : null
    onMark(designerId, next, sessionId)
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-c text-sm">
        No sessions recorded yet.
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto min-h-0 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="inline-block min-w-full align-top">
        <table className="border-collapse">
          <thead>
            <tr>
              {/* Sticky designer column header */}
              <th className="sticky left-0 z-20 bg-surface border-b border-r border-border px-4 py-3 text-left min-w-[140px] sm:min-w-[180px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Designer</span>
              </th>
              {sessions.map(s => (
                <th key={s.id} className="border-b border-border px-2 py-3 text-center min-w-[44px] sm:min-w-[56px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-c">
                      {s.day_of_week?.slice(0, 3)}
                    </span>
                    <span className="text-[10px] font-bold text-primary leading-none">
                      {fmtDs(s.session_date).split(' ')[1]}
                    </span>
                    <span className="text-[8px] text-muted-c">
                      {fmtDs(s.session_date).split(' ')[0]}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border-b border-border px-4 py-3 text-right min-w-[60px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-c">Rate</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {designers.map((d, i) => {
              const myScheduled = scheduledIds(d.id, sessions, training, enrollments)
              const scheduledSessions = sessions.filter(s => myScheduled.has(s.id))
              const present = scheduledSessions.filter(s => {
                const v = getVal(s.id, d.id)
                return v === 'true' || v === 'late'
              }).length
              const marked = scheduledSessions.filter(s => getVal(s.id, d.id) !== null).length
              const rate = pct(present, marked)

              return (
                <tr
                  key={d.id}
                  className={cn(
                    'border-b border-border transition-colors',
                    i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/40',
                    'hover:bg-orange-500/[0.03]'
                  )}
                >
                  {/* Sticky designer cell */}
                  <td className={cn(
                    'sticky left-0 z-10 border-r border-border px-4 py-2',
                    i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/40',
                  )}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {initials(d.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-primary truncate">{d.name}</div>
                        <div className="text-[9px] text-muted-c truncate">{d.team || 'Uncategorized'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Session cells */}
                  {sessions.map(s => {
                    const scheduled = myScheduled.has(s.id)
                    const val = getVal(s.id, d.id)
                    return (
                      <td key={s.id} className="px-2 py-2 text-center">
                        {!scheduled ? (
                          <div className="w-7 h-7 rounded-lg bg-slate-400/[0.06] mx-auto" title="Not scheduled" />
                        ) : (
                          <button
                            onClick={e => { if (drag.current.moved) { e.preventDefault(); return } cycle(d.id, s.id) }}
                            title={val === 'true' ? 'Present' : val === 'late' ? 'Late' : val === 'false' ? 'Absent' : 'Unmarked — click to mark'}
                            className={cn(
                              'w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center mx-auto',
                              val === 'true'  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' :
                              val === 'late'  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' :
                              val === 'false' ? 'bg-red-500 text-white shadow-sm shadow-red-500/30' :
                              'bg-slate-400/40 hover:bg-slate-400/60'
                            )}
                          >
                            {val === 'true'  && <Check className="w-3.5 h-3.5" />}
                            {val === 'late'  && <Clock className="w-3.5 h-3.5" />}
                            {val === 'false' && <X className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    )
                  })}

                  {/* Rate */}
                  <td className="px-4 py-2 text-right">
                    <span className={cn(
                      'text-xs font-bold',
                      rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-amber-400' : marked === 0 ? 'text-muted-c' : 'text-red-400'
                    )}>
                      {marked === 0 ? '—' : `${rate}%`}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
