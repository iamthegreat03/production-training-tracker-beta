import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { normAtt } from '@/lib/utils'
import type {
  AppState, Designer, Team, Training, TrainingEnrollment,
  TrainingSession, Attendance, DesignerSkill, MakeupSession,
  MakeupRequest, UserRoleRecord, HubResource, ExtTraining, ExtSession,
  AccessRequest,
} from '@/types/database'

const DEFAULT_PERMS: Record<string, boolean> = {
  canAddDesigners: false, canDeleteDesigners: false,
  canAddEditTrainings: false, canDeleteTrainings: false,
  canMarkAttendance: false, canAddSessions: false,
  canEditSkills: false, canManageUsers: false,
  hideDesigners: false, hideTrainings: false,
  hideAttendance: false, hideTeams: false,
  hideSkillSet: false, hideLeaderboard: false,
  hideHub: false, hideCrossDept: false,
}

const initial: AppState = {
  user: null, role: null, designer: null, perms: DEFAULT_PERMS,
  designers: [], teams: [], trainings: [], enrollments: [],
  sessions: [], attendance: [], designerSkills: [],
  makeups: [], makeupRequests: [], users: [], hubResources: [],
  extTrainings: [], extSessions: [], accessRequests: [],
  page: 'dashboard', loading: true,
}

type Action =
  | { type: 'SET_AUTH'; payload: Partial<AppState> }
  | { type: 'SET_DATA'; payload: Partial<AppState> }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SIGN_OUT' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTH': return { ...state, ...action.payload }
    case 'SET_DATA': return { ...state, ...action.payload, loading: false }
    case 'SET_PAGE': return { ...state, page: action.payload }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SIGN_OUT': return { ...initial, loading: false }
    default: return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  loadAll: () => Promise<void>
  signOut: () => Promise<void>
  can: (key: string) => boolean
  tabHidden: (id: string) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const authedUserIdRef = useRef<string | null>(null)

  async function loadAll() {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [
        { data: designers, error: e0 }, { data: teams, error: e1 }, { data: trainings, error: e2 },
        { data: enrollments, error: e3 }, { data: sessions, error: e4 }, { data: attendance, error: e5 },
        { data: designerSkills, error: e6 }, { data: makeups, error: e7 }, { data: makeupRequests, error: e8 },
        { data: users, error: e9 }, { data: hubResources, error: e10 },
        { data: extTrainings, error: e11 }, { data: extSessions, error: e12 },
        { data: accessRequests, error: e13 },
      ] = await Promise.all([
        supabase.from('designers').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('trainings').select('*').order('created_at', { ascending: false }),
        supabase.from('training_enrollments').select('*'),
        supabase.from('training_sessions').select('*').order('session_date'),
        supabase.from('attendance').select('*'),
        supabase.from('designer_skills').select('*'),
        supabase.from('makeup_sessions').select('*'),
        supabase.from('makeup_requests').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('hub_resources').select('*').order('created_at', { ascending: true }),
        supabase.from('ext_trainings').select('*').order('created_at', { ascending: false }),
        supabase.from('ext_sessions').select('*').order('session_date', { ascending: false }),
        supabase.from('access_requests').select('*').order('created_at', { ascending: false }),
      ])

      const failedTables = [
        e0 && 'designers', e1 && 'teams', e2 && 'trainings',
        e3 && 'enrollments', e4 && 'sessions', e5 && 'attendance',
        e6 && 'skills', e7 && 'makeups', e8 && 'makeup_requests',
        e9 && 'users', e10 && 'hub', e11 && 'ext_trainings',
        e12 && 'ext_sessions', e13 && 'access_requests',
      ].filter(Boolean) as string[]
      if (failedTables.length) toast.error(`Data load issue: ${failedTables.join(', ')}`)

      const normAttendance = (attendance ?? []).map((a: Attendance) => ({
        ...a, is_present: normAtt(a.is_present),
      }))

      dispatch({
        type: 'SET_DATA',
        payload: {
          designers: (designers ?? []) as Designer[],
          teams: (teams ?? []) as Team[],
          trainings: (trainings ?? []) as Training[],
          enrollments: (enrollments ?? []) as TrainingEnrollment[],
          sessions: (sessions ?? []) as TrainingSession[],
          attendance: normAttendance as Attendance[],
          designerSkills: (designerSkills ?? []) as DesignerSkill[],
          makeups: (makeups ?? []) as MakeupSession[],
          makeupRequests: (makeupRequests ?? []) as MakeupRequest[],
          users: (users ?? []) as UserRoleRecord[],
          hubResources: (hubResources ?? []) as HubResource[],
          extTrainings: (extTrainings ?? []) as ExtTraining[],
          extSessions: (extSessions ?? []) as ExtSession[],
          accessRequests: (accessRequests ?? []) as AccessRequest[],
        },
      })
    } catch (err) {
      console.error('loadAll failed:', err)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    dispatch({ type: 'SIGN_OUT' })
  }

  function can(key: string): boolean {
    if (state.role === 'admin' || state.role === 'trainer') return true
    if (state.role === 'designer') return false
    return state.perms[key] ?? DEFAULT_PERMS[key] ?? false
  }

  function tabHidden(id: string): boolean {
    if (state.role === 'admin' || state.role === 'trainer') return false
    const map: Record<string, string> = {
      designers:  'hideDesigners',
      trainings:  'hideTrainings',
      attendance: 'hideAttendance',
      teams:      'hideTeams',
      skillset:   'hideSkillSet',
      leaderboard:'hideLeaderboard',
      hub:        'hideHub',
      crossdept:  'hideCrossDept',
    }
    const key = map[id]
    return key ? (state.perms[key] ?? false) : false
  }

  async function applySession(session: Session) {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      let designer = null
      if (roleData?.designer_id) {
        const { data } = await supabase
          .from('designers')
          .select('*')
          .eq('id', roleData.designer_id)
          .single()
        designer = data
      }

      const perms = { ...DEFAULT_PERMS, ...(roleData?.permissions ?? {}) }
      const isNewLogin = authedUserIdRef.current !== session.user.id
      authedUserIdRef.current = session.user.id

      const payload: Partial<AppState> = {
        user: session.user,
        role: roleData?.role ?? null,
        designer,
        perms,
      }
      if (isNewLogin) {
        payload.page = roleData?.role === 'designer' ? 'home' : 'dashboard'
      }

      dispatch({ type: 'SET_AUTH', payload })
      await loadAll()
    } catch (err) {
      console.error('Auth error:', err)
      dispatch({ type: 'SIGN_OUT' })
    }
  }

  useEffect(() => {
    // Use getSession() for the initial check — it resolves immediately from
    // the stored token without waiting for the event system, which avoids
    // a stuck loading state when a stale token is in localStorage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        applySession(session)
      } else {
        dispatch({ type: 'SIGN_OUT' })
      }
    }).catch(() => dispatch({ type: 'SIGN_OUT' }))

    // Listen only for explicit sign-in / sign-out after initial load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Skip if this is the same user already active — Supabase fires SIGNED_IN
        // on tab-focus token refreshes, which would trigger a full loadAll() and
        // flash the loading screen mid-task. Only act on genuine new logins.
        if (authedUserIdRef.current === session.user.id) return
        applySession(session)
      } else if (event === 'SIGNED_OUT') {
        authedUserIdRef.current = null
        dispatch({ type: 'SIGN_OUT' })
      }
      // INITIAL_SESSION handled by getSession() above; TOKEN_REFRESHED is
      // automatic — no action needed.
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, loadAll, signOut, can, tabHidden }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
