import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BookOpen, Calendar, Clock, CheckCircle2,
  MoreVertical, Users, MessageSquare, Zap, Target, PauseCircle,
  LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown, Pencil,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, fmtDs } from '@/lib/utils'
import type { Training, TrainingStatus } from '@/types/database'
import TrainingModal from '@/components/trainings/TrainingModal'
import TrainingDetail from '@/components/trainings/TrainingDetail'
import { toast } from 'sonner'

type Layout = 'kanban' | 'table'
type SortCol = 'name' | 'type' | 'status' | 'focus' | 'start' | 'enrolled'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG: Record<TrainingStatus, { label: string; color: string; badge: string; icon: any }> = {
  upcoming:  { label: 'Upcoming',  color: 'text-blue-400',    badge: 'badge-blue',    icon: Calendar },
  active:    { label: 'Active',    color: 'text-orange-400',  badge: 'badge-orange',  icon: Zap },
  'on-hold': { label: 'On Hold',   color: 'text-amber-400',   badge: 'badge-amber',   icon: PauseCircle },
  completed: { label: 'Completed', color: 'text-emerald-400', badge: 'badge-emerald', icon: CheckCircle2 },
}

export default function Trainings() {
  const { state, loadAll, can } = useApp()
  const { trainings, enrollments } = state

  const [layout, setLayout] = useState<Layout>('kanban')
  const [editTarget, setEditTarget] = useState<Training | null | 'new'>(null)
  const [detailTarget, setDetailTarget] = useState<Training | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TrainingStatus | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const columns: TrainingStatus[] = ['upcoming', 'active', 'on-hold', 'completed']

  const enrolledCount = (id: string) => enrollments.filter(e => e.training_id === id).length

  const grouped = useMemo(() => {
    const map: Record<TrainingStatus, Training[]> = { upcoming: [], active: [], 'on-hold': [], completed: [] }
    trainings.forEach(t => { if (map[t.status]) map[t.status].push(t) })
    return map
  }, [trainings])

  const sorted = useMemo(() => {
    const STATUS_ORDER: Record<TrainingStatus, number> = { active: 0, upcoming: 1, 'on-hold': 2, completed: 3 }
    return [...trainings].sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      switch (sortCol) {
        case 'name':     av = a.name;                       bv = b.name; break
        case 'type':     av = a.type;                       bv = b.type; break
        case 'status':   av = STATUS_ORDER[a.status] ?? 9; bv = STATUS_ORDER[b.status] ?? 9; break
        case 'focus':    av = a.platform || a.topic || '';  bv = b.platform || b.topic || ''; break
        case 'start':    av = a.start_date || '';           bv = b.start_date || ''; break
        case 'enrolled': av = enrolledCount(a.id);          bv = enrolledCount(b.id); break
      }
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [trainings, enrollments, sortCol, sortDir])

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  async function moveTraining(newStatus: TrainingStatus) {
    if (!dragId) return
    const t = trainings.find(t => t.id === dragId)
    if (!t || t.status === newStatus) return
    const { error } = await supabase.from('trainings').update({ status: newStatus }).eq('id', dragId)
    if (error) toast.error(error.message)
    else await loadAll()
  }

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />
  }

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0 max-w-7xl mx-auto w-full">
        <div>
          <h1 className="page-title font-display">Trainings</h1>
          <p className="page-subtitle">Manage skill programs and discussion sessions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex p-1 rounded-xl bg-surface-2 border border-border">
            <button
              onClick={() => setLayout('kanban')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                layout === 'kanban' ? 'bg-surface shadow-sm text-orange-500' : 'text-muted-c hover:text-primary'
              )}
              title="Board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('table')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                layout === 'table' ? 'bg-surface shadow-sm text-orange-500' : 'text-muted-c hover:text-primary'
              )}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {can('canAddEditTrainings') && (
            <button className="btn-primary" onClick={() => setEditTarget('new')}>
              <Plus className="w-4 h-4" /> Create Training
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {layout === 'kanban' ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex gap-4 overflow-x-auto pb-4 min-h-0"
          >
            {columns.map(status => {
              const isDragTarget = dragOverCol === status && dragId !== null
              const cfg = STATUS_CONFIG[status]
              return (
                <div
                  key={status}
                  className={cn(
                    'flex flex-col w-80 shrink-0 gap-3 rounded-2xl p-2 transition-all duration-200',
                    isDragTarget && 'bg-orange-500/5 ring-1 ring-orange-500/30'
                  )}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(status) }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
                  }}
                  onDrop={async (e) => { e.preventDefault(); await moveTraining(status); setDragOverCol(null); setDragId(null) }}
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full bg-current', cfg.color)} />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{cfg.label}</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-surface-2 text-muted-c">
                        {grouped[status].length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {grouped[status].length === 0 ? (
                      <div className={cn(
                        'rounded-xl border border-dashed py-8 text-center transition-colors',
                        isDragTarget ? 'border-orange-500/40 bg-orange-500/5' : 'border-border'
                      )}>
                        <p className="text-[10px] text-muted-c uppercase tracking-widest">
                          {isDragTarget ? 'Drop here' : 'Empty'}
                        </p>
                      </div>
                    ) : (
                      grouped[status].map((t, i) => (
                        <TrainingCard
                          key={t.id}
                          training={t}
                          enrolledCount={enrolledCount(t.id)}
                          onClick={() => setDetailTarget(t)}
                          onEdit={() => setEditTarget(t)}
                          canEdit={can('canAddEditTrainings')}
                          index={i}
                          onDragStart={() => setDragId(t.id)}
                          onDragEnd={() => { setDragId(null); setDragOverCol(null) }}
                          isDragging={dragId === t.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-auto min-h-0 max-w-7xl mx-auto w-full"
          >
            <div className="card rounded-2xl overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                        Name <SortIcon col="name" />
                      </button>
                    </th>
                    <th>
                      <button onClick={() => toggleSort('type')} className="flex items-center gap-1">
                        Type <SortIcon col="type" />
                      </button>
                    </th>
                    <th>
                      <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                        Status <SortIcon col="status" />
                      </button>
                    </th>
                    <th className="hidden md:table-cell">
                      <button onClick={() => toggleSort('focus')} className="flex items-center gap-1">
                        Focus <SortIcon col="focus" />
                      </button>
                    </th>
                    <th className="hidden lg:table-cell">
                      <button onClick={() => toggleSort('start')} className="flex items-center gap-1">
                        Timeline <SortIcon col="start" />
                      </button>
                    </th>
                    <th>
                      <button onClick={() => toggleSort('enrolled')} className="flex items-center gap-1">
                        Enrolled <SortIcon col="enrolled" />
                      </button>
                    </th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-c text-sm">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No trainings yet
                      </td>
                    </tr>
                  )}
                  {sorted.map((t, i) => {
                    const cfg = STATUS_CONFIG[t.status]
                    const StatusIcon = cfg.icon
                    const isHandsOn = t.type === 'Hands-On'
                    const count = enrolledCount(t.id)
                    return (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="cursor-pointer group"
                        onClick={() => setDetailTarget(t)}
                      >
                        {/* Name */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                              isHandsOn ? 'bg-orange-500/10' : 'bg-purple-500/10'
                            )}>
                              {isHandsOn
                                ? <Zap className="w-4 h-4 text-orange-500" />
                                : <MessageSquare className="w-4 h-4 text-purple-400" />}
                            </div>
                            <span className="font-semibold text-primary text-sm">{t.name}</span>
                          </div>
                        </td>
                        {/* Type */}
                        <td>
                          <span className={cn('badge text-[10px]', isHandsOn ? 'badge-orange' : 'badge-purple')}>
                            {t.type}
                          </span>
                        </td>
                        {/* Status */}
                        <td>
                          <span className={cn('badge text-[10px] flex items-center gap-1 w-fit', cfg.badge)}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {cfg.label}
                          </span>
                        </td>
                        {/* Focus */}
                        <td className="hidden md:table-cell text-xs text-muted-c">
                          {t.platform || t.topic || '—'}
                        </td>
                        {/* Timeline */}
                        <td className="hidden lg:table-cell text-xs text-muted-c">
                          {t.start_date ? (
                            <span>{fmtDs(t.start_date)}{t.target_date ? ` → ${fmtDs(t.target_date)}` : ''}</span>
                          ) : '—'}
                        </td>
                        {/* Enrolled */}
                        <td>
                          <div className="flex items-center gap-1.5 text-xs text-muted-c">
                            <Users className="w-3 h-3" />
                            {count}
                          </div>
                        </td>
                        {/* Actions */}
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {can('canAddEditTrainings') && (
                              <button
                                onClick={() => setEditTarget(t)}
                                className="p-1.5 rounded-lg hover:bg-orange-500/10 hover:text-orange-500 text-muted-c transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {editTarget !== null && (
          <TrainingModal
            training={editTarget === 'new' ? null : editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailTarget && (
          <TrainingDetail
            training={detailTarget}
            onClose={() => setDetailTarget(null)}
            onEdit={t => { setDetailTarget(null); setEditTarget(t) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TrainingCard({ training, enrolledCount, onClick, onEdit, canEdit, index, onDragStart, onDragEnd, isDragging }: {
  training: Training
  enrolledCount: number
  onClick: () => void
  onEdit: () => void
  canEdit: boolean
  index: number
  onDragStart: () => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const isHandsOn = training.type === 'Hands-On'
  const wasDragged = useRef(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 0.97 : 1 }}
      transition={{ delay: isDragging ? 0 : index * 0.05 }}
      draggable={canEdit}
      onDragStart={() => { wasDragged.current = true; onDragStart() }}
      onDragEnd={() => { onDragEnd(); setTimeout(() => { wasDragged.current = false }, 100) }}
      onClick={() => { if (wasDragged.current) return; onClick() }}
      className={cn(
        'card card-interactive p-4 group relative cursor-pointer',
        isDragging && 'opacity-50'
      )}
      style={{ cursor: canEdit ? 'grab' : 'pointer' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('badge text-[10px]', isHandsOn ? 'badge-orange' : 'badge-purple')}>
          {isHandsOn ? <Zap className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
          {training.type}
        </div>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1 rounded-md text-muted-c hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <h4 className="font-display font-bold text-primary mb-1 line-clamp-2 leading-tight">
        {training.name}
      </h4>

      <div className="space-y-2 mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-c">
          {isHandsOn ? <Target className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
          <span className="truncate">{training.platform || training.topic || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-c">
          <Clock className="w-3 h-3" />
          <span>{fmtDs(training.start_date)} {training.target_date ? `→ ${fmtDs(training.target_date)}` : ''}</span>
        </div>
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle">
          <div className="flex items-center gap-1.5 text-xs text-muted-c">
            <Users className="w-3 h-3" />
            <span>{enrolledCount} enrolled</span>
          </div>
          {training.skill_level && (
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">
              {training.skill_level}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
