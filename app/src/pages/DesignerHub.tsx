import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Layers, Sparkles, Code2, Settings2, X, Plus, Library, Search,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { HubResource, HubCategory } from '@/types/database'
import ResourceCard, { CATEGORY_META } from '@/components/hub/ResourceCard'
import ResourceModal from '@/components/hub/ResourceModal'
import ConfirmModal from '@/components/shared/ConfirmModal'

type CategoryFilter = HubCategory | 'all'

const FILTER_TABS: { id: CategoryFilter; label: string; icon: typeof BookOpen; color: string }[] = [
  { id: 'all',         label: 'All',         icon: Library,   color: 'text-muted-c'   },
  { id: 'learn',       label: 'Learn',       icon: BookOpen,  color: 'text-blue-400'  },
  { id: 'assets',      label: 'Assets',      icon: Layers,    color: 'text-purple-400'},
  { id: 'inspiration', label: 'Inspiration', icon: Sparkles,  color: 'text-orange-400'},
  { id: 'code',        label: 'Code',        icon: Code2,     color: 'text-emerald-400'},
]

type ModalState =
  | { open: false }
  | { open: true; mode: 'view';   resource: HubResource }
  | { open: true; mode: 'edit';   resource: HubResource }
  | { open: true; mode: 'create'; category: HubCategory }

export default function DesignerHub() {
  const { state, loadAll, can } = useApp()
  const { hubResources } = state

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<HubResource | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManage = can('canAddEditTrainings')

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return hubResources
    return hubResources.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.tags?.some(t => t.toLowerCase().includes(q))
    )
  }, [hubResources, search])

  const sections = useMemo(() => {
    const cats: HubCategory[] = ['learn', 'assets', 'inspiration', 'code']
    if (activeFilter !== 'all') {
      return [{ id: activeFilter as HubCategory, resources: filteredResources.filter(r => r.category === activeFilter) }]
    }
    return cats
      .map(cat => ({ id: cat, resources: filteredResources.filter(r => r.category === cat) }))
      .filter(s => s.resources.length > 0 || editMode)
  }, [filteredResources, activeFilter, editMode])

  function openCreate(category: HubCategory) {
    setModal({ open: true, mode: 'create', category })
  }

  function openView(resource: HubResource) {
    setModal({ open: true, mode: 'view', resource })
  }

  function openEdit(resource: HubResource) {
    setModal({ open: true, mode: 'edit', resource })
  }

  function closeModal() {
    setModal({ open: false })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('hub_resources').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else toast.success('Resource deleted')
    await loadAll()
    setDeleteTarget(null)
    setDeleting(false)
  }

  const isEmpty = hubResources.length === 0

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">Designer Hub</h1>
          <p className="page-subtitle">
            Resources, assets, and tools for the design team · {hubResources.length} resource{hubResources.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditMode(v => !v)}
            className={cn(
              'btn-outline h-10 px-4 gap-2 transition-all',
              editMode && 'border-orange-500/50 text-orange-500 bg-orange-500/5',
            )}
          >
            {editMode ? <X className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            {editMode ? 'Done Editing' : 'Edit Mode'}
          </button>
        )}
      </div>

      {/* Filter + Add bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map(tab => {
          const Icon = tab.icon
          const active = activeFilter === tab.id
          const count = tab.id === 'all' ? filteredResources.length : filteredResources.filter(r => r.category === tab.id).length
          const catMeta = tab.id !== 'all' ? CATEGORY_META[tab.id] : null
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border',
                active
                  ? catMeta
                    ? `${catMeta.bg} ${catMeta.color} border-current/30`
                    : 'bg-surface-2 text-primary border-border shadow-sm'
                  : 'bg-surface-2 text-muted-c border-border hover:text-primary',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="opacity-50">{count}</span>
            </button>
          )
        })}

        {editMode && canManage && (
          <button
            onClick={() => openCreate(activeFilter === 'all' ? 'learn' : activeFilter as HubCategory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-dashed border-orange-500/40 text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Resource
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-c z-10" />
        <input
          type="text"
          placeholder="Search by title, description, or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full pl-9 pr-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-c hover:text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !editMode ? (
        <div className="flex flex-col items-center justify-center py-24 text-center card border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-gradient flex items-center justify-center glow-orange-md mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display font-bold text-xl text-primary">Hub is empty</h2>
          <p className="text-sm text-muted-c mt-2 max-w-sm">
            {canManage
              ? 'Enable Edit Mode to start adding resources for your team.'
              : 'Your trainers will be adding resources here soon.'}
          </p>
          {canManage && (
            <button className="btn-primary mt-6" onClick={() => setEditMode(true)}>
              <Settings2 className="w-4 h-4" /> Enable Edit Mode
            </button>
          )}
        </div>
      ) : sections.length === 0 && search ? (
        <div className="card rounded-2xl py-14 text-center border-dashed">
          <Search className="w-8 h-8 mx-auto mb-3 text-muted-c opacity-40" />
          <p className="text-sm font-bold text-primary">No results for "{search}"</p>
          <p className="text-xs text-muted-c mt-1">Try a different keyword or clear the search.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map(section => {
            const catMeta = CATEGORY_META[section.id]
            const CatIcon = FILTER_TABS.find(t => t.id === section.id)?.icon ?? BookOpen
            const showSectionHeader = activeFilter === 'all'

            return (
              <div key={section.id} className="space-y-4">
                {showSectionHeader && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: `linear-gradient(to right, rgba(${catMeta.glowRgb},0.12) 0%, transparent 65%)`,
                      borderLeft: `3px solid rgba(${catMeta.glowRgb},0.7)`,
                    }}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', catMeta.bg)}>
                      <CatIcon className={cn('w-4 h-4', catMeta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className={cn('text-sm font-black uppercase tracking-widest', catMeta.color)}>{catMeta.label}</h2>
                      <p className="text-[10px] text-muted-c">{section.resources.length} resource{section.resources.length !== 1 ? 's' : ''}</p>
                    </div>
                    {editMode && canManage && (
                      <button
                        onClick={() => openCreate(section.id)}
                        className={cn('flex items-center gap-1 text-xs font-bold transition-colors hover:opacity-80', catMeta.color)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {section.resources.map((r, i) => (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 360, delay: Math.min(i * 0.04, 0.2) }}
                      >
                        <ResourceCard
                          resource={r}
                          editMode={editMode && canManage}
                          onClick={() => openView(r)}
                          onEdit={e => { e.stopPropagation(); openEdit(r) }}
                          onDelete={e => { e.stopPropagation(); setDeleteTarget(r) }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Empty-section placeholder in edit mode */}
                  {editMode && canManage && section.resources.length === 0 && (
                    <button
                      onClick={() => openCreate(section.id)}
                      className="h-40 rounded-2xl border-2 border-dashed border-border hover:border-orange-500/40 hover:bg-orange-500/5 text-muted-c hover:text-orange-500 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Add {catMeta.label}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resource Modal */}
      <AnimatePresence>
        {modal.open && (
          <ResourceModal
            resource={modal.mode !== 'create' ? modal.resource : null}
            mode={modal.mode}
            defaultCategory={modal.mode === 'create' ? modal.category : (modal.mode !== 'create' ? modal.resource.category : 'learn')}
            canManage={canManage}
            onClose={closeModal}
            onEdit={() => modal.open && modal.mode === 'view' && setModal({ open: true, mode: 'edit', resource: modal.resource })}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            title="Delete Resource"
            message={<>Permanently delete <span className="font-semibold text-primary">"{deleteTarget.title}"</span>? This cannot be undone.</>}
            confirmLabel="Delete Resource"
            danger
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
