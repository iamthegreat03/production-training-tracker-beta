import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Users, ChevronUp, ChevronDown,
  ChevronsUpDown, Pencil, Trash2, ArrowLeftRight,
  CheckSquare, Square, UserCheck, X,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, initials, pct } from '@/lib/utils'
import { toast } from 'sonner'
import type { Designer } from '@/types/database'
import DesignerModal from '@/components/designers/DesignerModal'
import DesignerProfile from '@/components/designers/DesignerProfile'
import ConfirmModal from '@/components/shared/ConfirmModal'

type SortCol = 'name' | 'team' | 'rank'
type SortDir = 'asc' | 'desc'

const RANK_ORDER: Record<string, number> = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 }
const RANK_COLORS: Record<string, string> = {
  'Tier 1': 'badge-purple',
  'Tier 2': 'badge-blue',
  'Tier 3': 'badge-emerald',
}

export default function Designers() {
  const { state, loadAll, can } = useApp()
  const { designers, teams, trainings, enrollments, sessions, attendance } = state

  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<Designer | null | 'new'>(null)
  const [profileTarget, setProfileTarget] = useState<Designer | null>(null)
  const [transferTarget, setTransferTarget] = useState<Designer | null>(null)
  const [transferTeam, setTransferTeam] = useState('')
  const [bulkAction, setBulkAction] = useState<'transfer' | 'enroll' | null>(null)
  const [bulkTeam, setBulkTeam] = useState('')
  const [bulkTraining, setBulkTraining] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Designer | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Filtered + sorted list
  const visible = useMemo(() => {
    let list = [...designers]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q) ||
        (d.team ?? '').toLowerCase().includes(q),
      )
    }
    if (teamFilter !== 'ALL') {
      list = list.filter(d => (teamFilter === 'NONE' ? !d.team : d.team === teamFilter))
    }
    list.sort((a, b) => {
      let av = '', bv = ''
      if (sortCol === 'name') { av = a.name; bv = b.name }
      else if (sortCol === 'team') { av = a.team ?? ''; bv = b.team ?? '' }
      else if (sortCol === 'rank') {
        return sortDir === 'asc'
          ? (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9)
          : (RANK_ORDER[b.rank] ?? 9) - (RANK_ORDER[a.rank] ?? 9)
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [designers, search, teamFilter, sortCol, sortDir])

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function toggleSel(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set())
    else setSelected(new Set(visible.map(d => d.id)))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    setDeleteTarget(null)
    const { error } = await supabase.from('designers').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else toast.success('Designer removed')
    await loadAll()
    setDeleting(null)
  }

  async function handleTransfer() {
    if (!transferTarget || !transferTeam) return
    setSaving(true)
    const { error } = await supabase.from('designers').update({ team: transferTeam || null }).eq('id', transferTarget.id)
    if (error) toast.error(error.message)
    else toast.success(`${transferTarget.name} moved to ${transferTeam || 'Uncategorized'}`)
    await loadAll()
    setSaving(false)
    setTransferTarget(null)
  }

  async function handleBulkTransfer() {
    if (!bulkTeam || selected.size === 0) return
    setSaving(true)
    await supabase.from('designers').update({ team: bulkTeam || null }).in('id', [...selected])
    await loadAll()
    setSaving(false)
    setBulkAction(null)
    setSelected(new Set())
  }

  async function handleBulkEnroll() {
    if (!bulkTraining || selected.size === 0) return
    setSaving(true)
    const rows = [...selected].map(did => ({ training_id: bulkTraining, designer_id: did }))
    await supabase.from('training_enrollments').upsert(rows, { onConflict: 'training_id,designer_id' })
    await loadAll()
    setSaving(false)
    setBulkAction(null)
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    setSaving(true)
    setShowBulkDeleteConfirm(false)
    await supabase.from('designers').delete().in('id', [...selected])
    await loadAll()
    setSaving(false)
    setBulkMode(false)
    setSelected(new Set())
  }

  const allTeamNames = teams.map(t => t.name)
  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Designers</h1>
          <p className="page-subtitle">{designers.length} members across {teams.length} teams</p>
        </div>
        <div className="flex items-center gap-2">
          {can('canAddDesigners') && (
            <button className="btn-primary" onClick={() => setEditTarget('new')}>
              <Plus className="w-4 h-4" /> Add Designer
            </button>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-32 sm:min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c" />
          <input
            className="input pl-9 h-9"
            placeholder="Search name, email, team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-c hover:text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Team filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', ...allTeamNames, 'NONE'].map(t => (
            <button key={t} onClick={() => setTeamFilter(t)}
              className={cn('chip', teamFilter === t && 'active')}>
              {t === 'NONE' ? 'Uncategorized' : t}
            </button>
          ))}
        </div>

        {/* Bulk toggle */}
        <button
          onClick={() => { setBulkMode(v => !v); setSelected(new Set()) }}
          className={cn('btn-outline h-9 px-3', bulkMode && 'border-orange-500/50 text-orange-500')}
        >
          <CheckSquare className="w-4 h-4" /> Bulk
        </button>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {bulkMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5"
          >
            <span className="text-sm font-semibold text-orange-500">{selected.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button className="btn-outline h-8 px-3 text-xs" onClick={() => setBulkAction('enroll')}>
                <UserCheck className="w-3.5 h-3.5" /> Enroll
              </button>
              <button className="btn-outline h-8 px-3 text-xs" onClick={() => setBulkAction('transfer')}>
                <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
              </button>
              {can('canDeleteDesigners') && (
                <button className="btn-outline h-8 px-3 text-xs border-red-500/30 text-red-400 hover:border-red-400"
                  onClick={() => setShowBulkDeleteConfirm(true)} disabled={saving}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {bulkMode && (
                  <th className="w-10 px-4">
                    <button onClick={toggleAll}>
                      {selected.size === visible.length && visible.length > 0
                        ? <CheckSquare className="w-4 h-4 text-orange-500" />
                        : <Square className="w-4 h-4 text-muted-c" />}
                    </button>
                  </th>
                )}
                <th>
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                    Designer <SortIcon col="name" />
                  </button>
                </th>
                <th className="hidden md:table-cell">Email</th>
                <th>
                  <button onClick={() => toggleSort('team')} className="flex items-center gap-1">
                    Team <SortIcon col="team" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('rank')} className="flex items-center gap-1">
                    Tier <SortIcon col="rank" />
                  </button>
                </th>
                <th className="hidden lg:table-cell">Platform</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-c text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No designers found
                  </td>
                </tr>
              )}
              {visible.map((d, i) => {
                const isSel = selected.has(d.id)
                const isDel = deleting === d.id
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 380, delay: Math.min(i * 0.03, 0.22) }}
                    className={cn('cursor-pointer group', isSel && 'bg-orange-500/5')}
                    onClick={() => bulkMode ? toggleSel(d.id) : setProfileTarget(d)}
                  >
                    {bulkMode && (
                      <td onClick={e => { e.stopPropagation(); toggleSel(d.id) }} className="w-10 px-4">
                        {isSel
                          ? <CheckSquare className="w-4 h-4 text-orange-500" />
                          : <Square className="w-4 h-4 text-muted-c" />}
                      </td>
                    )}
                    {/* Avatar + Name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
                          'bg-orange-gradient',
                        )}>
                          {initials(d.name)}
                        </div>
                        <span className="font-medium text-primary">{d.name}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-muted-c text-xs">{d.email ?? '—'}</td>
                    <td>
                      {d.team
                        ? <span className="badge badge-orange">{d.team}</span>
                        : <span className="text-muted-c text-xs">—</span>}
                    </td>
                    <td>
                      <span className={cn('badge', RANK_COLORS[d.rank] ?? 'badge-slate')}>
                        {d.rank}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-muted-c text-xs">{d.platform ?? '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {can('canAddDesigners') && (
                          <button
                            onClick={() => setEditTarget(d)}
                            className="p-1.5 rounded-lg hover:bg-orange-500/10 hover:text-orange-500 text-muted-c transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { setTransferTarget(d); setTransferTeam(d.team ?? '') }}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 text-muted-c transition-colors"
                          title="Transfer team"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                        {can('canDeleteDesigners') && (
                          <button
                            onClick={() => setDeleteTarget(d)}
                            disabled={isDel}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-c transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Result count */}
      {search && (
        <p className="text-xs text-muted-c">
          Showing {visible.length} of {designers.length} designers
        </p>
      )}

      {/* ── Modals ── */}

      {/* Add / Edit Designer */}
      <AnimatePresence>
        {editTarget !== null && (
          <DesignerModal
            designer={editTarget === 'new' ? null : editTarget}
            teams={allTeamNames}
            onClose={() => setEditTarget(null)}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      {/* Profile */}
      <AnimatePresence>
        {profileTarget && (
          <DesignerProfile
            designer={profileTarget}
            onClose={() => setProfileTarget(null)}
            onEdit={d => { setProfileTarget(null); setEditTarget(d) }}
            trainings={trainings}
            enrollments={enrollments}
            sessions={sessions}
            attendance={attendance}
            canEdit={can('canAddDesigners')}
          />
        )}
      </AnimatePresence>

      {/* Transfer */}
      <AnimatePresence>
        {transferTarget && (
          <Modal title={`Transfer — ${transferTarget.name}`} onClose={() => setTransferTarget(null)}>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-c">New Team</label>
              <select
                className="input"
                value={transferTeam}
                onChange={e => setTransferTeam(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {allTeamNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-2 pt-2">
                <button className="btn-ghost flex-1" onClick={() => setTransferTarget(null)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleTransfer} disabled={saving}>
                  {saving ? 'Saving…' : 'Transfer'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Bulk Transfer */}
      <AnimatePresence>
        {bulkAction === 'transfer' && (
          <Modal title={`Transfer ${selected.size} Designers`} onClose={() => setBulkAction(null)}>
            <div className="space-y-3">
              <select className="input" value={bulkTeam} onChange={e => setBulkTeam(e.target.value)}>
                <option value="">Uncategorized</option>
                {allTeamNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setBulkAction(null)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleBulkTransfer} disabled={saving}>
                  {saving ? 'Saving…' : 'Transfer All'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Bulk Enroll */}
      <AnimatePresence>
        {bulkAction === 'enroll' && (
          <Modal title={`Enroll ${selected.size} Designers`} onClose={() => setBulkAction(null)}>
            <div className="space-y-3">
              <select className="input" value={bulkTraining} onChange={e => setBulkTraining(e.target.value)}>
                <option value="">Select training…</option>
                {trainings.filter(t => t.status !== 'completed').map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setBulkAction(null)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleBulkEnroll} disabled={saving || !bulkTraining}>
                  {saving ? 'Enrolling…' : 'Enroll All'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Single Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            title="Delete Designer"
            message={<>Permanently delete <span className="font-semibold text-primary">{deleteTarget.name}</span>? All their attendance records and enrollments will also be removed. This cannot be undone.</>}
            confirmLabel="Delete Designer"
            danger
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirm */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <ConfirmModal
            title={`Delete ${selected.size} Designer${selected.size !== 1 ? 's' : ''}`}
            message={<>Permanently delete <span className="font-semibold text-primary">{selected.size} selected designer{selected.size !== 1 ? 's' : ''}</span>? All their attendance records and enrollments will also be removed. This cannot be undone.</>}
            confirmLabel={`Delete ${selected.size}`}
            danger
            onConfirm={handleBulkDelete}
            onCancel={() => setShowBulkDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline small modal wrapper
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-c hover:text-primary"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}
