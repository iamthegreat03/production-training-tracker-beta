import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Award, Crown, Flame, TrendingUp, Users, Star, Zap } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { cn, normAtt, pct } from '@/lib/utils'
import type { Designer } from '@/types/database'

type FilterTab = 'overall' | 'attendance' | 'skills' | 'trainings'

interface DesignerScore {
  designer: Designer
  overall: number
  attendance: number
  skills: number
  trainings: number
  rank: number
  prevRank?: number
}

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overall', label: 'Overall', icon: Trophy },
  { id: 'attendance', label: 'Attendance', icon: Users },
  { id: 'skills', label: 'Skills', icon: Star },
  { id: 'trainings', label: 'Trainings', icon: Zap },
]

const RANK_META = [
  {
    place: 1, icon: Crown, label: '1st',
    color: 'text-yellow-400', border: 'border-yellow-500/50',
    shadow: '0 0 40px rgba(234,179,8,0.25)',
    accent: 'rgba(234,179,8,0.55)',
    accentSolid: '#EAB308',
    heroH: 200,
  },
  {
    place: 2, icon: Medal, label: '2nd',
    color: 'text-slate-300', border: 'border-slate-400/40',
    shadow: '0 0 28px rgba(148,163,184,0.15)',
    accent: 'rgba(148,163,184,0.5)',
    accentSolid: '#94A3B8',
    heroH: 160,
  },
  {
    place: 3, icon: Award, label: '3rd',
    color: 'text-amber-600', border: 'border-amber-700/40',
    shadow: '0 0 28px rgba(180,100,20,0.15)',
    accent: 'rgba(180,100,20,0.55)',
    accentSolid: '#B45309',
    heroH: 160,
  },
]

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        className={cn('h-full rounded-full', color)}
      />
    </div>
  )
}

