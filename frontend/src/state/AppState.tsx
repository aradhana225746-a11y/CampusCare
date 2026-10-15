import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Activity, AdminPage, ContributionEvent, Mode, Priority, Report, ReportStatus, StudentPage } from '../data/models'

export interface StudentProfile {
  name: string
  program: string
  year: string
  email: string
  role: 'STUDENT' | 'ADMIN' | ''
  contributionPoints: number
  activitiesJoined: number
  joinedActivityIds: string[]
  contributions: ContributionEvent[]
}

export interface Participant {
  name: string
  programme: string
  reports: number
  resolved: number
  points: number
  activity: string
}

export interface AppState {
  mode: Mode
  studentPage: StudentPage
  adminPage: AdminPage
  reports: Report[]
  activities: Activity[]
  participants: Participant[]
  student: StudentProfile
  selectedReportId: string | null
  selectedActivityId: string | null
  reportSuccessId: string | null
}

export type ReportDraft = Pick<Report, 'title' | 'category' | 'location' | 'description'>
export type ReportUpdate = Pick<Report, 'status' | 'priority' | 'assignedTo' | 'resolutionNotes'>
export type ActivityInput = {
  title: string
  description: string
  dateTime: string
  location: string
  points: number
  status: Activity['status']
}

const emptyStudent: StudentProfile = {
  name: '', program: '', year: '', email: '', role: '', contributionPoints: 0,
  activitiesJoined: 0, joinedActivityIds: [], contributions: [],
}

const initialState: AppState = {
  mode: 'welcome', studentPage: 'dashboard', adminPage: 'overview', reports: [], activities: [], participants: [],
  student: emptyStudent, selectedReportId: null, selectedActivityId: null, reportSuccessId: null,
}

type ServerState = Pick<AppState, 'reports' | 'activities' | 'participants' | 'student'>

type Action =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_STUDENT_PAGE'; page: StudentPage }
  | { type: 'SET_ADMIN_PAGE'; page: AdminPage }
  | { type: 'SELECT_REPORT'; id: string | null }
  | { type: 'SELECT_ACTIVITY'; id: string | null }
  | { type: 'APPLY_SERVER'; data: ServerState }
  | { type: 'REPORT_SUCCESS'; id: string }
  | { type: 'CLEAR_SUCCESS' }
  | { type: 'RESET' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_MODE': return { ...state, mode: action.mode, selectedReportId: null, selectedActivityId: null, reportSuccessId: null }
    case 'SET_STUDENT_PAGE': return { ...state, studentPage: action.page, selectedReportId: action.page === 'reports' ? state.selectedReportId : null, selectedActivityId: null }
    case 'SET_ADMIN_PAGE': return { ...state, adminPage: action.page, selectedReportId: action.page === 'reports' ? state.selectedReportId : null, selectedActivityId: null }
    case 'SELECT_REPORT': return { ...state, selectedReportId: action.id }
    case 'SELECT_ACTIVITY': return { ...state, selectedActivityId: action.id }
    case 'APPLY_SERVER': return { ...state, ...action.data }
    case 'REPORT_SUCCESS': return { ...state, reportSuccessId: action.id, studentPage: 'report', selectedReportId: action.id }
    case 'CLEAR_SUCCESS': return { ...state, reportSuccessId: null }
    case 'RESET': return initialState
  }
}

let token = sessionStorage.getItem('campuscare_token') ?? ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

