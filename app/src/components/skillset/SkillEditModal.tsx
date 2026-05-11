import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Star, Trash2, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Designer, DesignerSkill, SkillLevel } from '@/types/database'

const LEVELS: SkillLevel[] = ['Intermediate', 'Advanced', 'Expert']

interface Props {
  designer: Designer
  platform: string
  skill: DesignerSkill | null
  onClose: () => void
  onSaved: () => void
}

export default function SkillEditModal({ designer, platform, skill, onClose, onSaved }: Props) {
  const [level, setLevel] = useState<SkillLevel>(skill?.level ?? 'Intermediate')
  const [source, setSource] = useState(skill?.source ?? 'Manual Override')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    
    const payload = {
      designer_id: designer.id,
      platform,
      level,
      source: source.trim() || 'Manual Override',
      updated_at: new Date().toISOString()
    }

    const { error: err } = await supabase.from('designer_skills').upsert(payload, { onConflict: 'designer_id,platform' })
    
    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onSaved()
      onClose()
    }
  }

  async function handleDelete() {
    if (!skill) return
    setSaving(true)
    const { error: err } = await supabase.from('designer_skills').delete().eq('id', skill.id)
    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
                 <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                 <h2 className="font-display font-bold text-primary leading-tight">{platform}</h2>
                 <p className="text-[10px] text-muted-c font-bold uppercase tracking-widest">{designer.name}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
              <X className="w-4 h-4" />
           </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5">
           {confirmDel ? (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-4">
                <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
                <div className="space-y-1">
                   <div className="text-sm font-bold text-red-400 uppercase">Confirm Removal</div>
                   <p className="text-xs text-muted-c">Permanently remove this skill record from {designer.name}'s profile?</p>
                </div>
                <div className="flex gap-2">
                   <button className="btn-ghost flex-1 h-9" onClick={() => setConfirmDel(false)}>Back</button>
                   <button className="btn-primary flex-1 h-9 bg-red-500 shadow-red-500/20" onClick={handleDelete} disabled={saving}>
                      {saving ? 'Deleting...' : 'Delete Skill'}
                   </button>
                </div>
             </motion.div>
           ) : (
             <>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Skill Level</label>
                  <div className="grid grid-cols-3 gap-2">
                     {LEVELS.map(l => (
                       <button
                         key={l}
                         onClick={() => setLevel(l)}
                         className={cn(
                           'py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all',
                           level === l ? 'bg-orange-gradient text-white border-orange-500 shadow-orange-sm' : 'bg-surface-2 border-border text-muted-c hover:border-orange-500/30'
                         )}
                       >
                         {l}
                       </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Source / Note</label>
                  <input className="input" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. CF Mastery Training" />
               </div>

               {error && <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}

               <div className="flex gap-2 pt-2">
                  {skill && (
                    <button onClick={() => setConfirmDel(true)} className="btn-outline h-10 w-12 border-red-500/20 text-red-400 hover:bg-red-500/5">
                       <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button className="btn-primary flex-1 h-10" onClick={handleSave} disabled={saving}>
                     {saving ? 'Saving...' : skill ? 'Update Skill' : 'Add Skill'}
                  </button>
               </div>
             </>
           )}
        </div>
      </motion.div>
    </div>
  )
}
