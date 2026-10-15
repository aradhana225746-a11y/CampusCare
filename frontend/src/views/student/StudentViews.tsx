import { useMemo, useState } from 'react'
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Clock3, FileText, Filter, Leaf, MapPin, Search, Sparkles, Users, X } from 'lucide-react'
import { categories, type Activity, type Report } from '../../data/models'
import { useAppState } from '../../state/AppState'
import { ReportTimeline } from '../../components/ReportTimeline'
import { ActivityCard } from '../../components/ActivityCard'
import { DetailRow, EmptyState, FieldLabel, FormFeedback, LinkAction, MetricCard, Notice, ProgressBar, SectionHeading, SoftButton, StatusBadge, TableRow } from '../../components/ui'

export function StudentDashboard() {
  const { state, setStudentPage, selectReport } = useAppState()
  const recent = state.reports.slice(0, 3)
  const resolved = state.reports.filter((report) => ['RESOLVED', 'VERIFIED'].includes(report.status)).length
  const progress = state.reports.filter((report) => report.status === 'IN PROGRESS').length
  const resolutionRate = state.reports.length ? Math.round((resolved / state.reports.length) * 100) : 0
  const totalParticipants = state.activities.reduce((sum, activity) => sum + activity.participants, 0)
  return <div className="view-stack view-stack--dashboard">
    <div className="dashboard-lead"><div><span className="eyebrow">Campus Care</span><h2>Welcome, {state.student.name || 'Student'}</h2><p>Here’s what’s happening around your campus.</p></div><SoftButton onClick={() => setStudentPage('report')}>Report an Issue</SoftButton></div>
    <div className="metric-grid metric-grid--four"><MetricCard value={state.reports.length} label="My Reports" detail="Submitted reports" tone="lavender" icon={<FileText size={17} />} /><MetricCard value={resolved} label="Resolved" detail={`${resolutionRate}% resolution rate`} tone="sage" icon={<CheckCircle2 size={17} />} /><MetricCard value={progress} label="In Progress" detail="Being looked into" tone="peach" icon={<ActivityIcon size={17} />} /><MetricCard value={state.student.contributionPoints} label="Contribution Points" detail="From reports and activities" tone="ink" icon={<Sparkles size={17} />} /></div>
    <div className="dashboard-grid">
      <section className="panel panel--reports"><SectionHeading eyebrow="Recent activity" title="Recent reports" copy="The latest updates on your reports." action={<LinkAction onClick={() => setStudentPage('reports')}>View all reports</LinkAction>} />
        <div className="report-list">{recent.length ? recent.map((report) => <TableRow key={report.id} onClick={() => { selectReport(report.id); setStudentPage('reports') }}><div className="report-row__main"><span className="report-row__id">{report.id}</span><strong>{report.title}</strong><small>{report.location}</small></div><StatusBadge status={report.status} /></TableRow>) : <EmptyState title="No reports yet" copy="Create your first campus report to see it here." />}</div></section>
      <section className="panel panel--impact"><SectionHeading eyebrow="Overview" title="Report status" copy="Current status of your reports and campus activities." /><div className="impact-number"><strong>{resolutionRate}%</strong><span>of your reports are resolved or verified.</span></div><ProgressBar value={resolutionRate} /><div className="impact-stats"><div><strong>{resolved}</strong><span>Issues solved</span></div><div><strong>{state.reports.length - resolved}</strong><span>Active reports</span></div><div><strong>{state.activities.length}</strong><span>Activities</span></div><div><strong>{totalParticipants}</strong><span>Participants</span></div></div><div className="impact-stamp"><span>REPORT</span><i /><span>CONNECT</span><i /><span>SOLVE</span><i /><span>IMPACT</span></div></section>
    </div>
    <section className="quote-panel"><div className="quote-panel__mark">“</div><p>A clear location and a few details help campus teams understand the issue.</p><span>— Reporting tip</span></section>
  </div>
}

