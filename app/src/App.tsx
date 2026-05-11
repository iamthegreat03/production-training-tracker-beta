import { useApp } from '@/context/AppContext'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Designers from '@/pages/Designers'
import Trainings from '@/pages/Trainings'
import Attendance from '@/pages/Attendance'
import Teams from '@/pages/Teams'
import SkillSet from '@/pages/SkillSet'
import Users from '@/pages/Users'
import DesignerHome from '@/pages/DesignerHome'
import DesignerRoadmap from '@/pages/DesignerRoadmap'
import DesignerHistory from '@/pages/DesignerHistory'
import DesignerBadges from '@/pages/DesignerBadges'

function PageRouter() {
  const { state } = useApp()
  const { page, role } = state

  if (role === 'designer') {
    switch (page) {
      case 'home':    return <DesignerHome />
      case 'roadmap': return <DesignerRoadmap />
      case 'history': return <DesignerHistory />
      case 'badges':  return <DesignerBadges />
      default:        return <DesignerHome />
    }
  }

  switch (page) {
    case 'dashboard':  return <Dashboard />
    case 'designers':  return <Designers />
    case 'trainings':  return <Trainings />
    case 'attendance': return <Attendance />
    case 'teams':      return <Teams />
    case 'skillset':   return <SkillSet />
    case 'users':      return <Users />
    default:           return <Dashboard />
  }
}

export default function App() {
  const { state } = useApp()

  if (state.loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-gradient flex items-center justify-center glow-orange-md animate-pulse">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="text-sm text-muted-c">Loading...</div>
        </div>
      </div>
    )
  }

  if (!state.user || !state.role) return <Login />

  return (
    <AppShell>
      <PageRouter />
    </AppShell>
  )
}
