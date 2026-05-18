import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { UserRoleRecord, UserRole } from '@/types/database'

const ROLES: UserRole[] = ['admin', 'trainer', 'staff', 'designer']

const ROLE_DESC: Record<UserRole, string> = {
  admin:    'Full system access and user management.',
  trainer:  'Manage trainings, sessions, and skill sets.',
  staff:    'Manage designers and track attendance.',
  designer: 'Personal dashboard and roadmap access.',
}

const ROLE_STYLE: Record<UserRole, { active: string; label: string }> = {
  admin:    { active: 'border-purple-500 bg-purple-500/8 text-purple-400',    label: 'text-purple-400'  },
  trainer:  { active: 'border-orange-500 bg-orange-500/8 text-orange-400',    label: 'text-orange-400'  },
  staff:    { active: 'border-blue-500 bg-blue-500/8 text-blue-400',          label: 'text-blue-400'    },
  designer: { active: 'border-emerald-500 bg-emerald-500/8 text-emerald-400', label: 'text-emerald-400' },
}

type PermMeta = { key: string; label: string; desc: string; group: 'capabilities' | 'visibility' }

const PERM_META: PermMeta[] = [
  { key: 'canAddDesigners',    label: 'Add / Edit Designers',  desc: 'Create and update designer profiles',          group: 'capabilities' },
  { key: 'canDeleteDesigners', label: 'Delete Designers',      desc: 'Permanently remove designer records',          group: 'capabilities' },
  { key: 'canAddEditTrainings',label: 'Manage Trainings',      desc: 'Add, edit trainings, sessions, hub resources',  group: 'capabilities' },
  { key: 'canDeleteTrainings', label: 'Delete Trainings',      desc: 'Permanently remove training records',          group: 'capabilities' },
  { key: 'canMarkAttendance',  label: 'Mark Attendance',       desc: 'Record attendance for training sessions',       group: 'capabilities' },
  { key: 'canAddSessions',     label: 'Add Sessions',          desc: 'Create new sessions within a training',        group: 'capabilities' },
  { key: 'canEditSkills',      label: 'Edit Skills',           desc: 'Update skill levels in the Skill Set matrix',  group: 'capabilities' },
  { key: 'canManageUsers',     label: 'Manage Users',          desc: 'Add, edit, and remove user accounts',          group: 'capabilities' },
  { key: 'hideDesigners',   label: 'Hide Designers Tab',   desc: 'Remove Designers from navigation',    group: 'visibility' },
  { key: 'hideTrainings',   label: 'Hide Trainings Tab',   desc: 'Remove Trainings from navigation',    group: 'visibility' },
  { key: 'hideAttendance',  label: 'Hide Attendance Tab',  desc: 'Remove Attendance from navigation',   group: 'visibility' },
  { key: 'hideTeams',       label: 'Hide Teams Tab',       desc: 'Remove Teams from navigation',        group: 'visibility' },
  { key: 'hideSkillSet',    label: 'Hide Skill Set Tab',   desc: 'Remove Skill Set from navigation',    group: 'visibility' },
  { key: 'hideLeaderboard', label: 'Hide Leaderboard Tab', desc: 'Remove Leaderboard from navigation',  group: 'visibility' },
  { key: 'hideHub',         label: 'Hide Hub Tab',         desc: 'Remove Hub from navigation',          group: 'visibility' },
  { key: 'hideCrossDept',   label: 'Hide Cross-Dept Tab',  desc: 'Remove Cross-Dept from navigation',   group: 'visibility' },
]

function PermToggle({ meta, enabled, onToggle }: { meta: PermMeta; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors text-left"
    >
      {/* Track */}
      <div className={cn('w-9 h-5 rounded-full relative transition-colors shrink-0', enabled ? 'bg-orange-500' : 'bg-white/10')}>
        <span className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
          enabled && 'translate-x-4'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold leading-none', enabled ? 'text-primary' : 'text-muted-c')}>{meta.label}</p>
        <p className="text-[9px] text-muted-c mt-0.5 leading-tight">{meta.desc}</p>
      </div>
    </button>
  )
}