interface AppContextValue {
  state: AppState
  setMode: (mode: Mode) => void
  setStudentPage: (page: StudentPage) => void
  setAdminPage: (page: AdminPage) => void
  selectReport: (id: string | null) => void
  selectActivity: (id: string | null) => void
  clearSuccess: () => void
  register: (name: string, email: string, password: string) => Promise<void>
  login: (email: string, password: string, admin: boolean) => Promise<void>
  logout: () => Promise<void>
  submitReport: (draft: ReportDraft) => Promise<void>
  updateReport: (id: string, update: Partial<ReportUpdate>) => Promise<void>
  joinActivity: (id: string) => Promise<void>
  addActivity: (input: ActivityInput) => Promise<void>
  updateActivity: (id: string, input: ActivityInput) => Promise<void>
  updateProfile: (name: string, program: string, year: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const applyLogin = (result: { token: string; state: ServerState }) => {
    token = result.token
    sessionStorage.setItem('campuscare_token', token)
    dispatch({ type: 'APPLY_SERVER', data: result.state })
    dispatch({ type: 'SET_MODE', mode: result.state.student.role === 'ADMIN' ? 'admin' : 'student' })
  }

  useEffect(() => {
    if (!token) return
    request<ServerState>('/api/state').then((data) => {
      dispatch({ type: 'APPLY_SERVER', data })
      dispatch({ type: 'SET_MODE', mode: data.student.role === 'ADMIN' ? 'admin' : 'student' })
    }).catch(() => {
      token = ''
      sessionStorage.removeItem('campuscare_token')
    })
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    state,
    setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
    setStudentPage: (page) => dispatch({ type: 'SET_STUDENT_PAGE', page }),
    setAdminPage: (page) => dispatch({ type: 'SET_ADMIN_PAGE', page }),
    selectReport: (id) => dispatch({ type: 'SELECT_REPORT', id }),
    selectActivity: (id) => dispatch({ type: 'SELECT_ACTIVITY', id }),
    clearSuccess: () => dispatch({ type: 'CLEAR_SUCCESS' }),
    register: async (name, email, password) => {
      await request('/api/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
    },
    login: async (email, password, admin) => {
      applyLogin(await request('/api/login', { method: 'POST', body: JSON.stringify({ email, password, admin }) }))
    },
    logout: async () => {
      try { await request('/api/logout', { method: 'POST' }) } catch { /* local logout still succeeds */ }
      token = ''
      sessionStorage.removeItem('campuscare_token')
      dispatch({ type: 'RESET' })
    },
    submitReport: async (draft) => {
      const before = new Set(state.reports.map((report) => report.id))
      const data = await request<ServerState>('/api/reports', { method: 'POST', body: JSON.stringify(draft) })
      const newId = data.reports.find((report) => !before.has(report.id))?.id ?? data.reports[0]?.id
      dispatch({ type: 'APPLY_SERVER', data })
      if (newId) dispatch({ type: 'REPORT_SUCCESS', id: newId })
    },
    updateReport: async (id, update) => {
      const current = state.reports.find((report) => report.id === id)
      if (!current) throw new Error('Report not found')
      const merged: ReportUpdate = {
        status: update.status ?? current.status,
        priority: update.priority ?? current.priority,
        assignedTo: update.assignedTo ?? current.assignedTo,
        resolutionNotes: update.resolutionNotes ?? current.resolutionNotes,
      }
      const data = await request<ServerState>(`/api/reports/${id}`, { method: 'PUT', body: JSON.stringify(merged) })
      dispatch({ type: 'APPLY_SERVER', data })
    },
    joinActivity: async (id) => {
      const data = await request<ServerState>(`/api/activities/${id}/join`, { method: 'POST' })
      dispatch({ type: 'APPLY_SERVER', data })
    },
    addActivity: async (input) => {
      const data = await request<ServerState>('/api/activities', { method: 'POST', body: JSON.stringify(input) })
      dispatch({ type: 'APPLY_SERVER', data })
    },
    updateActivity: async (id, input) => {
      const data = await request<ServerState>(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(input) })
      dispatch({ type: 'APPLY_SERVER', data })
    },
    updateProfile: async (name, program, year) => {
      const data = await request<ServerState>('/api/profile', { method: 'PUT', body: JSON.stringify({ name, program, year }) })
      dispatch({ type: 'APPLY_SERVER', data })
    },
  }), [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppState must be used inside AppStateProvider')
  return context
}

export const statusOrder: ReportStatus[] = ['REPORTED', 'ASSIGNED', 'IN PROGRESS', 'RESOLVED', 'VERIFIED']
export const priorityRank: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 }
