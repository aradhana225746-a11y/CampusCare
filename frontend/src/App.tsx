import { useAppState } from './state/AppState'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AppShell, type NavItem } from './components/AppShell'
import { StudentDashboard, ReportIssue, MyReports, Community, Contribution, Profile } from './views/student/StudentViews'
import { AdminOverview, AdminReports, AdminActivities, Participants, Analytics } from './views/admin/AdminViews'

const studentNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'report', label: 'Report Issue' },
  { key: 'reports', label: 'My Reports' },
  { key: 'community', label: 'Activities' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'profile', label: 'Profile' },
]

const adminNav: NavItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Reports' },
  { key: 'activities', label: 'Activities' },
  { key: 'participants', label: 'Participants' },
  { key: 'analytics', label: 'Analytics' },
]

function StudentView() {
  const { state } = useAppState()
  if (state.studentPage === 'report') return <ReportIssue />
  if (state.studentPage === 'reports') return <MyReports />
  if (state.studentPage === 'community') return <Community />
  if (state.studentPage === 'contribution') return <Contribution />
  if (state.studentPage === 'profile') return <Profile />
  return <StudentDashboard />
}

function AdminView() {
  const { state } = useAppState()
  if (state.adminPage === 'reports') return <AdminReports />
  if (state.adminPage === 'activities') return <AdminActivities />
  if (state.adminPage === 'participants') return <Participants />
  if (state.adminPage === 'analytics') return <Analytics />
  return <AdminOverview />
}

export default function App() {
  const { state, setStudentPage, setAdminPage, logout } = useAppState()
  if (state.mode === 'welcome') return <WelcomeScreen />

  const studentMeta = [state.student.program, state.student.year ? `Year ${state.student.year}` : ''].filter(Boolean).join(' · ') || 'Student'

  if (state.mode === 'student') return <AppShell mode="student" title={studentNav.find((item) => item.key === state.studentPage)?.label ?? 'Dashboard'} subtitle={state.studentPage === 'dashboard' ? 'Your reports, activities, and recent updates.' : 'Manage your Campus Care account and activity.'} nav={studentNav} activeKey={state.studentPage} onNavigate={(key) => setStudentPage(key as typeof state.studentPage)} onExit={() => void logout()} personName={state.student.name} personMeta={studentMeta}><StudentView /></AppShell>

  return <AppShell mode="admin" title={adminNav.find((item) => item.key === state.adminPage)?.label ?? 'Overview'} subtitle={state.adminPage === 'overview' ? 'Reports and activity that currently need attention.' : 'Manage reports, activities, and student participation.'} nav={adminNav} activeKey={state.adminPage} onNavigate={(key) => setAdminPage(key as typeof state.adminPage)} onExit={() => void logout()} personName={state.student.name || 'Administrator'} personMeta="Administrator"><AdminView /></AppShell>
}