interface Props {
  user: UserRoleRecord | null
  onClose: () => void
  onSaved: () => void
}

export default function UserModal({ user, onClose, onSaved }: Props) {
  const { state } = useApp()
  const { designers } = state

  const [authUserId, setAuthUserId] = useState(user?.auth_user_id ?? '')
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) ?? 'staff')
  const [designerId, setDesignerId] = useState(user?.designer_id ?? '')
  const [perms, setPerms] = useState<Record<string, boolean>>(() => user?.permissions ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePerm(key: string) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const enabledCount = PERM_META.filter(p => p.group === 'capabilities' && !!perms[p.key]).length

  async function handleSave() {
    if (!authUserId.trim()) { setError('Auth User ID is required'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        role,
        designer_id: designerId || null,
        permissions: role === 'admin' ? null : perms,
      }
      const { error: err } = user
        ? await supabase.from('user_roles').update(payload).eq('id', user.id)
        : await supabase.from('user_roles').insert({ auth_user_id: authUserId.trim(), ...payload })

      if (err) setError(err.message)
      else { onSaved(); onClose() }
    } finally {
      setSaving(false)
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
        className="modal-glass rounded-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center glow-orange-sm">
              <Shield className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-primary leading-none">{user ? 'Edit User Role' : 'Add User Role'}</h2>
              {user && role !== 'admin' && (
                <p className="text-[10px] text-muted-c mt-0.5">{enabledCount} capabilit{enabledCount === 1 ? 'y' : 'ies'} enabled</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-c hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* Auth User ID */}
            {!user ? (
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
                <p className="text-[9px] text-muted-c px-1">The UUID from Supabase Auth → Users for this person.</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <p className="text-[10px] font-bold text-muted-c uppercase tracking-widest mb-1">Auth User ID</p>
                <p className="text-xs font-mono text-primary truncate">{user.auth_user_id}</p>
              </div>
            )}

            {/* Role picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">Assigned Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => {
                  const s = ROLE_STYLE[r]
                  const isActive = role === r
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        isActive ? s.active : 'border-border bg-surface-2 hover:border-orange-500/30'
                      )}
                    >
                      <div className={cn('text-[10px] font-bold uppercase tracking-widest mb-1', isActive ? s.label : 'text-primary')}>{r}</div>
                      <p className="text-[9px] text-muted-c leading-tight">{ROLE_DESC[r]}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Designer profile link */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest px-1">
                Link to Designer Profile <span className="normal-case font-normal">(optional)</span>
              </label>
              <select className="input" value={designerId} onChange={e => setDesignerId(e.target.value)}>
                <option value="">— None —</option>
                {designers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.team ? ` · ${d.team}` : ''}</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-c px-1">Required for designer accounts to access their personal dashboard.</p>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-muted-c uppercase tracking-widest">Permissions</label>
                {role === 'admin' && (
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Full Access</span>
                )}
              </div>

              {role === 'admin' ? (
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[10px] text-purple-300 leading-relaxed">
                  Admins have all permissions granted automatically — individual toggles are not applicable.
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Capabilities */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-c mb-1">Capabilities</p>
                    {PERM_META.filter(p => p.group === 'capabilities').map(p => (
                      <PermToggle key={p.key} meta={p} enabled={!!perms[p.key]} onToggle={() => togglePerm(p.key)} />
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border mx-3" />

                  {/* Visibility */}
                  <div className="px-3 pt-2 pb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-c mb-1">Tab Visibility</p>
                    {PERM_META.filter(p => p.group === 'visibility').map(p => (
                      <PermToggle key={p.key} meta={p} enabled={!!perms[p.key]} onToggle={() => togglePerm(p.key)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="text-[10px] text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0">
          <button className="btn-primary w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : user ? 'Update Role' : 'Add User'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
