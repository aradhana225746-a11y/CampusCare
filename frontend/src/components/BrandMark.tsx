import { type CSSProperties } from 'react'

export function BrandMark({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const ink = light ? '#F7F5EF' : '#1B133C'
  return (
    <div className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''}`}>
      <svg className="brand-lockup__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ '--brand-ink': ink } as CSSProperties}>
        <rect width="64" height="64" rx="18" fill={light ? 'rgba(247,245,239,.14)' : '#1B133C'} />
        <path d="M47 31.5 32 16 17 31.5h8.2L32 24.5l6.8 7H47Z" fill="#A8D2BD" />
        <path d="M17 32.5 32 48l15-15.5h-8.2L32 39.5l-6.8-7H17Z" fill="#F7D9BD" />
        <circle cx="32" cy="32" r="3" fill={light ? '#F7F5EF' : '#F7F5EF'} />
      </svg>
      {!compact && <span className="brand-lockup__text"><strong>Campus Care</strong><small>Reports and activities</small></span>}
    </div>
  )
}
