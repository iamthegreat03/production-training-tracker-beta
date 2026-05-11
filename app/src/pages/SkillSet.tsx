import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Search, Download, Trash2, Shield,
  TrendingUp, Users, Target, Info, X
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, initials, pct } from '@/lib/utils'
import type { Designer, DesignerSkill, SkillLevel } from '@/types/database'
import SkillEditModal from '@/components/skillset/SkillEditModal'

const BASE_PLATFORMS = ['Clickfunnels', 'GoHighLevel', 'Shopify', 'Wix', 'Wordpress']
const LEVELS: SkillLevel[] = ['Intermediate', 'Advanced', 'Expert']
const LEVEL_SHORT: Record<string, string> = { 'Intermediate': 'INT', 'Advanced': 'ADV', 'Expert': 'EXP' }

export default function SkillSet() {
  const { state, loadAll, can } = useApp()
  const { designers, designerSkills, teams } = state

  const [search, setSearch] = useState('')
  const [platFilter, setPlatFilter] = useState('ALL')
  const [editTarget, setEditTarget] = useState<{ designer: Designer, platform: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // 1. Identify all unique platforms (Base + Dynamic)
  const dynamicPlatforms = useMemo(() => {
    const set = new Set<string>()
    designerSkills.forEach(s => {
      if (!BASE_PLATFORMS.includes(s.platform) && !s.platform.startsWith('DSG:')) {
        set.add(s.platform)
      }
    })
    return Array.from(set).sort()
  }, [designerSkills])

  const allPlatforms = [...BASE_PLATFORMS, ...dynamicPlatforms]

  // 2. Identify DSG columns
  const dsgColumns = useMemo(() => {
    const set = new Set<string>()
    designerSkills.forEach(s => {
      if (s.platform.startsWith('DSG:')) set.add(s.platform.replace('DSG: ', ''))
    })
    return Array.from(set).sort()
  }, [designerSkills])

  // 3. Filtered designers
  const filteredDesigners = useMemo(() => {
    let list = [...designers]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.name.toLowerCase().includes(q) || (d.team ?? '').toLowerCase().includes(q))
    }
    return list
  }, [designers, search])

  // 4. Team Coverage stats
  const teamCoverage = useMemo(() => {
    return teams.map(team => {
      const members = designers.filter(d => d.team === team.name)
      const platformStats = BASE_PLATFORMS.map(p => {
        const hasSkill = members.filter(m => 
          designerSkills.some(s => s.designer_id === m.id && s.platform === p)
        ).length
        return { platform: p, pct: pct(hasSkill, members.length) }
      })
      return { team: team.name, platformStats }
    })
  }, [teams, designers, designerSkills])

  // 5. Global Distribution stats
  const distribution = useMemo(() => {
     return BASE_PLATFORMS.map(p => {
        const platformSkills = designerSkills.filter(s => s.platform === p)
        const int = platformSkills.filter(s => s.level === 'Intermediate').length
        const adv = platformSkills.filter(s => s.level === 'Advanced').length
        const exp = platformSkills.filter(s => s.level === 'Expert').length
        return { platform: p, int, adv, exp, total: platformSkills.length }
     })
  }, [designerSkills])

  // --- Actions ---
  async function deletePlatform(platform: string) {
    if (!confirm(`Delete all skill records for "${platform}"? This cannot be undone.`)) return
    setSaving(true)
    const { error } = await supabase.from('designer_skills').delete().eq('platform', platform)
    setSaving(false)
    if (error) { alert(error.message); return }
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skill-matrix-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Skill Set</h1>
          <p className="page-subtitle">Expertise matrix and team coverage analysis</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={exportCSV} className="btn-outline h-10 px-4 gap-2">
              <Download className="w-4 h-4" /> Export CSV
           </button>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="card rounded-2xl flex flex-col overflow-hidden">
        {/* Matrix Controls */}
        <div className="p-4 border-b border-border bg-surface-2/50 flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c" />
                 <input className="input h-9 pl-9 text-xs" placeholder="Filter by name or team..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                 {['ALL', ...BASE_PLATFORMS].map(p => (
                   <button key={p} onClick={() => setPlatFilter(p)} className={cn('chip whitespace-nowrap', platFilter === p && 'active')}>
                      {p}
                   </button>
                 ))}
              </div>
           </div>
           <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">
              Matrix: {filteredDesigners.length} Designers × {allPlatforms.length} Platforms
           </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-surface-2/30">
                    <th className="sticky left-0 z-20 bg-surface border-r border-border p-4 w-64 min-w-[200px]">
                       <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest">Designer</div>
                    </th>
                    {allPlatforms.map(p => (
                      <th key={p} className="p-4 border-b border-border min-w-[120px]">
                         <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest flex items-center justify-between group">
                            {p}
                            {!BASE_PLATFORMS.includes(p) && can('canAddEditTrainings') && (
                              <button
                                onClick={() => deletePlatform(p)}
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
                      {allPlatforms.map(p => {
                        const skill = designerSkills.find(s => s.designer_id === d.id && s.platform === p)
                        const level = skill?.level ?? null
                        return (
                          <td key={p} className="p-2 border-b border-border-subtle">
                             <button
                               onClick={() => setEditTarget({ designer: d, platform: p })}
                               disabled={!can('canAddEditTrainings')}
                               className={cn(
                                 'w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                                 level === 'Expert' ? 'bg-orange-gradient text-white shadow-orange-sm' :
                                 level === 'Advanced' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                 level === 'Intermediate' ? 'bg-orange-500/5 text-orange-500/60 border border-orange-500/10' :
                                 'text-muted-c hover:bg-surface-2'
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

      {/* Secondary Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Team Skill Coverage */}
         <div className="card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-400" />
               <h3 className="text-sm font-bold text-primary">Team Skill Coverage</h3>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto">
               {teamCoverage.map(t => (
                 <div key={t.team} className="space-y-3">
                    <div className="text-xs font-bold text-primary">{t.team}</div>
                    <div className="grid grid-cols-5 gap-2">
                       {t.platformStats.map(ps => (
                         <div key={ps.platform} className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter text-muted-c">
                               <span>{ps.platform.slice(0, 4)}</span>
                               <span>{ps.pct}%</span>
                            </div>
                            <div className="progress-track h-1">
                               <div className="progress-fill" style={{ width: `${ps.pct}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Designer Skill Gaps (Discussion History) */}
         <div className="card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center gap-2">
               <Shield className="w-4 h-4 text-purple-400" />
               <h3 className="text-sm font-bold text-primary">Discussion History (Skill Gap)</h3>
            </div>
            <div className="p-4 overflow-x-auto">
               {dsgColumns.length === 0 ? (
                 <div className="py-12 text-center text-muted-c text-sm italic">No completed discussion trainings found.</div>
               ) : (
                 <table className="w-full text-left text-[10px]">
                    <thead>
                       <tr>
                          <th className="pb-2 text-muted-c uppercase tracking-widest font-bold">Designer</th>
                          {dsgColumns.map(c => (
                            <th key={c} className="pb-2 text-muted-c uppercase tracking-widest font-bold text-center px-2">{c}</th>
                          ))}
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                       {designers.slice(0, 15).map(d => (
                         <tr key={d.id} className="hover:bg-surface-2/50 transition-colors">
                            <td className="py-2 text-primary font-medium">{d.name}</td>
                            {dsgColumns.map(c => {
                              const has = designerSkills.some(s => s.designer_id === d.id && s.platform === `DSG: ${c}`)
                              return (
                                <td key={c} className="py-2 text-center">
                                   {has ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-muted-c/20">—</span>}
                                </td>
                              )
                            })}
                         </tr>
                       ))}
                    </tbody>
                 </table>
               )}
            </div>
         </div>
      </div>

      {/* Global Skill Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
         {distribution.map(d => (
           <div key={d.platform} className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                 <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{d.platform}</h4>
                 <div className="text-[10px] font-bold text-muted-c">{d.total} Skills</div>
              </div>
              <div className="space-y-2">
                 {[
                   { label: 'INT', count: d.int, color: 'bg-orange-500/20' },
                   { label: 'ADV', count: d.adv, color: 'bg-orange-500/50' },
                   { label: 'EXP', count: d.exp, color: 'bg-orange-gradient' }
                 ].map(l => (
                    <div key={l.label} className="space-y-1">
                       <div className="flex items-center justify-between text-[9px] font-bold text-muted-c">
                          <span>{l.label}</span>
                          <span>{l.count}</span>
                       </div>
                       <div className="progress-track h-1 bg-surface-2">
                          <div className={cn('h-full rounded-full', l.color)} style={{ width: `${pct(l.count, designers.length)}%` }} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
         ))}
      </div>

      {/* Edit Modal */}
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
    </div>
  )
}
