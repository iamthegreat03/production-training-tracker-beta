import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, UserPlus, Key, Trash2, Pencil,
  Search, ShieldCheck,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { cn, initials } from '@/lib/utils'
import type { UserRoleRecord, UserRole } from '@/types/database'
import UserModal from '@/components/users/UserModal'

type RoleFilter = 'ALL' | UserRole

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'badge-purple',
  trainer: 'badge-orange',
  staff: 'badge-blue',
  designer: 'badge-emerald',
}

export default function UserManagement() {
  const { state, loadAll, can } = useApp()
  const { users, designers } = state

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [editTarget, setEditTarget] = useState<UserRoleRecord | null | 'new'>(null)
  const [saving, setSaving] = useState(false)

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
        (u.displayEmail ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [enriched, search, roleFilter])

  async function handleDelete(u: UserRoleRecord) {
    if (!confirm(`Remove this user's access?`)) return
    setSaving(true)
    await supabase.from('user_roles').delete().eq('id', u.id)
    await loadAll()
    setSaving(false)
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'admin', 'trainer', 'staff', 'designer'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
              roleFilter === r
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-surface-2 text-muted-c hover:text-primary border border-border'
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2/50 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c" />
            <input
              className="input h-9 pl-9 text-xs"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-[10px] font-bold text-muted-c uppercase tracking-widest hidden sm:block whitespace-nowrap">
            {users.length} Active Accounts
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
                  <td colSpan={5} className="text-center py-12 text-muted-c italic text-sm">
                    No users found.
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
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
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold text-muted-c uppercase tracking-widest">
                            {permCount} Capabilities
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {can('canManageUsers') && (
                            <>
                              <button
                                onClick={() => setEditTarget(u)}
                                className="p-2 rounded-xl hover:bg-orange-500/10 text-muted-c hover:text-orange-500 transition-all"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(u)}
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

      {/* Info */}
      <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-start gap-4 max-w-2xl">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <Key className="w-5 h-5 text-orange-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-primary">Granular Access Control</h4>
          <p className="text-xs text-muted-c leading-relaxed">
            Permissions are managed per role. Admins have full access, Trainers manage sessions and skill sets,
            Staff manage designers and track attendance. Users must first register via Supabase Auth.
          </p>
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
    </div>
  )
}
