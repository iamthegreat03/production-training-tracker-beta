import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, UserPlus, Trash2, Pencil,
  Search, ShieldCheck, UserCheck, Clock, ChevronDown,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, initials, fmtD } from '@/lib/utils'
import { toast } from 'sonner'
import type { UserRoleRecord, UserRole, AccessRequest } from '@/types/database'
import UserModal from '@/components/users/UserModal'
import ApproveRequestModal from '@/components/users/ApproveRequestModal'
import ConfirmModal from '@/components/shared/ConfirmModal'

type RoleFilter = 'ALL' | UserRole

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'badge-purple',
  trainer: 'badge-orange',
  staff: 'badge-blue',
  designer: 'badge-emerald',
}

const ROLE_AVATAR: Record<UserRole, string> = {
  admin:    'bg-purple-500',
  trainer:  'bg-orange-500',
  staff:    'bg-blue-500',
  designer: 'bg-emerald-500',
}

export default function UserManagement() {
  const { state, loadAll, can } = useApp()
  const { users, designers, accessRequests } = state

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [editTarget, setEditTarget] = useState<UserRoleRecord | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<typeof enriched[0] | null>(null)
  const [approveTarget, setApproveTarget] = useState<AccessRequest | null>(null)
  const [requestsOpen, setRequestsOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  const pendingRequests = useMemo(() =>
    accessRequests.filter(r => r.status === 'pending'),
  [accessRequests])

  // Enrich each user record with designer name/email if linked
  const enriched = useMemo(() => users.map(u => {
    const d = u.designer_id ? designers.find(d => d.id === u.designer_id) : null
    return {
      ...u,
      displayName: d?.name ?? `User ${u.auth_user_id.slice(0, 8)}`,
      displayEmail: d?.email ?? null,
    }
  }), [users, designers])

  const filtered = useMemo(() => {
    let list = [...enriched]
    if (roleFilter !== 'ALL') list = list.filter(u => u.role === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        (u.displayEmail ?? '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      )
    }
    return list
  }, [enriched, search, roleFilter])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: enriched.length }
    for (const u of enriched) counts[u.role] = (counts[u.role] ?? 0) + 1
    return counts
  }, [enriched])

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('approve-access', {
        body: { action: 'delete', userId: deleteTarget.auth_user_id },
      })
      if (fnError || data?.error) {
        toast.error(fnError?.message ?? data?.error ?? 'Failed to remove user')
      } else {
        toast.success('User access removed')
        setDeleteTarget(null)
        await loadAll()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title font-display">User Management</h1>
          <p className="page-subtitle">Manage staff access and granular permissions</p>
        </div>
        {can('canManageUsers') && (
          <button className="btn-primary" onClick={() => setEditTarget('new')}>
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Pending Access Requests */}
      {pendingRequests.length > 0 && (
        <div className="card rounded-2xl overflow-hidden border-orange-500/20">
          <button
            onClick={() => setRequestsOpen(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-2/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">Access Requests</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                    <Clock className="w-2.5 h-2.5" />
                    {pendingRequests.length} pending
                  </span>
                </div>
                <p className="text-[10px] text-muted-c mt-0.5">Review and approve to create accounts and send credentials</p>
              </div>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-muted-c transition-transform duration-200', requestsOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {requestsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-surface-2/40 transition-colors group">
                      <div className="w-9 h-9 rounded-full bg-orange-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {initials(req.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-primary">{req.name}</span>
                          <span className="badge badge-orange text-[9px] uppercase">{req.requested_role}</span>
                        </div>
                        <div className="text-[10px] text-muted-c">{req.email}</div>
                        {req.message && (
                          <div className="text-[10px] text-secondary italic mt-0.5 truncate max-w-sm">"{req.message}"</div>
                        )}
                      </div>
                      <div className="hidden sm:block text-[10px] text-muted-c shrink-0">{fmtD(req.created_at)}</div>
                      <button
                        onClick={() => setApproveTarget(req)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Review
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'admin', 'trainer', 'staff', 'designer'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
              roleFilter === r
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-surface-2 text-muted-c hover:text-primary border border-border'
            )}
          >
            {r}
            <span className={cn('font-black', roleFilter === r ? 'opacity-70' : 'opacity-40')}>
              {roleCounts[r] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2/50 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c z-10" />
            <input
              className="input h-9 pl-9 text-xs"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest hidden sm:block whitespace-nowrap">
            {filtered.length === users.length
              ? `${users.length} Users`
              : `${filtered.length} of ${users.length} Users`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hidden lg:table-cell">Permissions</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center gap-2 py-12">
                      <Shield className="w-8 h-8 text-muted-c opacity-30" />
                      <p className="text-sm font-medium text-muted-c">No users found</p>
                      {(search || roleFilter !== 'ALL') && (
                        <p className="text-xs text-muted-c">Try clearing the search or filter</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => {
                  const permCount = u.permissions
                    ? Object.values(u.permissions).filter(v => v === true).length
                    : 0

                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 28, stiffness: 380, delay: Math.min(i * 0.03, 0.2) }}
                      className="group"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', ROLE_AVATAR[u.role as UserRole] ?? 'bg-surface-2')}>
                            {initials(u.displayName)}
                          </div>
                          <div className="font-medium text-primary">{u.displayName}</div>
                        </div>
                      </td>
                      <td className="text-muted-c text-xs">{u.displayEmail ?? '—'}</td>
                      <td>
                        <span className={cn('badge uppercase text-[10px]', ROLE_COLORS[u.role as UserRole] ?? 'badge-slate')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className={cn('w-3.5 h-3.5', u.role === 'admin' ? 'text-purple-400' : 'text-emerald-400')} />
                          <span className="text-[10px] font-bold text-muted-c uppercase tracking-widest">
                            {u.role === 'admin' ? 'Full Access' : `${permCount} Capabilities`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {can('canManageUsers') && (
                            <>
                              <button
                                onClick={() => setEditTarget(u)}
                                className="p-2 rounded-xl hover:bg-orange-500/10 text-muted-c hover:text-orange-500 transition-all"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(u)}
                                disabled={saving}
                                className="p-2 rounded-xl hover:bg-red-500/10 text-muted-c hover:text-red-400 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editTarget !== null && (
          <UserModal
            user={editTarget === 'new' ? null : editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            title="Remove User Access"
            message={<>Removing <span className="font-semibold text-primary">{deleteTarget.displayName}</span> will revoke their access to the system. Their designer profile (if any) will remain intact.</>}
            confirmLabel="Remove Access"
            danger
            loading={saving}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveTarget && (
          <ApproveRequestModal
            request={approveTarget}
            onClose={() => setApproveTarget(null)}
            onDone={loadAll}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