function PodiumCard({ entry, meta, index }: { entry: DesignerScore; meta: typeof RANK_META[0]; index: number }) {
  const Icon = meta.icon
  const isFirst = meta.place === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: isFirst ? 40 : 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: index * 0.1 }}
      className={cn('relative flex flex-col rounded-2xl border overflow-hidden flex-1', meta.border)}
      style={{ boxShadow: meta.shadow }}
    >
      {/* ── Hero area ── */}
      <div className="relative overflow-hidden shrink-0" style={{ height: meta.heroH }}>
        {/* Cover art base */}
        <img
          src="/cover_background.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />

        {/* Diagonal color split: dark-left / accent-right */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(125deg, rgba(8,8,20,0.92) 42%, ${meta.accent} 42%)`,
          }}
        />

        {/* Subtle vignette at bottom to blend into info area */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Avatar — full height, bottom-anchored */}
        <img
          src="/avatar.png"
          alt={entry.designer.name}
          className="absolute bottom-0 left-1/2 translate-x-[30%] h-[95%] object-contain object-bottom"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}
        />

        {/* Rank badge — top left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
          <Icon className={cn('w-3 h-3', meta.color)} />
          <span className={cn('text-[9px] font-black uppercase tracking-widest', meta.color)}>{meta.label}</span>
        </div>

        {/* Score — top right */}
        <div className="absolute top-2 right-2 text-right">
          <div className={cn('font-display font-black leading-none', meta.color, isFirst ? 'text-xl' : 'text-lg')}>
            {entry.overall}
          </div>
          <div className="text-[8px] text-white/50 uppercase tracking-widest">pts</div>
        </div>
      </div>

      {/* ── Info area ── */}
      <div
        className="flex flex-col gap-2 px-3 py-3"
        style={{ background: 'rgba(8,8,20,0.95)' }}
      >
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.accentSolid }}>
            {entry.designer.team || 'Uncategorized'}
          </div>
          <div className={cn('font-display font-black text-white leading-tight truncate', isFirst ? 'text-base' : 'text-sm')}>
            {entry.designer.name}
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20">
            <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400">ATT</span>
            <span className="text-[9px] font-black text-emerald-400">{entry.attendance}%</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/20">
            <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400">SKL</span>
            <span className="text-[9px] font-black text-blue-400">{entry.skills}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Leaderboard() {
  const { state } = useApp()
  const { designers, sessions, attendance, designerSkills, enrollments, trainings } = state
  const [filter, setFilter] = useState<FilterTab>('overall')
  const [search, setSearch] = useState('')

  const scores = useMemo<DesignerScore[]>(() => {
    return designers.map(d => {
      // Attendance score: % of marked sessions that are present/late
      const myAtt = sessions.map(s =>
        normAtt(attendance.find(a => a.session_id === s.id && a.designer_id === d.id)?.is_present)
      )
      const present = myAtt.filter(v => v === 'true' || v === 'late').length
      const marked = myAtt.filter(v => v !== null).length
      const attendancePct = pct(present, marked)

      // Skills score: % of unique skill platforms covered (capped at 100)
      const mySkills = designerSkills.filter(s => s.designer_id === d.id)
      const allPlatforms = [...new Set(designerSkills.map(s => s.platform))]
      const skillsPct = allPlatforms.length > 0
        ? Math.round((mySkills.length / allPlatforms.length) * 100)
        : 0

      // Trainings score: % of completed enrollments
      const myEnrollments = enrollments.filter(e => e.designer_id === d.id)
      const completedTrainings = myEnrollments.filter(e => {
        const training = trainings.find(t => t.id === e.training_id)
        return training?.status === 'completed'
      }).length
      const trainingsPct = myEnrollments.length > 0
        ? Math.round((completedTrainings / myEnrollments.length) * 100)
        : 0

      // Composite: attendance 50%, skills 30%, trainings 20%
      const overall = Math.round(attendancePct * 0.5 + skillsPct * 0.3 + trainingsPct * 0.2)

      return {
        designer: d,
        overall,
        attendance: attendancePct,
        skills: skillsPct,
        trainings: trainingsPct,
        rank: 0,
      }
    })
  }, [designers, sessions, attendance, designerSkills, enrollments, trainings])

  const sorted = useMemo(() => {
    const key: keyof DesignerScore = filter === 'overall' ? 'overall'
      : filter === 'attendance' ? 'attendance'
      : filter === 'skills' ? 'skills'
      : 'trainings'

    return [...scores]
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .map((s, i) => ({ ...s, rank: i + 1 }))
      .filter(s => s.designer.name.toLowerCase().includes(search.toLowerCase()))
  }, [scores, filter, search])

  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const scoreKey: keyof DesignerScore = filter === 'overall' ? 'overall'
    : filter === 'attendance' ? 'attendance'
    : filter === 'skills' ? 'skills'
    : 'trainings'

  const scoreColor = filter === 'attendance' ? 'text-emerald-400'
    : filter === 'skills' ? 'text-blue-400'
    : filter === 'trainings' ? 'text-purple-400'
    : 'text-orange-400'

  const barColor = filter === 'attendance' ? 'bg-emerald-500'
    : filter === 'skills' ? 'bg-blue-500'
    : filter === 'trainings' ? 'bg-purple-500'
    : 'bg-orange-500'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-primary leading-none">Leaderboard</h1>
              <p className="text-xs text-muted-c mt-0.5">{designers.length} designers ranked</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-c bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-1.5">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="font-semibold text-orange-400 uppercase tracking-widest">Live Rankings</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 rounded-xl bg-surface-2 border border-border w-fit">
          {FILTER_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filter === tab.id
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'text-muted-c hover:text-primary'
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 space-y-6">
        {/* Podium */}
        {top3.length > 0 && (
          <div>
            {/* Podium banner */}
            <div className="relative rounded-2xl overflow-hidden mb-4">
              <img
                src="/cover_background.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-15"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-900/40 via-transparent to-purple-900/30" />
              <div className="relative z-10 flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Top Performers</div>
                  <div className="font-display font-black text-lg text-primary leading-tight">Hall of Fame</div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-muted-c capitalize">{filter}</span>
                </div>
              </div>
            </div>

            {/* Podium layout: 2nd | 1st | 3rd */}
            <div className="flex items-stretch gap-2">
              {top3[1] && <PodiumCard entry={top3[1]} meta={RANK_META[1]} index={1} />}
              {top3[0] && <PodiumCard entry={top3[0]} meta={RANK_META[0]} index={0} />}
              {top3[2] && <PodiumCard entry={top3[2]} meta={RANK_META[2]} index={2} />}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search designers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-c z-10" />
        </div>

        {/* Ranked list */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-muted-c uppercase tracking-widest">Full Rankings</span>
            <span className="text-[10px] text-muted-c">{sorted.length} designers</span>
          </div>
          <div className="divide-y divide-border">
            {sorted.map((entry, i) => {
              const score = entry[scoreKey] as number
              const isTop = entry.rank <= 3
              return (
                <motion.div
                  key={entry.designer.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 360, delay: Math.min(i * 0.025, 0.3) }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]',
                    entry.rank === 1 && 'bg-yellow-500/[0.03]',
                    entry.rank === 2 && 'bg-slate-400/[0.02]',
                    entry.rank === 3 && 'bg-amber-700/[0.02]',
                  )}
                >
                  {/* Rank number */}
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black',
                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                    : entry.rank === 2 ? 'bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/30'
                    : entry.rank === 3 ? 'bg-amber-700/15 text-amber-600 ring-1 ring-amber-700/30'
                    : 'bg-white/5 text-muted-c',
                  )}>
                    {isTop
                      ? [<Crown className="w-3.5 h-3.5 text-yellow-400" />, <Medal className="w-3.5 h-3.5 text-slate-300" />, <Award className="w-3.5 h-3.5 text-amber-600" />][entry.rank - 1]
                      : entry.rank}
                  </div>

                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full overflow-hidden ring-2 shrink-0',
                    entry.rank === 1 ? 'ring-yellow-500/50'
                    : entry.rank === 2 ? 'ring-slate-400/40'
                    : entry.rank === 3 ? 'ring-amber-700/40'
                    : 'ring-white/10',
                  )}>
                    <img src="/avatar.png" alt={entry.designer.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Name + team */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-primary truncate">{entry.designer.name}</div>
                    <div className="text-[10px] text-muted-c truncate">{entry.designer.team || 'Uncategorized'}</div>
                  </div>

                  {/* Score bar */}
                  <div className="w-20 sm:w-32 hidden sm:block">
                    <ScoreBar value={score} color={barColor} />
                  </div>

                  {/* Score value */}
                  <div className="text-right shrink-0">
                    <div className={cn('text-sm font-black', isTop ? scoreColor : 'text-muted-c')}>
                      {score}
                      <span className="text-[9px] font-medium opacity-60 ml-0.5">
                        {filter === 'overall' ? 'pts' : '%'}
                      </span>
                    </div>
                    {filter !== 'overall' && (
                      <div className="text-[9px] text-muted-c">Overall: {entry.overall}pts</div>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {sorted.length === 0 && (
              <div className="py-12 text-center text-muted-c text-sm">No designers found.</div>
            )}
          </div>
        </div>

        {/* Score legend */}
        <div className="card rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-c mb-3">Score Formula</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attendance', weight: '50%', color: 'text-emerald-400', bar: 'bg-emerald-500' },
              { label: 'Skill Coverage', weight: '30%', color: 'text-blue-400', bar: 'bg-blue-500' },
              { label: 'Trainings', weight: '20%', color: 'text-purple-400', bar: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="h-1 rounded-full" style={{ background: `rgba(255,255,255,0.05)` }}>
                  <div className={cn('h-full rounded-full', item.bar)} style={{ width: item.weight }} />
                </div>
                <div className={cn('text-xs font-bold', item.color)}>{item.weight}</div>
                <div className="text-[9px] text-muted-c">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
