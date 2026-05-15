import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { cn, initials, normAtt, pct, fmtDs } from '@/lib/utils'
import AnimatedNumber from '@/components/shared/AnimatedNumber'
import type {
  Designer, Attendance, TrainingSession,
  Training, TrainingEnrollment,
} from '@/types/database'

function getScheduledSessions(
  designerId: string,
  sessions: TrainingSession[],
  training: Training,
  enrollments: TrainingEnrollment[],
): TrainingSession[] {
  const enrollment = enrollments.find(e => e.training_id === training.id && e.designer_id === designerId)
  const sched = enrollment?.designer_schedule ?? []
  if (sched.length === 0) return sessions
  return sessions.filter(s => training.type === 'Hands-On'
    ? sched.includes(s.day_of_week ?? '')
    : sched.includes(s.session_date)
  )
}

interface Props {
  designers: Designer[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  training: Training
  enrollments: TrainingEnrollment[]
}

export default function StatsView({ designers, sessions, attendance, training, enrollments }: Props) {
  // Per-session bar chart data
  const sessionData = sessions.map(s => {
    const scheduled = designers.filter(d => {
      const myEnrollment = enrollments.find(e => e.training_id === training.id && e.designer_id === d.id)
      const sched = myEnrollment?.designer_schedule ?? []
      if (sched.length === 0) return true
      return training.type === 'Hands-On'
        ? sched.includes(s.day_of_week ?? '')
        : sched.includes(s.session_date)
    })
    const present = scheduled.filter(d => {
      const rec = attendance.find(a => a.session_id === s.id && a.designer_id === d.id)
      return normAtt(rec?.is_present) === 'true' || normAtt(rec?.is_present) === 'late'
    }).length
    const absent = scheduled.filter(d => {
      const rec = attendance.find(a => a.session_id === s.id && a.designer_id === d.id)
      return normAtt(rec?.is_present) === 'false'
    }).length
    const marked = scheduled.filter(d => {
      const rec = attendance.find(a => a.session_id === s.id && a.designer_id === d.id)
      return normAtt(rec?.is_present) !== null
    }).length
    return {
      label: fmtDs(s.session_date),
      rate: pct(present, marked),
      present,
      absent,
      scheduled: scheduled.length,
      marked,
    }
  })

  // Per-designer performance
  const designerStats = designers.map(d => {
    const mySessions = getScheduledSessions(d.id, sessions, training, enrollments)
    const present = mySessions.filter(s => {
      const v = normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === d.id)?.is_present)
      return v === 'true' || v === 'late'
    }).length
    const late = mySessions.filter(s =>
      normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === d.id)?.is_present) === 'late'
    ).length
    const absent = mySessions.filter(s =>
      normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === d.id)?.is_present) === 'false'
    ).length
    const marked = mySessions.filter(s =>
      normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === d.id)?.is_present) !== null
    ).length
    return {
      designer: d,
      scheduled: mySessions.length,
      present, late, absent, marked,
      rate: pct(present, marked),
    }
  }).sort((a, b) => b.rate - a.rate)

  const avgRate = designerStats.length > 0
    ? Math.round(designerStats.reduce((sum, d) => sum + d.rate, 0) / designerStats.length)
    : 0

  const atRisk = designerStats.filter(d => d.marked > 0 && d.rate < 70).length
  const bestSession = sessionData.length > 0
    ? sessionData.reduce((best, s) => s.rate > best.rate ? s : best, sessionData[0])
    : null

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-surface border border-border rounded-xl p-3 text-xs shadow-lg space-y-1">
        <div className="font-bold text-primary">{label}</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500/80" /><span className="text-emerald-400">{d.present} present</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/60" /><span className="text-red-400">{d.absent} absent</span></div>
        <div className="text-orange-400 font-bold pt-0.5 border-t border-border">Rate: {d.rate}%</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-1">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sessions',     num: sessions.length,        suffix: '',  color: 'text-blue-400' },
          { label: 'Avg Rate',     num: avgRate,                suffix: '%', color: 'text-orange-400' },
          { label: 'Best Session', num: bestSession?.rate ?? null, suffix: '%', color: 'text-emerald-400' },
          { label: 'At Risk',      num: atRisk,                 suffix: '',  color: atRisk > 0 ? 'text-red-400' : 'text-muted-c' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={cn('text-2xl font-display font-bold leading-none', s.color)}>
              {s.num !== null ? <AnimatedNumber value={s.num} suffix={s.suffix} /> : '—'}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-c mt-1.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Session attendance chart */}
      {sessionData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-c">
              Session Breakdown
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-c">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/80 inline-block" />Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/60 inline-block" />Absent</span>
              <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-orange-500 inline-block" />Rate</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={sessionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="absentBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="count" tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.04)' }} />
              <Bar yAxisId="count" dataKey="present" fill="url(#presentBar)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar yAxisId="count" dataKey="absent" fill="url(#absentBar)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Line yAxisId="rate" type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ r: 2.5, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Designer rankings */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-c">Designer Rankings</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th>Designer</th>
              <th className="hidden sm:table-cell">Team</th>
              <th>Rate</th>
              <th className="hidden md:table-cell text-center">Present</th>
              <th className="hidden md:table-cell text-center">Late</th>
              <th className="hidden md:table-cell text-center">Absent</th>
              <th className="hidden lg:table-cell text-right">Progress</th>
            </tr>
          </thead>
          <tbody>
            {designerStats.map(({ designer: d, rate, present, late, absent, marked, scheduled }, i) => (
              <tr key={d.id} className={cn(
                i < 3 && marked > 0 && 'bg-emerald-500/[0.02]',
                marked > 0 && rate < 70 && 'bg-red-500/[0.02]'
              )}>
                <td>
                  <span className={cn(
                    'text-xs font-bold',
                    i === 0 && marked > 0 ? 'text-orange-500' : 'text-muted-c'
                  )}>{i + 1}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                      {initials(d.name)}
                    </div>
                    <span className="text-sm font-medium text-primary">{d.name}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell">
                  <span className="badge badge-orange text-[10px]">{d.team || 'Uncategorized'}</span>
                </td>
                <td>
                  <span className={cn(
                    'text-sm font-bold',
                    marked === 0 ? 'text-muted-c' :
                    rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {marked === 0 ? '—' : `${rate}%`}
                  </span>
                </td>
                <td className="hidden md:table-cell text-center">
                  <span className="text-xs text-emerald-400 font-semibold">{present}</span>
                </td>
                <td className="hidden md:table-cell text-center">
                  <span className="text-xs text-amber-400 font-semibold">{late}</span>
                </td>
                <td className="hidden md:table-cell text-center">
                  <span className="text-xs text-red-400 font-semibold">{absent}</span>
                </td>
                <td className="hidden lg:table-cell">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-24 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${marked === 0 ? 0 : rate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-c shrink-0">{present}/{scheduled}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
