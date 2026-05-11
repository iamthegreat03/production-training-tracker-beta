import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, ArrowLeftRight, Trash2, Plus,
  ChevronRight, TrendingUp, Info, X
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, pct, initials } from '@/lib/utils'
import type { Team, Designer } from '@/types/database'

export default function Teams() {
  const { state, loadAll, can } = useApp()
  const { teams, designers, attendance } = state

  const [reshuffleMode, setReshuffleMode] = useState(false)
  const [reshuffleChanges, setReshuffleChanges] = useState<Record<string, string | null>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)

  // Compute team statistics
  const teamData = useMemo(() => {
    return teams.map(team => {
      const members = designers.map(d => {
        const pendingTeam = reshuffleChanges[d.id]
        const currentTeam = d.team
        const finalTeam = reshuffleChanges.hasOwnProperty(d.id) ? pendingTeam : currentTeam
        return { ...d, finalTeam }
      }).filter(d => d.finalTeam === team.name)

      const memberIds = new Set(members.map(d => d.id))
      const teamAtt = attendance.filter(a => a.designer_id && memberIds.has(a.designer_id))
      const present = teamAtt.filter(a => a.is_present === 'true' || a.is_present === 'late').length
      const marked = teamAtt.filter(a => a.is_present !== null).length
      
      return {
        ...team,
        members,
        rate: pct(present, marked)
      }
    }).sort((a, b) => b.rate - a.rate)
  }, [teams, designers, attendance, reshuffleChanges])

  const uncategorizedMembers = useMemo(() => {
    return designers.map(d => {
      const pendingTeam = reshuffleChanges[d.id]
      const currentTeam = d.team
      const finalTeam = reshuffleChanges.hasOwnProperty(d.id) ? pendingTeam : currentTeam
      return { ...d, finalTeam }
    }).filter(d => !d.finalTeam)
  }, [designers, reshuffleChanges])

  // --- Actions ---
  function startReshuffle(did: string, currentTeam: string | null) {
     if (!reshuffleMode) return
     // This would normally open a small popover to pick a new team
  }

  async function saveReshuffle() {
     setSaving(true)
     const updates = Object.entries(reshuffleChanges).map(([id, team]) => 
        supabase.from('designers').update({ team }).eq('id', id)
     )
     await Promise.all(updates)
     await loadAll()
     setReshuffleChanges({})
     setReshuffleMode(false)
     setSaving(false)
  }

  async function handleAddTeam() {
     if (!newTeamName.trim()) return
     setSaving(true)
     await supabase.from('teams').insert({ name: newTeamName.trim() })
     await loadAll()
     setNewTeamName('')
     setShowAddModal(false)
     setSaving(false)
  }

  async function handleDeleteTeam(team: Team) {
     const count = designers.filter(d => d.team === team.name).length
     if (!confirm(`Delete team "${team.name}"? ${count} designers will be moved to Uncategorized.`)) return
     
     setSaving(true)
     // 1. Move designers to null
     await supabase.from('designers').update({ team: null }).eq('team', team.name)
     // 2. Delete team
     await supabase.from('teams').delete().eq('id', team.id)
     await loadAll()
     setSaving(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Teams</h1>
          <p className="page-subtitle">Analyze performance and manage team rosters</p>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={() => { setReshuffleMode(!reshuffleMode); setReshuffleChanges({}) }}
             className={cn('btn-outline h-10 px-4 gap-2', reshuffleMode && 'border-orange-500 text-orange-500 bg-orange-500/5')}
           >
             <ArrowLeftRight className="w-4 h-4" /> {reshuffleMode ? 'Cancel Reshuffle' : 'Reshuffle Mode'}
           </button>
           {can('canManageUsers') && (
             <button className="btn-primary" onClick={() => setShowAddModal(true)}>
               <Plus className="w-4 h-4" /> Add Team
             </button>
           )}
        </div>
      </div>

      {reshuffleMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 flex items-center justify-between"
        >
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                 <Info className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                 <div className="text-sm font-bold text-primary">Reshuffle Mode Active</div>
                 <div className="text-xs text-muted-c">Click a designer's name to move them to a different team. {Object.keys(reshuffleChanges).length} pending changes.</div>
              </div>
           </div>
           <button className="btn-primary h-9 px-6" onClick={saveReshuffle} disabled={saving || Object.keys(reshuffleChanges).length === 0}>
              {saving ? 'Saving...' : 'Apply Changes'}
           </button>
        </motion.div>
      )}

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamData.map((team, i) => (
          <TeamCard
            key={team.id}
            team={team}
            reshuffleMode={reshuffleMode}
            allTeams={teams}
            onMove={(did, t) => setReshuffleChanges(prev => ({ ...prev, [did]: t }))}
            onDelete={() => handleDeleteTeam(team)}
            canManage={can('canManageUsers')}
            index={i}
          />
        ))}

        {uncategorizedMembers.length > 0 && (
          <TeamCard
             team={{ id: 'uncategorized', name: 'Uncategorized', members: uncategorizedMembers, rate: 0 } as any}
             reshuffleMode={reshuffleMode}
             allTeams={teams}
             onMove={(did, t) => setReshuffleChanges(prev => ({ ...prev, [did]: t }))}
             onDelete={() => {}}
             canManage={false}
             index={teamData.length}
          />
        )}
      </div>

      {/* Add Team Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               onClick={e => e.stopPropagation()}
               className="glass rounded-2xl w-full max-w-sm p-6"
             >
                <div className="flex items-center justify-between mb-4">
                   <h2 className="font-display font-bold text-primary">New Team</h2>
                   <button onClick={() => setShowAddModal(false)} className="text-muted-c"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-c">Team Name</label>
                      <input className="input" autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Alpha, Bravo, etc." />
                   </div>
                   <button className="btn-primary w-full py-2.5" onClick={handleAddTeam} disabled={saving || !newTeamName.trim()}>
                      {saving ? 'Creating...' : 'Create Team'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TeamCard({ team, reshuffleMode, allTeams, onMove, onDelete, canManage, index }: {
  team: Team & { members: any[], rate: number }
  reshuffleMode: boolean
  allTeams: Team[]
  onMove: (did: string, t: string | null) => void
  onDelete: () => void
  canManage: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="card flex flex-col h-full overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-surface-2/50">
         <div className="flex items-start justify-between mb-3">
            <div>
               <h3 className="font-display font-bold text-primary">{team.name}</h3>
               <div className="text-[10px] text-muted-c font-medium uppercase tracking-widest mt-0.5">{team.members.length} members</div>
            </div>
            {canManage && team.name !== 'Uncategorized' && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-c hover:text-red-400 transition-all">
                 <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
         </div>
         
         <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-muted-c uppercase tracking-widest">Attendance</span>
            <span className="text-xs font-bold text-orange-500">{team.rate}%</span>
         </div>
         <div className="progress-track">
            <div className="progress-fill" style={{ width: `${team.rate}%` }} />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[300px]">
         {team.members.length === 0 ? (
            <div className="py-6 text-center text-[10px] text-muted-c uppercase tracking-widest italic">No members</div>
         ) : (
           team.members.map(m => (
             <div key={m.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-surface-2 transition-all">
                <div className="flex items-center gap-2 min-w-0">
                   <div className="w-6 h-6 rounded-full bg-orange-gradient flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                      {initials(m.name)}
                   </div>
                   <span className="text-xs font-medium text-primary truncate">{m.name}</span>
                </div>
                
                {reshuffleMode ? (
                  <select
                    className="text-[9px] bg-orange-500/10 text-orange-500 border-none rounded px-1.5 py-0.5 font-bold uppercase cursor-pointer"
                    value={team.name}
                    onChange={(e) => onMove(m.id, e.target.value || null)}
                  >
                    <option value={team.name}>{team.name.slice(0, 3)}</option>
                    {allTeams.filter(t => t.name !== team.name).map(t => (
                      <option key={t.id} value={t.name}>{t.name.slice(0, 3)}</option>
                    ))}
                    {team.name !== 'Uncategorized' && <option value="">UNC</option>}
                  </select>
                ) : (
                  <span className="text-[10px] font-bold text-muted-c opacity-0 group-hover:opacity-100 transition-opacity">
                    Tier {m.rank.slice(-1)}
                  </span>
                )}
             </div>
           ))
         )}
      </div>
    </motion.div>
  )
}
