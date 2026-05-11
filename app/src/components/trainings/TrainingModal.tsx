import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Zap, MessageSquare, Plus, Calendar, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { cn, dayName, initials, fmtDs } from '@/lib/utils'
import type { Training, TrainingType, SkillLevel, TrainingStatus } from '@/types/database'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const LEVELS: SkillLevel[] = ['Intermediate', 'Advanced', 'Expert']
const STATUSES: TrainingStatus[] = ['upcoming', 'active', 'completed']
const PLATFORMS = ['Clickfunnels', 'GoHighLevel', 'Shopify', 'Wix', 'Wordpress']

interface Props {
  training: Training | null
  onClose: () => void
  onSaved: () => void
}

export default function TrainingModal({ training, onClose, onSaved }: Props) {
  const { state } = useApp()
  const { designers, teams, enrollments } = state

  // --- Form State ---
  const [type, setType] = useState<TrainingType>(training?.type ?? 'Hands-On')
  const [name, setName] = useState(training?.name ?? '')
  const [platform, setPlatform] = useState(training?.platform ?? '')
  const [topic, setTopic] = useState(training?.topic ?? '')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(training?.skill_level as SkillLevel ?? 'Intermediate')
  const [startDate, setStartDate] = useState(training?.start_date ?? '')
  const [targetDate, setTargetDate] = useState(training?.target_date ?? '')
  const [status, setStatus] = useState<TrainingStatus>(training?.status ?? 'upcoming')
  const [notes, setNotes] = useState(training?.notes ?? '')
  const [schedule, setSchedule] = useState<string[]>(training?.schedule ?? [])
  
  // Discussion specific
  const [newDiscDate, setNewDiscDate] = useState('')

  // Enrollment state
  // Map of designerId -> schedule subset
  const [enrolled, setEnrolled] = useState<Record<string, string[]>>(() => {
    if (!training) return {}
    const map: Record<string, string[]> = {}
    enrollments
      .filter(e => e.training_id === training.id)
      .forEach(e => { if(e.designer_id) map[e.designer_id] = e.designer_schedule ?? [] })
    return map
  })

  // UI state
  const [step, setStep] = useState(1) // 1: Info, 2: Enroll
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isHandsOn = type === 'Hands-On'

  // --- Actions ---
  function toggleDay(day: string) {
    setSchedule(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function addDiscDate() {
    if (!newDiscDate || schedule.includes(newDiscDate)) return
    setSchedule(prev => [...prev, newDiscDate].sort())
    setNewDiscDate('')
  }

  function toggleEnroll(did: string) {
    setEnrolled(prev => {
      const next = { ...prev }
      if (next[did]) delete next[did]
      else next[did] = [...schedule] // Default to full schedule
      return next
    })
  }

  function toggleDesignerDay(did: string, day: string) {
    setEnrolled(prev => {
      const current = prev[did] ?? []
      const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
      return { ...prev, [did]: next }
    })
  }

  async function handleSave() {
    if (!name.trim()) { setError('Training name is required'); setStep(1); return }
    if (schedule.length === 0) { setError('Please add at least one session day/date'); setStep(1); return }
    
    setSaving(true); setError('')
    try {
      const payload = {
        name: name.trim(),
        type,
        platform: isHandsOn ? platform : null,
        topic: !isHandsOn ? topic : null,
        skill_level: isHandsOn ? skillLevel : null,
        start_date: startDate || null,
        target_date: targetDate || null,
        status,
        notes: notes.trim() || null,
        schedule,
        updated_at: new Date().toISOString()
      }

      let trainingId = training?.id
      if (training) {
        await supabase.from('trainings').update(payload).eq('id', training.id)
      } else {
        const { data } = await supabase.from('trainings').insert(payload).select().single()
        trainingId = data?.id
      }

      if (!trainingId) throw new Error('Failed to save training')

      // Save Enrollments
      // 1. Delete old
      if (training) {
        await supabase.from('training_enrollments').delete().eq('training_id', trainingId)
      }
      
      // 2. Insert new
      const enrollRows = Object.entries(enrolled).map(([did, sched]) => ({
        training_id: trainingId,
        designer_id: did,
        designer_schedule: sched
      }))
      
      if (enrollRows.length > 0) {
        await supabase.from('training_enrollments').insert(enrollRows)
      }

      // 3. Auto-generate sessions if new or status changed to active
      // In a real app, this logic might be more complex (preventing duplicates)
      // For now, let's just trigger a reload
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  // --- Filtering ---
  const visibleDesigners = useMemo(() => {
    let list = designers.filter(d => {
      if (teamFilter !== 'ALL' && d.team !== teamFilter) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    return list
  }, [designers, teamFilter, search])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-primary">
              {training ? 'Edit Training' : 'New Training'}
            </h2>
            <div className="flex gap-4 mt-1">
              <button onClick={() => setStep(1)} className={cn('text-[10px] font-bold uppercase tracking-widest transition-colors', step === 1 ? 'text-orange-500' : 'text-muted-c')}>
                1. Program Details
              </button>
              <button onClick={() => setStep(2)} className={cn('text-[10px] font-bold uppercase tracking-widest transition-colors', step === 2 ? 'text-orange-500' : 'text-muted-c')}>
                2. Enrollment ({Object.keys(enrolled).length})
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                {/* Type Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setType('Hands-On')}
                    className={cn('flex-1 btn-outline h-12 flex-col gap-0 items-start px-4', type === 'Hands-On' && 'border-orange-500/50 bg-orange-500/5 text-orange-500')}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5"><Zap className="w-3 h-3" /> Hands-On</span>
                    <span className="text-[10px] opacity-60">Recurring skills training</span>
                  </button>
                  <button
                    onClick={() => setType('Discussion')}
                    className={cn('flex-1 btn-outline h-12 flex-col gap-0 items-start px-4', type === 'Discussion' && 'border-purple-500/50 bg-purple-500/5 text-purple-500')}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Discussion</span>
                    <span className="text-[10px] opacity-60">Knowledge sharing / AMA</span>
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Training Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CF Advanced mastery" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {isHandsOn ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Platform</label>
                        <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
                          <option value="">Select Platform...</option>
                          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Award Level</label>
                        <select className="input" value={skillLevel} onChange={e => setSkillLevel(e.target.value as SkillLevel)}>
                          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Topic / Agenda</label>
                      <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="What will be discussed?" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Start Date</label>
                    <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Target Date</label>
                    <input type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">Status</label>
                    <select className="input" value={status} onChange={e => setStatus(e.target.value as TrainingStatus)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-1.5 p-4 rounded-xl bg-surface-2 border border-border">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">
                    {isHandsOn ? 'Recurring Schedule' : 'Session Dates'}
                  </label>
                  
                  {isHandsOn ? (
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={cn('chip h-8 px-4', schedule.includes(day) && 'active')}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="date" className="input h-9" value={newDiscDate} onChange={e => setNewDiscDate(e.target.value)} />
                        <button onClick={addDiscDate} className="btn-outline h-9 px-4 shrink-0"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {schedule.map(date => (
                          <div key={date} className="chip active pr-1 gap-2">
                            <span>{fmtDs(date)}</span>
                            <button onClick={() => setSchedule(prev => prev.filter(d => d !== date))} className="p-1 hover:text-white"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                {/* Enrollment Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c" />
                    <input className="input pl-9 h-9" placeholder="Search designers..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="input h-9 w-32" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                    <option value="ALL">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>

                {/* Designer List */}
                <div className="space-y-2 border-t border-border pt-4">
                  {visibleDesigners.map(d => {
                    const isEnrolled = !!enrolled[d.id]
                    return (
                      <div key={d.id} className={cn('p-3 rounded-xl border transition-all', isEnrolled ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-surface')}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isEnrolled}
                              onChange={() => toggleEnroll(d.id)}
                              className="w-4 h-4 rounded text-orange-500 bg-surface-2 border-border focus:ring-orange-500"
                            />
                            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-[10px] font-bold">
                              {initials(d.name)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-primary leading-none">{d.name}</div>
                              <div className="text-[10px] text-muted-c mt-1">{d.team || 'Uncategorized'}</div>
                            </div>
                          </div>
                          {isEnrolled && (
                            <div className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                              ENROLLED
                            </div>
                          )}
                        </div>

                        {/* Designer's Schedule Subset */}
                        {isEnrolled && (
                          <div className="flex flex-wrap gap-1 mt-2 ml-12">
                            {schedule.map(item => {
                              const active = enrolled[d.id].includes(item)
                              return (
                                <button
                                  key={item}
                                  onClick={() => toggleDesignerDay(d.id, item)}
                                  className={cn(
                                    'text-[9px] font-bold uppercase tracking-tighter px-2 py-1 rounded-md transition-all',
                                    active ? 'bg-orange-500 text-white' : 'bg-surface-2 text-muted-c'
                                  )}
                                >
                                  {isHandsOn ? item.slice(0, 3) : fmtDs(item)}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex items-center justify-between bg-surface-2/50 shrink-0">
          <div className="text-xs text-muted-c">
            {step === 1 ? 'Step 1 of 2' : `Step 2 of 2 — ${Object.keys(enrolled).length} Enrolled`}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost h-10 px-6" onClick={onClose}>Cancel</button>
            {step === 1 ? (
              <button className="btn-primary h-10 px-6" onClick={() => setStep(2)}>Next: Enrollment</button>
            ) : (
              <button className="btn-primary h-10 px-6" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : training ? 'Save Changes' : 'Create Training'}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <X className="w-3 h-3 cursor-pointer" onClick={() => setError('')} />
            {error}
          </div>
        )}
      </motion.div>
    </div>
  )
}
