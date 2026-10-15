import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { FormFeedback, SoftButton } from './ui'
import { useAppState } from '../state/AppState'

export function WelcomeScreen() {
  const { login, register } = useAppState()
  const [loginType, setLoginType] = useState<'student' | 'admin' | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => { setEmail(''); setName(''); setPassword(''); setMessage('') }
  const close = () => { setLoginType(null); setRegisterOpen(false); reset() }

  const doLogin = async () => {
    setBusy(true); setMessage('')
    try { await login(email, password, loginType === 'admin') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Login failed') }
    finally { setBusy(false) }
  }

  const doRegister = async () => {
    setBusy(true); setMessage('')
    try {
      await register(name, email, password)
      setRegisterOpen(false)
      setLoginType('student')
      setMessage('Account created. Sign in with the same email and password.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Registration failed') }
    finally { setBusy(false) }
  }

  return <main className="welcome-screen">
    <div className="welcome-bg"><div className="welcome-bg__glow welcome-bg__glow--one" /><div className="welcome-bg__glow welcome-bg__glow--two" /><div className="welcome-bg__grid" /><div className="welcome-bg__orbit welcome-bg__orbit--one" /><div className="welcome-bg__orbit welcome-bg__orbit--two" /></div>
    <header className="welcome-nav"><span className="welcome-name">Campus Care</span><nav><a href="#principles">How it works</a><a href="#community">Community</a></nav><div className="welcome-nav__note">Made for campus life</div></header>
    <section className="welcome-hero" id="principles">
      <div className="welcome-copy">
        <h1>Your campus.<br /><em>Your say.</em></h1>
        <p className="hero-subline">Report an issue. Follow its progress.</p>
        <p className="hero-description">Tell your college about an issue, check for updates, and find activities to join.</p>
        <div className="hero-actions"><SoftButton onClick={() => { reset(); setLoginType('student') }} icon={<ArrowRight size={17} />}>Student Login</SoftButton><SoftButton variant="secondary" onClick={() => { reset(); setRegisterOpen(true) }}>Create Account</SoftButton></div>
        <button className="admin-entry" onClick={() => { reset(); setLoginType('admin') }}>Admin Login</button>
      </div>
      <div className="welcome-proof" id="community"><div className="proof-line"><span className="proof-number">01</span><span>Report what needs attention</span></div><div className="proof-line"><span className="proof-number">02</span><span>Follow status updates</span></div><div className="proof-line"><span className="proof-number">03</span><span>Join campus activities</span></div></div>
    </section>
    {loginType && <div className="modal-backdrop" onMouseDown={close}><form className="welcome-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void doLogin() }}><button type="button" className="modal-close" aria-label="Close" onClick={close}><X size={17} /></button><span className="eyebrow">{loginType === 'admin' ? 'Administrator' : 'Student'}</span><h2>{loginType === 'admin' ? 'Admin login' : 'Student login'}</h2><p>Enter your account details to continue.</p><label className="field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@college.edu" /></label><label className="field"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /></label><FormFeedback message={message} error={!message.startsWith("Account created")} /><SoftButton type="submit" disabled={busy} icon={<ArrowRight size={17} />}>{busy ? 'Signing in…' : 'Sign in'}</SoftButton></form></div>}

    {registerOpen && <div className="modal-backdrop" onMouseDown={close}><form className="welcome-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void doRegister() }}><button type="button" className="modal-close" aria-label="Close" onClick={close}><X size={17} /></button><span className="eyebrow">Student account</span><h2>Create an account</h2><p>Use your college email and a password of at least eight characters.</p><label className="field"><span>Full name</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label><label className="field"><span>College email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@college.edu" /></label><label className="field"><span>Password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><FormFeedback message={message} error={!message.startsWith("Account created")} /><SoftButton type="submit" disabled={busy} icon={<ArrowRight size={17} />}>{busy ? 'Creating…' : 'Create account'}</SoftButton></form></div>}
  </main>
}
