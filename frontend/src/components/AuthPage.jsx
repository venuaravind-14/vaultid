import React, { useState } from 'react'

function AuthPage({ onLogin, onRegister, onGoogleLogin }) {
  const [authTab, setAuthTab] = useState('login')
  const [role, setRole] = useState('user')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onLogin(loginForm.email, loginForm.password)
    } catch (e) {
      // Error handled in parent
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onRegister(registerForm.name, registerForm.email, registerForm.password)
    } catch (e) {
      // Error handled in parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="auth-page" className="page active">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="13" rx="2"/>
                <circle cx="8" cy="10" r="2"/>
                <path d="M14 8h4M14 11h3" strokeLinecap="round"/>
                <path d="M5 21h14" opacity="0.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="auth-logo-text">VaultID</div>
              <div style={{fontSize:'11px', color:'var(--muted2)', marginTop:'1px'}}>Digital ID Wallet</div>
            </div>
          </div>

          {/* Role Select */}
          <div className="role-select">
            <button
              className={`role-btn ${role === 'user' ? 'active' : ''}`}
              data-role="user"
              onClick={() => setRole('user')}
            >
              <div style={{fontSize:'20px', marginBottom:'4px'}}>👤</div>
              User / Student
            </button>
            <button
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
              data-role="admin"
              onClick={() => setRole('admin')}
            >
              <div style={{fontSize:'20px', marginBottom:'4px'}}>🛡️</div>
              Admin / Security
            </button>
          </div>

          {/* Login / Register Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => setAuthTab('login')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
              onClick={() => setAuthTab('register')}
            >
              Register
            </button>
          </div>

          {/* Google */}
          <button className="btn-google" onClick={onGoogleLogin}>
            <svg viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <div className="divider">
            <div className="divider-line"></div>
            <span className="divider-text">OR</span>
            <div className="divider-line"></div>
          </div>

          {/* Login Form */}
          {authTab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{marginTop:'8px'}} disabled={loading}>
                {loading ? <span className="loader"></span> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {authTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Arjun Rajan"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Password <span style={{color:'var(--muted)', fontWeight:'400'}}>(min 6 chars — used as your encryption key)</span>
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  required
                  minLength="6"
                />
              </div>
              <div style={{fontSize:'11px', color:'var(--accent3)', marginBottom:'14px', display:'flex', gap:'6px', alignItems:'flex-start'}}>
                <span>🔒</span> Your password encrypts all your data with AES-256. Even admins cannot see your cards or documents.
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <span className="loader"></span> : 'Create Account'}
              </button>
            </form>
          )}

          {authTab === 'login' && (
            <div style={{marginTop:'14px', padding:'12px', background:'var(--card)', borderRadius:'var(--radius-sm)', fontSize:'12px', color:'var(--muted2)', lineHeight:'1.6'}}>
              <strong style={{color:'var(--accent)'}}>Demo accounts:</strong><br/>
              User: demo@vaultid.app / demo1234<br/>
              Admin: admin@vaultid.app / admin123
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPage