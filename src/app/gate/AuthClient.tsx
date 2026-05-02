'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Panel } from '@/components/ui/Panel'
import { LangPicker } from '@/components/ui/LangPicker'
import { useI18n } from '@/hooks/useI18n'
import { login, register } from '@/app/actions'

type Tab = 'login' | 'register' | 'recovery'

export function AuthClient() {
  const router = useRouter()
  const { t } = useI18n()
  const [tab, setTab]                   = useState<Tab>('login')
  const [loginError, setLoginError]     = useState<string | null>(null)
  const [regError, setRegError]         = useState<string | null>(null)
  const [recError, setRecError]         = useState<string | null>(null)
  const [pending, setPending]           = useState(false)
  const [success, setSuccess]           = useState(false)
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [remember, setRemember]         = useState(false)

  function resetAll() {
    setLoginError(null); setRegError(null); setRecError(null)
    setConfirmError(null); setConfirmPassword(''); setSuccess(false)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true); setLoginError(null)
    try {
      const res = await login(new FormData(e.currentTarget))
      if (res?.error) { setLoginError(res.error); setPending(false) }
      else { setSuccess(true); setTimeout(() => router.push('/'), 600) }
    } catch { setLoginError('Váratlan hiba. Próbáld újra.'); setPending(false) }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirmPassword) { setConfirmError('A két jelszó nem egyezik meg.'); return }
    setConfirmError(null); setPending(true); setRegError(null)
    try {
      const res = await register(new FormData(e.currentTarget))
      if (res?.error) { setRegError(res.error); setPending(false) }
      else { setSuccess(true); setTimeout(() => router.push('/'), 600) }
    } catch { setRegError('Váratlan hiba. Próbáld újra.'); setPending(false) }
  }

  return (
    <div className="r-gate">
      {/* LEFT hero */}
      <div className="gate-hero" style={{ position:'relative', padding:'64px 56px', background:'radial-gradient(ellipse at 30% 40%, rgba(24,233,104,.08), transparent 60%)' }}>
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          <svg viewBox="0 0 600 800" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.35 }}>
            {Array.from({length:60}).map((_,j)=>{
              const x=(j*73)%580+10, y=(j*97)%780+10, hi=j%11===0
              return <circle key={j} cx={x} cy={y} r={hi?2.4:1.1} fill={hi?'var(--accent)':'var(--ink-3)'} style={hi?{filter:'drop-shadow(0 0 3px var(--accent))'}:undefined}/>
            })}
            {Array.from({length:30}).map((_,j)=>{
              const x1=(j*73)%580+10, y1=(j*97)%780+10, x2=((j+4)*73)%580+10, y2=((j+4)*97)%780+10
              return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-1)" strokeWidth="0.4"/>
            })}
          </svg>
        </div>
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:28, maxWidth:640 }}>
          <div style={{ display:'flex', gap:8 }}>
            <Chip kind="solid" dot>{t('auth.required')}</Chip>
            <Chip kind="cyan">{t('hero.link')}</Chip>
          </div>
          <h1 className="display r-display-gate" style={{ margin:0 }}>
            {t('auth.login')} /<br/>
            <span style={{ color:'var(--accent)', textShadow:'0 0 16px rgba(24,233,104,.4)' }}>F3XYKEE</span><br/>
            BLOG
          </h1>
          <p style={{ margin:0, maxWidth:520, color:'var(--ink-1)', fontSize:15, lineHeight:1.65 }}>
            {t('auth.intro')}
          </p>
          <div><LangPicker/></div>
          <div className="panel" style={{ padding:'16px 18px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, maxWidth:480 }}>
            {[['SZERVER','bud-01'],['TITKOSÍTÁS','TLS v2'],['ÁLLAPOT','0.98']].map(([k,v])=>(
              <div key={k}>
                <div className="sys muted">{k}</div>
                <div className="mono" style={{ fontSize:13, color:'var(--accent)', marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT form */}
      <div className="gate-form" style={{ background:'var(--bg-1)' }}>
        {/* Tile wrapper */}
        <div className="gate-tile gate-tile-stack">
        <div className="tabs">
          {([['login',t('auth.login')],['register',t('auth.register')],['recovery',t('auth.recovery')]] as [Tab,string][]).map(([key,label]) => (
            <div key={key} className={`tab${tab===key?' active':''}`}
              onClick={() => { setTab(key); resetAll() }}>{label}</div>
          ))}
        </div>

        {/* LOGIN */}
        {tab === 'login' && (
          <Panel tag="◢ AZONOSÍTÁS" title={t('auth.login')} className="panel-raised" chips={<Chip kind="accent" dot>ÉLŐ</Chip>}>
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.username')}</span>
                <input name="callsign" className="input"
                  placeholder="pl. NULLSET"
                  style={{ fontSize:18, letterSpacing:'.08em', textTransform:'uppercase' }}
                  autoComplete="username" autoFocus disabled={pending || success}/>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.password')}</span>
                <input name="password" className="input" type="password"
                  placeholder="············"
                  style={{ fontFamily:'var(--f-mono)', fontSize:16, letterSpacing:'.3em' }}
                  autoComplete="current-password" disabled={pending || success}/>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{ accentColor:'var(--accent)' }}/>
                <span className="chip chip-dash" style={{ cursor:'pointer', userSelect:'none' }}>{t('auth.remember')}</span>
              </label>
              {loginError && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {loginError}</div>}
              {success   && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>{t('auth.login_success')}</div>}
              <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => router.push('/')} disabled={pending}>{t('auth.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} disabled={pending || success}>
                  {success ? t('auth.success') : pending ? t('auth.entering') : t('auth.enter')}
                </button>
              </div>
              <div style={{ textAlign:'center' }}>
                <button type="button" className="sys" style={{ fontSize:11, color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer' }}
                  onClick={() => { setTab('recovery'); resetAll() }}>
                  {t('auth.forgot')}
                </button>
              </div>
            </form>
          </Panel>
        )}

        {/* REGISTER */}
        {tab === 'register' && (
          <Panel tag="◢ ÚJ FIÓK" title={t('auth.register')} className="panel-raised">
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.username')}</span>
                <input name="callsign" className="input"
                  placeholder="pl. NOCTIS"
                  style={{ fontSize:18, letterSpacing:'.08em', textTransform:'uppercase' }}
                  autoComplete="username" autoFocus disabled={pending || success}/>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.password')}</span>
                <input name="password" className="input" type="password"
                  placeholder="············"
                  value={password} onChange={e=>setPassword(e.target.value)}
                  style={{ fontFamily:'var(--f-mono)', fontSize:16, letterSpacing:'.3em' }}
                  autoComplete="new-password" disabled={pending || success}/>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.password_confirm')}</span>
                <input className="input" type="password"
                  placeholder="············"
                  value={confirmPassword}
                  onChange={e=>{ setConfirmPassword(e.target.value); setConfirmError(null) }}
                  style={{ fontFamily:'var(--f-mono)', fontSize:16, letterSpacing:'.3em',
                    ...(confirmError ? { borderColor:'var(--red)' } : confirmPassword && confirmPassword === password ? { borderColor:'var(--accent)' } : {}) }}
                  autoComplete="new-password" disabled={pending || success}/>
                {confirmError && <span style={{ fontSize:10, color:'var(--red)', fontFamily:'var(--f-sys)' }}>◢ {confirmError}</span>}
              </label>
              {regError && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {regError}</div>}
              {success  && <div style={{ padding:'8px 12px', background:'rgba(24,233,104,.1)', border:'1px solid var(--accent)', color:'var(--accent)', fontFamily:'var(--f-sys)', fontSize:11 }}>{t('auth.register_success')}</div>}
              <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => { setTab('login'); resetAll() }} disabled={pending}>{t('auth.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} disabled={pending || success}>
                  {success ? t('auth.created') : pending ? t('auth.creating') : t('auth.create')}
                </button>
              </div>
            </form>
          </Panel>
        )}

        {/* RECOVERY */}
        {tab === 'recovery' && (
          <Panel tag="◢ HELYREÁLLÍTÁS" title={t('auth.recovery')} className="panel-raised">
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'10px 14px', background:'rgba(255,179,71,.07)', border:'1px solid rgba(255,179,71,.3)', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ color:'var(--amber)', fontSize:16, flexShrink:0 }}>⚠</span>
                <span className="sys muted" style={{ fontSize:11, lineHeight:1.6 }}>
                  {t('auth.recovery_warn')}
                </span>
              </div>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span className="sys muted" style={{ fontSize:11 }}>{t('auth.username')}</span>
                <input className="input"
                  placeholder="pl. NULLSET"
                  style={{ fontSize:18, letterSpacing:'.08em', textTransform:'uppercase' }}
                  autoFocus disabled/>
              </label>
              {recError && <div style={{ padding:'8px 12px', background:'rgba(255,58,58,.1)', border:'1px solid var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>◢ {recError}</div>}
              <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => { setTab('login'); resetAll() }}>{t('auth.cancel')}</button>
                <button type="button" className="btn" style={{ flex:2, justifyContent:'center', opacity:.5 }} disabled>
                  ◢ {t('auth.recovery')}
                </button>
              </div>
            </div>
          </Panel>
        )}

        </div>
      </div>
    </div>
  )
}