export function ReportIssue() {
  const { state, clearSuccess, submitReport, setStudentPage, selectReport } = useAppState()
  const [draft, setDraft] = useState({ title: '', category: categories[0], location: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const success = state.reportSuccessId
  const submit = async () => {
    if (busy) return
    setBusy(true); setErrorMessage('')
    try { await submitReport(draft) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not submit report') }
    finally { setBusy(false) }
  }
  return <div className="view-stack"><div className="page-lead"><div><span className="eyebrow">New report</span><h2>Report an issue</h2><p>Describe the issue and where it is located.</p></div><div className="page-lead__note">Track updates in My Reports</div></div>
    {success ? <div className="success-layout"><div className="success-card"><div className="success-card__icon"><CheckCircle2 size={25} /></div><span className="eyebrow">Submitted</span><h2>Report submitted</h2><p>Your report has been submitted.</p><div className="success-id"><span>Report ID</span><strong>{success}</strong></div><div className="success-actions"><SoftButton onClick={() => { selectReport(success); setStudentPage('reports') }}>Track this report</SoftButton><SoftButton variant="secondary" onClick={() => { clearSuccess(); setDraft({ title: '', category: categories[0], location: '', description: '' }) }}>Submit another</SoftButton></div></div><div className="success-aside"><span className="eyebrow">What happens next</span><div className="next-step"><span>01</span><div><strong>We review the report</strong><p>A campus team checks the details and routes it to the right place.</p></div></div><div className="next-step"><span>02</span><div><strong>You see the progress</strong><p>Track assignment, work in progress, resolution, and verification.</p></div></div></div></div> : <form className="form-layout" onSubmit={(event) => { event.preventDefault(); void submit() }}><div className="panel form-card"><div className="form-card__head"><div><span className="eyebrow">New report</span><h3>Issue details</h3></div><span className="form-card__step">1 / 1</span></div><div className="form-grid"><FieldLabel label="Issue title"><input required value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Water leakage near the stairs" /></FieldLabel><FieldLabel label="Category"><div className="select-wrap"><select value={draft.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={15} /></div></FieldLabel><FieldLabel label="Location"><input required value={draft.location} onChange={(event) => update('location', event.target.value)} placeholder="Block, floor, room or area" /></FieldLabel><FieldLabel label="Description"><textarea required value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="What did you notice? Add any useful context, timing or safety detail." rows={6} /></FieldLabel></div><FormFeedback message={errorMessage} error /><div className="form-footer"><p>You can track this report after submitting.</p><SoftButton type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</SoftButton></div></div><aside className="form-aside"><div className="form-aside__shape"><div className="shape-person shape-person--one" /><div className="shape-person shape-person--two" /><div className="shape-bridge" /></div><span className="eyebrow">Before you submit</span><h3>Add useful details</h3><p>Include the exact location and a short description so the issue can be assigned correctly.</p></aside></form>}
  </div>
}

export function MyReports() {
  const { state, setStudentPage, selectReport } = useAppState()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [status, setStatus] = useState('All statuses')
  const selected = state.selectedReportId ? state.reports.find((report) => report.id === state.selectedReportId) : null
  const filtered = useMemo(() => state.reports.filter((report) => {
    const matchesQuery = `${report.id} ${report.title} ${report.location}`.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = category === 'All categories' || report.category === category
    const matchesStatus = status === 'All statuses' || report.status === status
    return matchesQuery && matchesCategory && matchesStatus
  }), [state.reports, query, category, status])
  if (selected) return <div className="view-stack"><button className="back-link" onClick={() => selectReport(null)}><ArrowLeft size={15} /> Back to my reports</button><ReportDetail report={selected} /></div>
  return <div className="view-stack"><div className="page-lead"><div><span className="eyebrow">Reports</span><h2>My reports</h2><p>Check the status of issues you have submitted.</p></div><SoftButton onClick={() => setStudentPage('report')}>Report an issue</SoftButton></div><div className="filter-bar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" /></label><div className="filter-select"><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div className="filter-select"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>REPORTED</option><option>ASSIGNED</option><option>IN PROGRESS</option><option>RESOLVED</option><option>VERIFIED</option></select></div></div><section className="panel report-table"><div className="table-head"><span>Report</span><span>Category</span><span>Date</span><span>Priority</span><span>Status</span><span /></div>{filtered.length ? filtered.map((report) => <div className="report-table-row" key={report.id} onClick={() => selectReport(report.id)}><div className="report-table-row__title"><span>{report.id}</span><strong>{report.title}</strong><small>{report.location}</small></div><span>{report.category}</span><span>{report.date}</span><StatusBadge status={report.priority} /><StatusBadge status={report.status} /><ChevronDown className="table-arrow" size={16} /></div>) : <EmptyState title="Nothing matches yet" copy="Try another search or clear one of the filters." />}</section><div className="list-footnote"><span>{filtered.length} reports in view</span><span>Select a report for details</span></div></div>
}

export function ReportDetail({ report, admin = false }: { report: Report; admin?: boolean }) {
  const { updateReport } = useAppState()
  const [edit, setEdit] = useState({ status: report.status, priority: report.priority, assignedTo: report.assignedTo, resolutionNotes: report.resolutionNotes })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)
  const save = async () => {
    if (saving) return
    setSaving(true); setFeedback(''); setFailed(false)
    try { await updateReport(report.id, edit); setFeedback('Report updated.') }
    catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : 'Could not save report') }
    finally { setSaving(false) }
  }
  return <section className="detail-layout"><div className="detail-main"><div className="detail-header"><div><span className="report-row__id">{report.id}</span><h2>{report.title}</h2><p>{report.description}</p></div><StatusBadge status={report.status} /></div><ReportTimeline currentStatus={report.status} /><div className="panel detail-card"><div className="detail-card__head"><span className="eyebrow">Report details</span><span className="detail-card__date">Reported {report.date}</span></div><div className="detail-grid"><DetailRow label="Category" value={report.category} icon={<FileText size={15} />} /><DetailRow label="Location" value={report.location} icon={<MapPin size={15} />} /><DetailRow label="Priority" value={<StatusBadge status={report.priority} />} /><DetailRow label="Assigned team" value={report.assignedTo || 'Not assigned'} icon={<Users size={15} />} /></div><div className="resolution-note"><span className="eyebrow">Resolution notes</span><p>{report.resolutionNotes || 'No resolution notes yet. Updates from the campus team will appear here.'}</p></div></div></div><aside className="detail-aside"><div className="panel detail-side-card"><span className="eyebrow">Report progress</span><div className="care-loop"><div className="care-loop__step care-loop__step--done"><span>R</span><div><strong>Report</strong><small>Issue submitted</small></div></div><div className="care-loop__line" /><div className={`care-loop__step ${report.status !== 'REPORTED' ? 'care-loop__step--done' : ''}`}><span>C</span><div><strong>Connect</strong><small>Right team assigned</small></div></div><div className="care-loop__line" /><div className={`care-loop__step ${['IN PROGRESS', 'RESOLVED', 'VERIFIED'].includes(report.status) ? 'care-loop__step--done' : ''}`}><span>S</span><div><strong>Solve</strong><small>Work in progress</small></div></div><div className="care-loop__line" /><div className={`care-loop__step ${report.status === 'VERIFIED' ? 'care-loop__step--done' : ''}`}><span>I</span><div><strong>Impact</strong><small>Resolution verified</small></div></div></div></div>{admin && <div className="panel admin-controls"><span className="eyebrow">Admin controls</span><FieldLabel label="Assign to"><input value={edit.assignedTo} onChange={(event) => setEdit({ ...edit, assignedTo: event.target.value })} /></FieldLabel><FieldLabel label="Priority"><select value={edit.priority} onChange={(event) => setEdit({ ...edit, priority: event.target.value as Report['priority'] })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></FieldLabel><FieldLabel label="Status"><select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as Report['status'] })}><option>REPORTED</option><option>ASSIGNED</option><option>IN PROGRESS</option><option>RESOLVED</option><option>VERIFIED</option></select></FieldLabel><FieldLabel label="Resolution notes"><textarea value={edit.resolutionNotes} onChange={(event) => setEdit({ ...edit, resolutionNotes: event.target.value })} rows={4} placeholder="Add a note for the student" /></FieldLabel><SoftButton disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</SoftButton><FormFeedback message={feedback} error={failed} /></div>}</aside></section>
}

