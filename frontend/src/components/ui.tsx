import type { ReactNode } from 'react'
import { ArrowUpRight, Check, ChevronRight, CircleAlert, CircleCheck, CircleDashed, Clock3 } from 'lucide-react'
import type { Priority, ReportStatus } from '../data/models'

export function StatusBadge({ status }: { status: ReportStatus | Priority | 'OPEN' | 'FULL' | 'COMPLETED' }) {
  const normalized = status.toLowerCase().replace(/ /g, '-')
  return <span className={`status-badge status-badge--${normalized}`}>{status}</span>
}

export function MetricCard({ value, label, detail, tone = 'plain', icon }: { value: string | number; label: string; detail?: string; tone?: string; icon?: ReactNode }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top"><span className="metric-card__label">{label}</span>{icon && <span className="metric-card__icon">{icon}</span>}</div>
      <strong className="metric-card__value">{value}</strong>
      {detail && <span className="metric-card__detail">{detail}</span>}
    </article>
  )
}

export function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </div>
  )
}

export function SoftButton({ children, onClick, variant = 'primary', icon, type = 'button', className = '', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'quiet'; icon?: ReactNode; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`soft-button soft-button--${variant} ${className}`}>{children}{icon && <span className="soft-button__icon">{icon}</span>}</button>
}

export function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>
}

export function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><CircleDashed size={22} /><strong>{title}</strong><p>{copy}</p></div>
}

export function ProgressBar({ value, color = 'green' }: { value: number; color?: string }) {
  return <div className="progress-bar"><span className={`progress-bar__fill progress-bar__fill--${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

export function DetailRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return <div className="detail-row"><span>{icon}{label}</span><strong>{value}</strong></div>
}

export function TableRow({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <div className={`table-row ${onClick ? 'table-row--interactive' : ''}`} onClick={onClick}>{children}<ChevronRight size={16} className="table-row__chevron" /></div>
}

export function MiniChart({ values, labels, color = 'green' }: { values: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...values, 1)
  return <div className="mini-chart">{values.map((value, index) => <div className="mini-chart__item" key={`${labels[index]}-${value}`}><div className="mini-chart__bar-wrap"><span className={`mini-chart__bar mini-chart__bar--${color}`} style={{ height: `${(value / max) * 100}%` }} /></div><small>{labels[index]}</small></div>)}</div>
}

export function Notice({ tone = 'success', title, copy }: { tone?: 'success' | 'info' | 'warning'; title: string; copy: string }) {
  const Icon = tone === 'warning' ? CircleAlert : tone === 'info' ? Clock3 : CircleCheck
  return <div className={`notice notice--${tone}`}><Icon size={18} /><div><strong>{title}</strong><p>{copy}</p></div></div>
}

export function LinkAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button className="link-action" onClick={onClick}>{children}<ArrowUpRight size={15} /></button>
}

export function CheckMark() {
  return <span className="check-mark"><Check size={13} /></span>
}

export function FormFeedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null
  return <p className={`form-feedback ${error ? 'form-feedback--error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>
}
