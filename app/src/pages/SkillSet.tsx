import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Star, Search, Download, Trash2, Shield,
  TrendingUp, Users, Target, Info,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, initials, pct } from '@/lib/utils'
import { toast } from 'sonner'
import type { Designer } from '@/types/database'
import SkillEditModal from '@/components/skillset/SkillEditModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import AnimatedNumber from '@/components/shared/AnimatedNumber'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const BASE_PLATFORMS = ['Clickfunnels', 'GoHighLevel', 'Shopify', 'Wix', 'Wordpress']
const LEVEL_SHORT: Record<string, string> = { 'Intermediate': 'INT', 'Advanced': 'ADV', 'Expert': 'EXP' }

function CoverageRing({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 120 : 72
  const r   = size === 'lg' ? 46  : 28
  const sw  = size === 'lg' ? 7   : 5
  const circ  = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  const color = value >= 75 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg viewBox={`0 0 ${dim} ${dim}`} className="w-full h-full -rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={sw} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn('font-bold tabular-nums leading-none', size === 'lg' ? 'text-2xl' : 'text-sm')}
          style={{ color }}
        >{value}%</span>
        <span className={cn('text-muted-c font-medium leading-none', size === 'lg' ? 'text-[10px]' : 'text-[8px]')}>avg</span>
      </div>
    </div>
  )
}