export function Community() {
  const { state, selectActivity } = useAppState()
  return <div className="view-stack"><div className="page-lead"><div><span className="eyebrow">Campus activities</span><h2>Activities</h2><p>View upcoming activities and join the ones you are interested in.</p></div><div className="community-count"><strong>{state.activities.reduce((sum, activity) => sum + activity.participants, 0)}</strong><span>participations recorded</span></div></div><div className="activity-grid">{state.activities.map((activity) => <ActivityCard key={activity.id} activity={activity} onOpen={() => selectActivity(activity.id)} />)}</div>{state.selectedActivityId && <ActivityDetail activity={state.activities.find((activity) => activity.id === state.selectedActivityId)!} />}</div>
}

export function ActivityDetail({ activity }: { activity: Activity }) {
  const { state, joinActivity, selectActivity } = useAppState()
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
  return <div className="modal-backdrop" onMouseDown={() => selectActivity(null)}><div className="activity-detail-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close modal-close--text" onClick={() => selectActivity(null)}>Close</button><div className="activity-detail-modal__content"><span className="eyebrow">Campus activity</span><h2>{activity.title}</h2><p>{activity.description}</p><div className="activity-meta-grid"><DetailRow label="Date" value={activity.date} /><DetailRow label="Time" value={activity.time} /><DetailRow label="Location" value={activity.location} /><DetailRow label="Participants" value={`${activity.participants} students`} /><DetailRow label="Contribution" value={`+${activity.points} points`} /></div>{joined ? <Notice title="You’re participating" copy="This activity is included in your contribution statistics." /> : <SoftButton disabled={joining || activity.status !== 'OPEN'} onClick={() => void join()}>{joining ? 'Joining…' : activity.status === 'OPEN' ? 'Join activity' : 'Unavailable'}</SoftButton>}<FormFeedback message={errorMessage} error /></div></div></div>
}

