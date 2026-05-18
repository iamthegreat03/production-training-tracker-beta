import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, CalendarCheck, TrendingUp,
  AlertTriangle, Clock, Zap, ChevronRight, Activity, StickyNote, ChevronLeft, Building2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '@/context/AppContext'
import { pct, fmtDs, initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const } }),
}

export default function Dashboard() {
  const { state, dispatch } = useApp()
  const { designers, trainings, sessions, attendance, makeups, designerSkills, teams, extTrainings, extSessions } = state

  const totalExtAttendees = useMemo(() => extSessions.reduce((s, e) => s + e.attendee_count, 0), [extSessions])

  const today = new Date().toISOString().split('T')[0]

  // Overall attendance rate
  const marked = attendance.filter(a => a.is_present !== null)
  const present = attendance.filter(a => a.is_present === 'true' || a.is_present === 'late')
  const overallRate = pct(present.length, marked.length)

  // Active trainings
  const active = trainings.filter(t => t.status === 'active')

  // Upcoming sessions (next 7 days) — kept for reference
  const next7 = new Date(); next7.setDate(next7.getDate() + 7)
  const upcoming = sessions
    .filter(s => s.session_date >= today && s.session_date <= next7.toISOString().split('T')[0])
    .slice(0, 5)

  // Calendar state
  const [calDate, setCalDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(today)

  const calYear = calDate.getFullYear()
  const calMonth = calDate.getMonth()
  const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`

  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof sessions> = {}
    sessions.forEach(s => {
      if (s.session_date.startsWith(calMonthStr)) {
        map[s.session_date] = map[s.session_date] ?? []
        map[s.session_date].push(s)
      }
    })
    return map
  }, [sessions, calMonthStr])

  const selectedSessions = selectedDay ? (sessionsByDate[selectedDay] ?? []) : []

  // Critical alerts: designers with 2+ consecutive absences
  const alerts: string[] = []
  designers.forEach(d => {
    const dAtt = attendance
      .filter(a => a.designer_id === d.id)
      .sort((a, b) => {
        const sa = sessions.find(s => s.id === a.session_id)
        const sb = sessions.find(s => s.id === b.session_id)
        return (sb?.session_date ?? '') > (sa?.session_date ?? '') ? 1 : -1
      })
    let streak = 0
    for (const a of dAtt) {
      if (a.is_present === 'false') streak++
      else break
    }
    if (streak >= 2) alerts.push(d.name)
  })

  // Overdue makeups
  const overdueMakeups = makeups.filter(m => m.makeup_date < today && m.is_attended === null)

  // Team breakdown
  const teamStats = teams.map(team => {
    const members = designers.filter(d => d.team === team.name)
    const memberIds = new Set(members.map(d => d.id))
    const teamAtt = attendance.filter(a => a.designer_id && memberIds.has(a.designer_id))
    const teamPresent = teamAtt.filter(a => a.is_present === 'true' || a.is_present === 'late')
    const teamMarked = teamAtt.filter(a => a.is_present !== null)
    return { name: team.name, members: members.length, rate: pct(teamPresent.length, teamMarked.length) }
  }).sort((a, b) => b.rate - a.rate)

  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [rangeTo, setRangeTo] = useState(today)

  const rangedStats = useMemo(() => {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) return null
    let presentCount = 0, lateCount = 0, absentCount = 0
    const notesList: Array<{ id: string; designerName: string; trainingName: string; date: string; text: string }> = []
    attendance.forEach(a => {
      const sess = sessions.find(s => s.id === a.session_id)
      if (!sess || !a.designer_id) return
      if (sess.session_date < rangeFrom || sess.session_date > rangeTo) return
      if (a.is_present === 'true') presentCount++
      else if (a.is_present === 'late') lateCount++
      else if (a.is_present === 'false') absentCount++
      if (a.notes) {
        const d = designers.find(x => x.id === a.designer_id)
        const tr = trainings.find(x => x.id === sess.training_id)
        notesList.push({ id: a.id, designerName: d?.name ?? 'Unknown', trainingName: tr?.name ?? '—', date: sess.session_date, text: a.notes })
      }
    })
    notesList.sort((a, b) => b.date.localeCompare(a.date))
    const total = presentCount + lateCount + absentCount
    const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0

    const sessionTrend = sessions
      .filter(s => s.session_date >= rangeFrom && s.session_date <= rangeTo)
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
      .reduce((acc, s) => {
        const sAtt = attendance.filter(a => a.session_id === s.id)
        const p = sAtt.filter(a => a.is_present === 'true' || a.is_present === 'late').length
        const m = sAtt.filter(a => a.is_present !== null).length
        if (m === 0) return acc
        const tr = trainings.find(t => t.id === s.training_id)
        acc.push({ date: fmtDs(s.session_date), rate: pct(p, m), training: tr?.name ?? '—' })
        return acc
      }, [] as Array<{ date: string; rate: number; training: string }>)

    return { presentCount, lateCount, absentCount, notesList, total, rate, sessionTrend }
  }, [attendance, sessions, designers, trainings, rangeFrom, rangeTo])

  // Skill coverage for base platforms
  const PLATFORMS = ['Clickfunnels', 'GoHighLevel', 'Shopify', 'Wix', 'Wordpress']
  const skillCoverage = PLATFORMS.map(p => {
    const count = new Set(designerSkills.filter(s => s.platform === p).map(s => s.designer_id)).size
    return { platform: p, count, pct: pct(count, designers.length) }
  })

  const stats = [
    { label: 'Designers', value: designers.length, suffix: '', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Trainings', value: active.length, suffix: '', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Sessions Logged', value: sessions.length, suffix: '', icon: CalendarCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Overall Rate', value: overallRate, suffix: '%', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="page-header">
        <div className="flex items-center gap-2 mb-1">
          <div className="pulse-dot" />
          <span className="text-xs font-semibold text-orange-500 uppercase tracking-widest">Live</span>
        </div>
        <h1 className="page-title font-display">Command Center</h1>
        <p className="page-subtitle">Real-time training overview for RWDS Design Team</p>
      </motion.div>

      {/* Hero metric */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show"
        className="relative card rounded-2xl p-6 overflow-hidden shine">
        <div className="absolute inset-0 bg-orange-glow opacity-40 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="stat-label mb-2">Overall Attendance Rate</div>
            <div className="font-display font-bold text-6xl text-gradient-orange leading-none">
              <AnimatedNumber value={overallRate} suffix="%" />
            </div>
            <div className="mt-2 text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              {present.length} present out of {marked.length} marked sessions
            </div>
          </div>
          <div className="hidden sm:flex w-20 h-20 rounded-full border-4 border-orange-500/30
                          items-center justify-center glow-orange-md">
            <Zap className="w-9 h-9 text-orange-500" />
          </div>
        </div>
        {/* Mini progress */}
        <div className="relative z-10 mt-4 progress-track">
          <div className="progress-fill" style={{ width: `${overallRate}%` }} />
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={fadeUp} custom={i + 2} initial="hidden" animate="show"
              className="card card-interactive rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="stat-label mb-2">{s.label}</div>
                  <div className="stat-value"><AnimatedNumber value={s.value} suffix={s.suffix} /></div>
                </div>
                <div className={cn('p-2.5 rounded-xl', s.bg)}>
                  <Icon className={cn('w-5 h-5', s.color)} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Cross-Dept Training snapshot */}
      <motion.div variants={fadeUp} custom={6} initial="hidden" animate="show"
        className="card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Cross-Dept Training</span>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', payload: 'crossdept' })}
            className="text-[10px] font-bold text-orange-500 uppercase hover:underline flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{extTrainings.length}</div>
            <div className="text-[10px] text-muted-c uppercase tracking-widest mt-0.5">Programs</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{extSessions.length}</div>
            <div className="text-[10px] text-muted-c uppercase tracking-widest mt-0.5">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">{totalExtAttendees}</div>
            <div className="text-[10px] text-muted-c uppercase tracking-widest mt-0.5">Trained</div>
          </div>
        </div>
      </motion.div>

      {/* Two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts */}
        <motion.div variants={fadeUp} custom={6} initial="hidden" animate="show"
          className="card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-sm text-primary">Critical Alerts</h2>
            {(alerts.length + overdueMakeups.length) > 0 && (
              <span className="badge badge-red ml-auto">
                {alerts.length + overdueMakeups.length}
              </span>
            )}
          </div>
          {alerts.length === 0 && overdueMakeups.length === 0 ? (
            <p className="text-sm text-muted-c text-center py-4">No alerts — all clear ✓</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(name => (
                <div key={name} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2 border border-border-subtle">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                  <span className="text-sm text-primary">{name}</span>
                  <span className="text-xs text-red-400 ml-auto">2+ absences</span>
                </div>
              ))}
              {overdueMakeups.map(m => {
                const d = designers.find(d => d.id === m.designer_id)
                return (
                  <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2 border border-border-subtle">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-sm text-primary">{d?.name ?? 'Unknown'}</span>
                    <span className="text-xs text-amber-400 ml-auto">Overdue makeup</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Upcoming sessions — calendar */}
        <motion.div variants={fadeUp} custom={7} initial="hidden" animate="show"
          className="card rounded-xl p-4 flex flex-col gap-3">

          {/* Header */}
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <h2 className="font-semibold text-sm text-primary">Upcoming Sessions</h2>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1 rounded-lg text-muted-c hover:text-primary hover:bg-surface-2 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-primary px-1 min-w-[100px] text-center">{monthLabel}</span>
              <button
                onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1 rounded-lg text-muted-c hover:text-primary hover:bg-surface-2 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 text-center">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-[9px] font-bold text-muted-c uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calMonthStr}-${String(day).padStart(2, '0')}`
              const hasSessions = !!sessionsByDate[dateStr]
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDay
              const isPast = dateStr < today

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={cn(
                    'relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-all mx-0.5',
                    isSelected ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30' :
                    isToday ? 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/40' :
                    hasSessions ? 'hover:bg-surface-2 text-primary' :
                    isPast ? 'text-muted-c/40' : 'text-muted-c hover:bg-surface-2'
                  )}
                >
                  <span className="leading-none">{day}</span>
                  {hasSessions && (
                    <span className={cn(
                      'absolute bottom-1 w-1 h-1 rounded-full',
                      isSelected ? 'bg-white/70' : 'bg-orange-500'
                    )} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day sessions */}
          <div className="min-h-[52px]">
            {selectedDay && selectedSessions.length === 0 && (
              <p className="text-xs text-muted-c text-center py-3 italic">No sessions on this day</p>
            )}
            {selectedSessions.length > 0 && (
              <div className="space-y-1.5">
                {selectedSessions.map(s => {
                  const tr = trainings.find(t => t.id === s.training_id)
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', tr?.type === 'Hands-On' ? 'bg-orange-500' : 'bg-purple-500')} />
                      <span className="text-xs font-semibold text-primary truncate flex-1">{tr?.name ?? '—'}</span>
                      <span className="text-[10px] text-muted-c shrink-0">{s.day_of_week?.slice(0, 3)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {!selectedDay && (
              <p className="text-xs text-muted-c text-center py-3 italic">Select a date to see sessions</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Attendance Summary */}
      <motion.div variants={fadeUp} custom={8} initial="hidden" animate="show"
        className="card rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap gap-y-2">
            <Activity className="w-4 h-4 text-orange-400 shrink-0" />
            <h2 className="font-semibold text-sm text-primary">Attendance Summary</h2>
            <div className="flex items-center gap-1.5 ml-auto">
              <input type="date" value={rangeFrom} max={rangeTo} onChange={e => setRangeFrom(e.target.value)} className="input h-7 px-2 text-[11px] w-32 tabular-nums" />
              <span className="text-[10px] text-muted-c font-bold">→</span>
              <input type="date" value={rangeTo} min={rangeFrom} max={today} onChange={e => setRangeTo(e.target.value)} className="input h-7 px-2 text-[11px] w-32 tabular-nums" />
            </div>
          </div>

          {!rangedStats || rangedStats.total === 0 ? (
            <p className="text-sm text-muted-c text-center py-4">No attendance data in this range</p>
          ) : (
            <>
              {/* Stats row */}
              <div className="flex gap-3 flex-wrap">
                {/* Big rate */}
                <div className="flex-shrink-0 w-28 p-4 rounded-xl bg-surface-2 border border-border flex flex-col justify-center">
                  <div className={cn('font-display font-bold text-4xl leading-none tabular-nums',
                    rangedStats.rate >= 80 ? 'text-emerald-400' : rangedStats.rate >= 60 ? 'text-amber-400' : 'text-red-400'
                  )}><AnimatedNumber value={rangedStats.rate} suffix="%" /></div>
                  <div className="text-[9px] font-bold text-muted-c uppercase tracking-widest mt-1.5">Rate</div>
                  <div className="text-[10px] text-muted-c mt-0.5">{rangedStats.total} marked</div>
                </div>
                {/* Present / Late / Absent */}
                <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
                  {[
                    { label: 'Present', value: rangedStats.presentCount, color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
                    { label: 'Late', value: rangedStats.lateCount, color: 'text-amber-400', bg: 'bg-amber-500/8' },
                    { label: 'Absent', value: rangedStats.absentCount, color: 'text-red-400', bg: 'bg-red-500/8' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-xl p-3 text-center', bg)}>
                      <div className={cn('text-2xl font-bold tabular-nums leading-none', color)}><AnimatedNumber value={value} /></div>
                      <div className="text-[9px] font-bold text-muted-c uppercase tracking-widest mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance trend chart */}
              {rangedStats.sessionTrend.length > 1 && (
                <div style={{ height: 130 }} className="-mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rangedStats.sessionTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
                              <div className="font-bold text-primary">{label}</div>
                              <div className="text-[10px] text-muted-c truncate max-w-[160px]">{payload[0].payload.training}</div>
                              <div className="text-orange-400 font-bold mt-0.5">{payload[0].value}% attendance</div>
                            </div>
                          )
                        }}
                        cursor={{ stroke: 'rgba(249,115,22,0.2)', strokeWidth: 1 }}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2}
                        fill="url(#attGrad)"
                        dot={{ r: 2.5, fill: '#f97316', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Notes feed */}
              {rangedStats.notesList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-c uppercase tracking-widest">
                    <StickyNote className="w-3 h-3" />
                    {rangedStats.notesList.length} Trainer {rangedStats.notesList.length === 1 ? 'Note' : 'Notes'}
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {rangedStats.notesList.map(note => (
                      <div key={note.id} className="flex gap-3 p-3 rounded-xl bg-surface-2 border border-border-subtle">
                        <div className="w-8 h-8 rounded-lg bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {initials(note.designerName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-primary">{note.designerName}</span>
                            <span className="text-[10px] text-muted-c">·</span>
                            <span className="text-[10px] text-orange-400 font-medium truncate max-w-[140px]">{note.trainingName}</span>
                            <span className="text-[10px] text-muted-c ml-auto shrink-0">{fmtDs(note.date)}</span>
                          </div>
                          <p className="text-xs text-muted-c italic leading-relaxed mt-0.5">{note.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>


      {/* Trainings ending soon */}
      {(() => {
        const soon14 = new Date(); soon14.setDate(soon14.getDate() + 14)
        const ending = trainings.filter(t =>
          t.status === 'active' && t.target_date &&
          t.target_date >= today && t.target_date <= soon14.toISOString().split('T')[0]
        )
        if (ending.length === 0) return null
        return (
          <motion.div variants={fadeUp} custom={10} initial="hidden" animate="show"
            className="card rounded-xl p-4">
            <h2 className="font-semibold text-sm text-primary mb-3">Ending Soon</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {ending.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{t.name}</div>
                    <div className="text-xs text-amber-400">{fmtDs(t.target_date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}
