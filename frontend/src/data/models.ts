export type Mode = 'welcome' | 'student' | 'admin'
export type StudentPage = 'dashboard' | 'report' | 'reports' | 'community' | 'contribution' | 'profile'
export type AdminPage = 'overview' | 'reports' | 'activities' | 'participants' | 'analytics'
export type ReportStatus = 'REPORTED' | 'ASSIGNED' | 'IN PROGRESS' | 'RESOLVED' | 'VERIFIED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export const categories = [
  'Water & Plumbing', 'Electrical', 'Furniture', 'Cleanliness', 'Waste Management',
  'Infrastructure', 'Classroom Maintenance', 'Canteen', 'Other',
] as const

export interface Report {
  id: string
  title: string
  category: string
  location: string
  description: string
  date: string
  priority: Priority
  status: ReportStatus
  assignedTo: string
  resolutionNotes: string
  reporter: string
}

export interface Activity {
  id: string
  title: string
  description: string
  date: string
  time: string
  dateTime: string
  location: string
  participants: number
  points: number
  status: 'OPEN' | 'FULL' | 'COMPLETED'
  icon: 'leaf' | 'recycle' | 'book' | 'spark' | 'megaphone'
  accent: string
}

export interface ContributionEvent {
  id: string
  amount: number
  label: string
  date: string
}
