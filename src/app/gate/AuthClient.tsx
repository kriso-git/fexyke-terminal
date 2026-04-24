'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { login, register } from '@/app/actions'

export function AuthClient() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'req'>('login')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [regError, setRegError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setLoginError(null)
    try {
      const res = await login(new FormData(e.currentTarget))
      if (res?.error) {
        setLoginError(res.error)
        setPending(false)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/'), 600)
      }
    } catch {
      setLoginError('Váratlan hiba. Próbáld újra.')
      setPending(false)
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (password !== confirmPassword) {
      setConfirmError('A két jelszó nem egyezik meg.')
      return
    }
    setConfirmError(null)
    setPending(true)
    setRegError(null)
    try {
      const res = await register(new FormData(form))
      if (res?.error) {
        setRegError(res.error)
        setPending(false)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/'), 600)
      }
    } catch {
      setRegError('Váratlan hiba. Próbáld újra.')
      setPending(false)
    }
  }

  return (
    <div className="gate-island-wrap">
      <div className="gate-island">
        {/* HUD bottom corners */}
        <div className="gate-island-corner-bl" />
        <div className="gate-island-corner-br" />

        {/* Header */}
        <div className="gate-island-header">
          <Link href="/" className="gate-back-btn">◁ FŐOLDAL</Link>
          <div style={{ display:'flex', gap:6 }}>
            <Chip kind="dash">CIKLUS 047</Chip>
            <Chip kind="accent" dot>ÉLŐ</Chip>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(['login','req'] as const).map((m, i) => {
            const labels = ['BELÉPÉS','REGISZTRÁCIÓ']
            return (
              <div key={m} className={`tab${mode===m?' active':''}`}
                onClick={()=>{ setMode(m); setLoginError(null); setRegError(null); setConfirmError(null); setConfirmPassword(''); setSuccess(false) }}>
                {labels[i]}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="gate-island-body">
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>◢ HÍVÓJEL</span>
                <input
                  name="callsign"
                  className="input"
                  placeholder="pl. NULLSET"
                  style={{ fontSize:17, letterSpacing:'.08em', textTransform:'uppercase' }}
                  autoComplete="username"
                  autoFocus
                  disabled={pending || success}
                />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>◢ JELSZÓ</span>
                <input
                  name="password"
                  className="input"
                  type="password"
                  placeholder="············"
                  style={{ fontFamily:'var(--f-mono)', fontSize:16, letterSpacing:'.3em' }}
                  autoComplete="current-password"
                  disabled={pending || success}
                />
              </label>
              {loginError && (
                <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>
                  ◢ {loginError}
                </div>
              )}
              {success && (
                <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>
                  ◢ AZONOSÍTÁS SIKERES · ÁTIRÁNYÍTÁS...
                </div>
              )}
              <div style={{ paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width:'100%', justifyContent:'center', fontSize:13, transition:'opacity .15s, transform .1s', ...(pending ? { opacity:.7 } : {}) }}
                  disabled={pending || success}
                >
                  {success ? '◢ SIKERES...' : pending ? '◢ AZONOSÍTÁS...' : '◢ BELÉPÉS'}
                </button>
              </div>
              <div style={{ textAlign:'center' }}>
                <span className="sys muted" style={{ fontSize:11 }}>Nincs fiókod? </span>
                <button type="button" className="sys" style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }} onClick={()=>setMode('req')}>
                  Regisztrálj →
                </button>
              </div>
            </form>
          )}

          {mode === 'req' && (
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>◢ HÍVÓJEL</span>
                <input
                  name="callsign"
                  className="input"
                  placeholder="pl. NOCTIS"
                  style={{ fontSize:17, letterSpacing:'.08em', textTransform:'uppercase' }}
                  autoComplete="username"
                  autoFocus
                  disabled={pending || success}
                />
                <span className="sys muted" style={{ fontSize:10 }}>Min. 3 karakter · csak betűk és számok</span>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>◢ JELSZÓ</span>
                <input
                  name="password"
                  className="input"
                  type="password"
                  placeholder="············"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ fontFamily:'var(--f-mono)', fontSize:16, letterSpacing:'.3em' }}
                  autoComplete="new-password"
                  disabled={pending || success}
                />
                <span className="sys muted" style={{ fontSize:10 }}>Min. 6 karakter</span>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>◢ JELSZÓ MEGERŐSÍTÉSE</span>
                <input
                  className="input"
                  type="password"
                  placeholder="············"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setConfirmError(null) }}
                  style={{
                    fontFamily:'var(--f-mono)',
                    fontSize:16,
                    letterSpacing:'.3em',
                    ...(confirmError
                      ? { borderColor:'var(--red)' }
                      : confirmPassword && confirmPassword === password
                        ? { borderColor:'var(--accent)' }
                        : {}),
                  }}
                  autoComplete="new-password"
                  disabled={pending || success}
                />
                {confirmError && (
                  <span style={{ fontSize:10, color:'var(--red)', fontFamily:'var(--f-sys)' }}>◢ {confirmError}</span>
                )}
              </label>
              {regError && (
                <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>
                  ◢ {regError}
                </div>
              )}
              {success && (
                <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>
                  ◢ FIÓK LÉTREHOZVA · ÁTIRÁNYÍTÁS...
                </div>
              )}
              <div style={{ paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width:'100%', justifyContent:'center', fontSize:13, transition:'opacity .15s', ...(pending ? { opacity:.7 } : {}) }}
                  disabled={pending || success}
                >
                  {success ? '◢ LÉTREHOZVA...' : pending ? '◢ REGISZTRÁCIÓ...' : '◢ FIÓK LÉTREHOZÁSA'}
                </button>
              </div>
              <div style={{ textAlign:'center' }}>
                <span className="sys muted" style={{ fontSize:11 }}>Van már fiókod? </span>
                <button type="button" className="sys" style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }} onClick={()=>setMode('login')}>
                  Belépés →
                </button>
              </div>
            </form>
          )}

          {/* Gate log */}
          <Panel tag="◢ KAPU NAPLÓ" title="UTOLSÓ BELÉPÉSEK">
            <div>
              {[
                ['00:14:02','NULLSET','SIKER',  'acc'],
                ['00:08:41','(ismeretlen)','ELUTASÍTVA','err'],
                ['00:04:22','HALO','SIKER','acc'],
                ['00:01:09','PARALLAX','SIKER','acc'],
                ['23:57:40','(ismeretlen)','ELUTASÍTVA','err'],
                ['23:44:11','KURIER','SIKER','acc'],
              ].map((r,i,a)=>(
                <div key={i} style={{ display:'grid', gridTemplateColumns:'72px 1fr auto', gap:10, padding:'5px 0', borderBottom:i<a.length-1?'1px solid var(--border-0)':'none', alignItems:'center' }}>
                  <span className="mono muted" style={{ fontSize:11 }}>{r[0]}</span>
                  <span className="sys muted" style={{ fontSize:11 }}>{r[1]}</span>
                  <Chip kind={r[3]==='acc'?'accent':'mag'} dot>{r[2]}</Chip>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