export function Contribution() {
  const { state } = useAppState()
  const resolved = state.reports.filter((report) => ['RESOLVED', 'VERIFIED'].includes(report.status)).length
  return <div className="view-stack"><div className="page-lead"><div><span className="eyebrow">Contribution</span><h2>Contribution</h2><p>Points from joined activities and resolved reports.</p></div><div className="contribution-badge"><Sparkles size={16} /><span>Participation summary</span></div></div><div className="contribution-hero"><div><span className="eyebrow">Contribution points</span><strong>{state.student.contributionPoints}</strong><p>Activity points plus 20 points for each resolved or verified report.</p></div></div><div className="metric-grid metric-grid--four"><MetricCard value={state.student.activitiesJoined} label="Activities Joined" tone="sage" icon={<Leaf size={17} />} /><MetricCard value={state.reports.length} label="Issues Reported" tone="lavender" icon={<FileText size={17} />} /><MetricCard value={resolved} label="Issues Resolved" tone="peach" icon={<CheckCircle2 size={17} />} /><MetricCard value={state.student.contributionPoints} label="Contribution Points" tone="ink" icon={<Sparkles size={17} />} /></div><section className="panel contribution-history"><SectionHeading eyebrow="Recent contributions" title="Contribution history" copy="Recent activity and report points." />{state.student.contributions.length ? state.student.contributions.map((event) => <div className="contribution-row" key={event.id}><span className="contribution-row__amount">+{event.amount}</span><div><strong>{event.label}</strong><small>{event.date}</small></div><CheckCircle2 size={17} /></div>) : <EmptyState title="No activity contributions yet" copy="Join a community activity to start your contribution history." />}</section></div>
}

export function Profile() {
  const { state, updateProfile } = useAppState()
  const [name, setName] = useState(state.student.name)
  const [program, setProgram] = useState(state.student.program)
  const [year, setYear] = useState(state.student.year)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const save = async () => {
    if (saving) return
    setSaving(true); setSaved(false); setErrorMessage('')
    try { await updateProfile(name, program, year); setSaved(true) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not update profile') }
    finally { setSaving(false) }
  }
  return <div className="view-stack"><div className="page-lead"><div><span className="eyebrow">Account</span><h2>Profile</h2><p>Update your account details.</p></div></div><div className="profile-layout"><section className="panel profile-card"><div className="profile-card__hero"><div className="profile-avatar">{(state.student.name || 'S')[0]}</div><div><span className="eyebrow">Student account</span><h3>{state.student.name}</h3><p>{state.student.email}</p></div></div><div className="profile-details"><DetailRow label="Programme" value={state.student.program || 'Not set'} icon={<BookIcon />} /><DetailRow label="Year" value={state.student.year || 'Not set'} icon={<ActivityIcon size={15} />} /><DetailRow label="Account type" value={state.student.role} icon={<CalendarDays size={15} />} /></div></section><section className="panel settings-card"><span className="eyebrow">Account settings</span><h3>Edit profile</h3><FieldLabel label="Name"><input value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} /></FieldLabel><FieldLabel label="Programme"><input value={program} onChange={(event) => { setProgram(event.target.value); setSaved(false) }} placeholder="Computer Science" /></FieldLabel><FieldLabel label="Year"><input value={year} onChange={(event) => { setYear(event.target.value); setSaved(false) }} placeholder="3" /></FieldLabel><SoftButton disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save profile'}</SoftButton><FormFeedback message={errorMessage || (saved ? 'Profile updated.' : '')} error={!!errorMessage} /></section></div></div>
}

function BookIcon() { return <span className="mini-icon"><FileText size={15} /></span> }
