import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { UserRoleRecord, UserRole } from '@/types/database'

const ROLES: UserRole[] = ['admin', 'trainer', 'staff', 'designer']
const ROLE_DESC: Record<UserRole, string> = {
  admin: 'Full system access and user management.',
  trainer: 'Manage trainings, sessions, and skill sets.',
  staff: 'Manage designers and track attendance.',
  designer: 'Personal dashboard and roadmap access.',
}

interface Props {
  user: UserRoleRecord | null
  onClose: () => void
  onSaved: () => void
}

export default function UserModal({ user, onClose, onSaved }: Props) {
  const [authUserId, setAuthUserId] = useState(user?.auth_user_id ?? '')
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) ?? 'staff')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!authUserId.trim()) {
      setError('Auth User ID is required')
      return
    }

    setSaving(true)
    setError('')

    let err: { message: string } | null = null

    if (user) {
      const { error: e } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('id', user.id)
      err = e
    } else {
      const { error: e } = await supabase
        .from('user_roles')
        .insert({ auth_user_id: authUserId.trim(), role })
      err = e
    }

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
        className="modal-glass rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <Shield className="w-5 h-5 text-white fill-white" />
            </div>
            <h2 className="font-display font-bold text-primary">{user ? 'Edit User Role' : 'Add User Role'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {!user && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                Supabase Auth User ID
              </label>
              <input
                className="input"
                value={authUserId}
                onChange={e => setAuthUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-[9px] text-muted-c px-1">
                The UUID from Supabase Auth → Users for this person.
              </p>
            </div>
          )}

          {user && (
            <div className="p-3 rounded-xl bg-surface-2 border border-border">
              <p className="text-[10px] font-bold text-muted-c uppercase tracking-widest mb-1">Auth User ID</p>
              <p className="text-xs font-mono text-primary truncate">{user.auth_user_id}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Assigned Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    role === r
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-border bg-surface-2 hover:border-orange-500/30'
                  )}
                >
                  <div className={cn('text-[10px] font-bold uppercase tracking-widest mb-1', role === r ? 'text-orange-500' : 'text-primary')}>
                    {r}
                  </div>
                  <p className="text-[9px] text-muted-c leading-tight">{ROLE_DESC[r]}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-[10px] text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button className="btn-primary w-full h-11" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : user ? 'Update Role' : 'Add User'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
