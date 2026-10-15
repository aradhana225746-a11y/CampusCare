import { useState } from 'react'
import type { Activity } from '../data/models'
import { useAppState } from '../state/AppState'
import { FormFeedback, SoftButton, StatusBadge } from './ui'

export function ActivityCard({ activity, onOpen }: { activity: Activity; onOpen: () => void }) {
  const { state, joinActivity } = useAppState()
  const admin = state.student.role === 'ADMIN'
  const joined = state.student.joinedActivityIds.includes(activity.id)

  const [joining, setJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const join = async () => {
    if (joining) return
    setJoining(true); setErrorMessage('')
    try { await joinActivity(activity.id) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not join activity') }
    finally { setJoining(false) }
  }

  return <article className="activity-card" onClick={onOpen}><div className="activity-card__body"><div className="activity-card__top"><span className="eyebrow">{activity.date}</span><StatusBadge status={activity.status} /></div><h3>{activity.title}</h3><p>{activity.description}</p><div className="activity-card__meta"><span>{activity.participants} participating</span><span>+{activity.points} pts</span></div><div className="activity-card__footer" onClick={(event) => event.stopPropagation()}><SoftButton disabled={!admin && (joining || joined || activity.status !== 'OPEN')} variant={joined || admin ? 'secondary' : 'primary'} onClick={() => { if (admin) onOpen(); else if (!joined) void join() }}>{admin ? 'Manage activity' : joined ? 'Joined' : joining ? 'Joining…' : activity.status !== 'OPEN' ? 'Unavailable' : 'Join activity'}</SoftButton><button className="text-arrow" onClick={(event) => { event.stopPropagation(); onOpen() }}>{admin ? 'Open' : 'View details'} </button></div><FormFeedback message={errorMessage} error /></div></article>
}