export default function SkillSet() {
  const { state, loadAll, can } = useApp()
  const { designers, designerSkills, teams } = state

  const [search, setSearch]               = useState('')
  const [platFilter, setPlatFilter]       = useState('ALL')
  const [editTarget, setEditTarget]       = useState<{ designer: Designer; platform: string } | null>(null)
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)

  // ── Derived data ─────────────────────────────────────────────────────────

  const dynamicPlatforms = useMemo(() => {
    const set = new Set<string>()
    designerSkills.forEach(s => {
      if (!BASE_PLATFORMS.includes(s.platform) && !s.platform.startsWith('DSG:')) set.add(s.platform)
    })
    return Array.from(set).sort()
  }, [designerSkills])

  const allPlatforms = useMemo(() => [...BASE_PLATFORMS, ...dynamicPlatforms], [dynamicPlatforms])

  const visiblePlatforms = useMemo(() =>
    platFilter === 'ALL' ? allPlatforms : allPlatforms.filter(p => p === platFilter),
  [allPlatforms, platFilter])

  const filteredDesigners = useMemo(() => {
    if (!search) return designers
    const q = search.toLowerCase()
    return designers.filter(d => d.name.toLowerCase().includes(q) || (d.team ?? '').toLowerCase().includes(q))
  }, [designers, search])

  const teamCoverage = useMemo(() =>
    teams.map(team => {
      const members = designers.filter(d => d.team === team.name)
      const platformStats = BASE_PLATFORMS.map(p => {
        const has = members.filter(m => designerSkills.some(s => s.designer_id === m.id && s.platform === p)).length
        return { platform: p, pct: pct(has, members.length) }
      })
      const avgCoverage = platformStats.length
        ? Math.round(platformStats.reduce((s, ps) => s + ps.pct, 0) / platformStats.length)
        : 0
      return { team: team.name, memberCount: members.length, platformStats, avgCoverage }
    }),
  [teams, designers, designerSkills])

  const distribution = useMemo(() =>
    allPlatforms.map(p => {
      const ps = designerSkills.filter(s => s.platform === p)
      return {
        platform: p,
        int: ps.filter(s => s.level === 'Intermediate').length,
        adv: ps.filter(s => s.level === 'Advanced').length,
        exp: ps.filter(s => s.level === 'Expert').length,
        total: ps.length,
      }
    }),
  [designerSkills, allPlatforms])

  const overallCoverage = useMemo(() =>
    teamCoverage.length
      ? Math.round(teamCoverage.reduce((s, t) => s + t.avgCoverage, 0) / teamCoverage.length)
      : 0,
  [teamCoverage])

  const pageStats = useMemo(() => {
    const nonDsg = designerSkills.filter(s => !s.platform.startsWith('DSG:'))
    return {
      withSkills:  new Set(nonDsg.map(s => s.designer_id)).size,
      totalLogged: nonDsg.length,
      expertCount: nonDsg.filter(s => s.level === 'Expert').length,
    }
  }, [designerSkills])

  const topPlatform = useMemo(() =>
    distribution.length ? [...distribution].sort((a, b) => b.total - a.total)[0] : null,
  [distribution])

  const maxDistCount = useMemo(() =>
    Math.max(...distribution.map(d => Math.max(d.int, d.adv, d.exp, 1))),
  [distribution])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function confirmDeletePlatform() {
    if (!platformToDelete) return
    setSaving(true)
    const { error } = await supabase.from('designer_skills').delete().eq('platform', platformToDelete)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setPlatformToDelete(null)
    await loadAll()
  }

  function exportCSV() {
    let csv = 'Designer,Team,Rank,' + allPlatforms.join(',') + '\n'
    designers.forEach(d => {
      const row = [d.name, d.team || 'None', d.rank]
      allPlatforms.forEach(p => {
        const s = designerSkills.find(sk => sk.designer_id === d.id && sk.platform === p)
        row.push(s ? s.level : '')
      })
      csv += row.join(',') + '\n'
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `skill-matrix-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Skill Set</h1>
          <p className="page-subtitle">Expertise matrix and team coverage analysis</p>
        </div>
        <button onClick={exportCSV} className="btn-outline h-10 px-4 gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          {
            label: 'Designers with Skills',
            value: pageStats.withSkills,
            badge: 'Active',
            badgeClass: 'badge-orange',
            iconBg: 'bg-orange-500/10',
            icon: <Users className="w-4 h-4 text-orange-400" />,
          },
          {
            label: 'Skills Logged',
            value: pageStats.totalLogged,
            badge: 'Total',
            badgeClass: 'badge-blue',
            iconBg: 'bg-blue-500/10',
            icon: <Star className="w-4 h-4 text-blue-400" />,
          },
          {
            label: 'Avg Team Coverage',
            value: `${overallCoverage}%`,
            badge: overallCoverage >= 75 ? 'Strong' : overallCoverage >= 40 ? 'Moderate' : 'Low',
            badgeClass: overallCoverage >= 75 ? 'badge-emerald' : overallCoverage >= 40 ? 'badge-amber' : 'badge-red',
            iconBg: 'bg-emerald-500/10',
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
          },
          {
            label: 'Expert Skills',
            value: pageStats.expertCount,
            badge: 'Expert',
            badgeClass: 'badge-purple',
            iconBg: 'bg-purple-500/10',
            icon: <Shield className="w-4 h-4 text-purple-400" />,
          },
        ] as const).map(s => (
          <div key={s.label} className="card glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.iconBg)}>
                {s.icon}
              </div>
              <span className={s.badgeClass}>{s.badge}</span>
            </div>
            <div>
              <div className="stat-value">
              {typeof s.value === 'string' && s.value.endsWith('%')
                ? <AnimatedNumber value={parseInt(s.value)} suffix="%" />
                : <AnimatedNumber value={s.value as number} />}
            </div>
              <div className="stat-label mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Distribution ── */}
        <div className="card glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-primary">Platform Skill Distribution</h3>
            </div>
            <div className="flex items-center gap-4">
              {([
                { label: 'Intermediate', color: '#f97316', opacity: '40' },
                { label: 'Advanced',     color: '#f97316', opacity: '75' },
                { label: 'Expert',       color: '#f97316', opacity: 'ff' },
              ] as const).map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 rounded-full" style={{ background: l.color, opacity: l.opacity === 'ff' ? 1 : l.opacity === '75' ? 0.75 : 0.4 }} />
                  <span className="text-[10px] text-muted-c font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 flex-1 flex items-center">
            {distribution.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-c text-sm italic w-full">No skill data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={distribution.map(d => ({
                    name: d.platform === 'GoHighLevel' ? 'GHL'
                      : d.platform === 'Clickfunnels' ? 'CF'
                      : d.platform === 'Wordpress' ? 'WP'
                      : d.platform,
                    Intermediate: d.int,
                    Advanced: d.adv,
                    Expert: d.exp,
                    platform: d.platform,
                  }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-surface border border-border rounded-xl px-3 py-2.5 text-xs shadow-lg space-y-1">
                          <div className="font-bold text-primary mb-1">{payload[0]?.payload?.platform ?? label}</div>
                          {payload.map((p: any) => (
                            <div key={p.name} className="flex items-center gap-2">
                              <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: p.stroke }} />
                              <span className="text-muted-c">{p.name}:</span>
                              <span className="font-bold text-primary">{p.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                    cursor={{ stroke: 'rgba(249,115,22,0.12)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone" dataKey="Intermediate" stroke="rgba(249,115,22,0.20)"
                    strokeWidth={2} strokeDasharray="4 4"
                    dot={{ r: 3, fill: 'rgba(249,115,22,0.20)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'rgba(249,115,22,0.35)', strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone" dataKey="Advanced" stroke="rgba(249,115,22,0.75)"
                    strokeWidth={2} strokeDasharray="6 3"
                    dot={{ r: 3, fill: 'rgba(249,115,22,0.75)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'rgba(249,115,22,0.85)', strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone" dataKey="Expert" stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#f97316', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#f97316', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      {/* ── Row 3: Team Rankings + Top Platform | Platform Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">

          {/* Team Coverage Rankings */}
          <div className="card glass rounded-2xl overflow-hidden flex flex-col flex-1">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-primary">Team Rankings</h3>
            </div>
            {teamCoverage.length === 0 ? (
              <div className="p-4 text-center text-muted-c text-sm italic">No teams yet.</div>
            ) : (() => {
              const ranked = [...teamCoverage].sort((a, b) => b.avgCoverage - a.avgCoverage)
              const top = ranked[0]
              const chartData = ranked.map(t => ({
                team: t.team.length > 8 ? t.team.slice(0, 7) + '…' : t.team,
                fullTeam: t.team,
                coverage: t.avgCoverage,
              }))
              return (
                <div className="p-4 flex items-start gap-3 flex-1">
                  {/* Top team ring */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-2">
                    <CoverageRing value={top.avgCoverage} size="sm" />
                    <div className="text-[9px] font-bold text-muted-c uppercase tracking-widest text-center w-[72px] truncate">{top.team}</div>
                  </div>
                  {/* Area chart */}
                  <div className="flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="teamRankGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="team" tick={{ fontSize: 8, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
                                <div className="font-bold text-primary">{d.fullTeam}</div>
                                <div className="text-orange-400 font-bold mt-0.5">{d.coverage}% avg coverage</div>
                              </div>
                            )
                          }}
                          cursor={{ stroke: 'rgba(249,115,22,0.2)', strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="coverage" stroke="#f97316" strokeWidth={2}
                          fill="url(#teamRankGrad)"
                          dot={{ r: 2.5, fill: '#f97316', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Top Platform */}
          {topPlatform && (() => {
            const chartData = [
              { level: 'INT', count: topPlatform.int },
              { level: 'ADV', count: topPlatform.adv },
              { level: 'EXP', count: topPlatform.exp },
            ]
            return (
              <div className="card glass rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-primary">Top Platform</h3>
                </div>
                <div className="p-4 flex items-center gap-4 flex-1">
                  <div className="shrink-0 space-y-2">
                    <div className="text-xl font-display font-bold text-primary">{topPlatform.platform}</div>
                    <div className="flex flex-col gap-1">
                      <span className="badge-orange text-[10px]">{topPlatform.total} Skills</span>
                      <span className="text-[10px] text-muted-c">{topPlatform.exp} Expert · {topPlatform.adv} Adv</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height={80}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="topPlatGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="level" tick={{ fontSize: 8, fill: 'rgb(var(--text-muted))' }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
                                <div className="font-bold text-primary">{payload[0].payload.level}</div>
                                <div className="text-orange-400 font-bold mt-0.5">{payload[0].value} designers</div>
                              </div>
                            )
                          }}
                          cursor={{ stroke: 'rgba(249,115,22,0.2)', strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2}
                          fill="url(#topPlatGrad)"
                          dot={{ r: 2.5, fill: '#f97316', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Platform breakdown table */}
        <div className="card glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-primary">Platform Breakdown</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2/40 border-b border-border">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-c uppercase tracking-widest">Platform</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-muted-c uppercase tracking-widest">INT</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-muted-c uppercase tracking-widest">ADV</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-muted-c uppercase tracking-widest">EXP</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-muted-c uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {[...distribution]
                  .sort((a, b) => b.total - a.total)
                  .map(d => {
                    const maxT = Math.max(...distribution.map(x => x.total), 1)
                    return (
                      <tr key={d.platform} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-primary">{d.platform}</div>
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
                            <div
                              className="h-full rounded-full bg-orange-500/50 transition-all duration-500"
                              style={{ width: `${Math.round((d.total / maxT) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-bold text-orange-400/60 tabular-nums">{d.int || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-bold text-orange-400 tabular-nums">{d.adv || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-bold text-orange-500 tabular-nums">{d.exp || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-bold text-primary tabular-nums">{d.total}</span>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 4: Skill Matrix ── */}
        <div className="card glass rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-2/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c z-10" />
                <input
                  className="input h-9 pl-9 text-xs"
                  placeholder="Filter by name or team..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {['ALL', ...allPlatforms].map(p => (
                  <button key={p} onClick={() => setPlatFilter(p)} className={cn('chip whitespace-nowrap', platFilter === p && 'active')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">
              {filteredDesigners.length} × {visiblePlatforms.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2/30">
                  <th className="sticky left-0 z-20 bg-surface border-r border-border p-4 w-40 min-w-[140px] sm:w-64 sm:min-w-[200px]">
                    <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">Designer</div>
                  </th>
                  {visiblePlatforms.map(p => (
                    <th key={p} className="p-4 border-b border-border min-w-[120px]">
                      <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest flex items-center justify-between group">
                        {p}
                        {!BASE_PLATFORMS.includes(p) && can('canAddEditTrainings') && (
                          <button
                            onClick={() => setPlatformToDelete(p)}
                            disabled={saving}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDesigners.map(d => (
                  <tr key={d.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-surface border-r border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {initials(d.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-primary truncate">{d.name}</div>
                          <div className="text-[9px] text-muted-c font-bold uppercase tracking-widest">{d.team || 'None'}</div>
                        </div>
                      </div>
                    </td>
                    {visiblePlatforms.map(p => {
                      const skill = designerSkills.find(s => s.designer_id === d.id && s.platform === p)
                      const level = skill?.level ?? null
                      return (
                        <td key={p} className="p-2 border-b border-border-subtle">
                          <button
                            onClick={() => setEditTarget({ designer: d, platform: p })}
                            disabled={!can('canAddEditTrainings')}
                            className={cn(
                              'w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                              level === 'Expert'       ? 'bg-orange-gradient text-white shadow-orange-sm' :
                              level === 'Advanced'     ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                              level === 'Intermediate' ? 'bg-orange-500/5 text-orange-500/60 border border-orange-500/10' :
                              'text-muted-c hover:bg-surface-2',
                            )}
                          >
                            {level ? LEVEL_SHORT[level] || '✓' : '—'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editTarget && (
          <SkillEditModal
            designer={editTarget.designer}
            platform={editTarget.platform}
            skill={designerSkills.find(s => s.designer_id === editTarget.designer.id && s.platform === editTarget.platform) || null}
            onClose={() => setEditTarget(null)}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {platformToDelete && (
          <ConfirmModal
            title="Delete Platform"
            message={<>All skill records for <span className="font-semibold text-primary">"{platformToDelete}"</span> will be permanently deleted for every designer. This cannot be undone.</>}
            confirmLabel="Delete Platform"
            danger
            loading={saving}
            onConfirm={confirmDeletePlatform}
            onCancel={() => setPlatformToDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
