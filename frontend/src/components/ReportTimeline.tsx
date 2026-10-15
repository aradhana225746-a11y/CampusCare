import { Check, Circle, CircleCheck } from 'lucide-react'
import type { ReportStatus } from '../data/models'
import { statusOrder } from '../state/AppState'

export function ReportTimeline({ currentStatus }: { currentStatus: ReportStatus }) {
  const currentIndex = statusOrder.indexOf(currentStatus)
  return (
    <div className="report-timeline" aria-label={`Report status: ${currentStatus}`}>
      {statusOrder.map((status, index) => {
        const complete = index < currentIndex
        const active = index === currentIndex
        return <div className={`timeline-step ${complete ? 'timeline-step--complete' : ''} ${active ? 'timeline-step--active' : ''}`} key={status}>
          <div className="timeline-step__marker">{complete ? <Check size={14} /> : active ? <CircleCheck size={17} /> : <Circle size={15} />}</div>
          <span>{status}</span>
          {index < statusOrder.length - 1 && <i className={index < currentIndex ? 'timeline-connector timeline-connector--complete' : 'timeline-connector'} />}
        </div>
      })}
    </div>
  )
}
