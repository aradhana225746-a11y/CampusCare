import { useState, type ReactNode } from 'react'
import { IconButton, SoftButton } from './ui'
import type { Mode } from '../data/models'

export interface NavItem { key: string; label: string; icon?: ReactNode }

export function AppShell({ mode, title, subtitle, nav, activeKey, onNavigate, onExit, personName, personMeta, children }: { mode: Exclude<Mode, 'welcome'>; title: string; subtitle: string; nav: NavItem[]; activeKey: string; onNavigate: (key: string) => void; onExit: () => void; personName: string; personMeta: string; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  return <div className={`app-shell app-shell--${mode}`}>
    <aside className={`sidebar ${navOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar__top"><strong className="sidebar-name">Campus Care</strong><IconButton label="Close navigation" onClick={() => setNavOpen(false)}>Close</IconButton></div>
      <div className="sidebar__context">{mode === 'admin' ? 'Admin workspace' : 'Student workspace'}</div>
      <nav className="sidebar__nav" aria-label="Primary navigation">
        {nav.map((item) => <button key={item.key} className={`sidebar-link ${activeKey === item.key ? 'sidebar-link--active' : ''}`} onClick={() => onNavigate(item.key)}>{item.label}</button>)}
      </nav>
      <div className="sidebar__bottom"><div className="sidebar__support"><div><strong>Need an update?</strong><small>Check your report status.</small></div></div><button className="sidebar__logout" onClick={onExit}>Sign out</button></div>
    </aside>
    <main className="main-canvas">
      <header className="topbar"><div className="topbar__left"><IconButton label="Open navigation" onClick={() => setNavOpen(true)}>Menu</IconButton><div><span className="topbar__eyebrow">Campus Care / {mode === 'admin' ? 'Admin' : 'Student'}</span><h1>{title}</h1></div></div><div className="topbar__right"><div className="avatar">{(personName || "S").trim().charAt(0).toUpperCase()}</div><div className="topbar__person"><strong>{personName || (mode === 'admin' ? 'Administrator' : 'Student')}</strong><span>{personMeta}</span></div><SoftButton variant="quiet" onClick={onExit}>Sign out</SoftButton></div></header>
      <div className="canvas-content"><div className="canvas-intro"><p>{subtitle}</p></div>{children}</div>
    </main>
  </div>
}
