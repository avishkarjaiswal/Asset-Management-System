import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Shield, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [loginMode, setLoginMode] = useState('email') // 'email' | 'employee_id'

  const { register, handleSubmit, formState: { errors }, setError } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const payload = loginMode === 'email'
        ? { email: data.login, password: data.password }
        : { employee_id: data.login, password: data.password }
      await login(payload)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials. Please try again.'
      setError('password', { message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-sidebar)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-30px) rotate(5deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(25px) rotate(-5deg); } }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-bg-blob {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; pointer-events: none;
        }
        .login-card { animation: slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes slideUp { from { opacity:0; transform: translateY(40px); } to { opacity:1; transform: translateY(0); } }
        .login-input-group { position: relative; }
        .login-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .login-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          background: rgba(255,255,255,0.07);
          color: white;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
          outline: none;
          font-family: var(--font-sans);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus { border-color: var(--brand-primary); background: rgba(255,255,255,0.1); box-shadow: 0 0 0 3px rgba(37,99,235,0.2); }
        .login-input.error { border-color: var(--brand-danger); }
        .tab-toggle {
          flex: 1; padding: 8px; border-radius: 8px; border: none; background: transparent;
          color: rgba(255,255,255,0.5); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: var(--font-sans);
        }
        .tab-toggle.active { background: rgba(255,255,255,0.12); color: white; font-weight: 600; }
      `}</style>

      {/* Animated Background Blobs */}
      <div className="login-bg-blob" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)', top: -200, left: -100, animation: 'float 8s ease-in-out infinite' }} />
      <div className="login-bg-blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: -100, right: -50, animation: 'float2 10s ease-in-out infinite' }} />
      <div className="login-bg-blob" style={{ width: 300, height: 300, background: 'radial-gradient(circle, #0EA5E9 0%, transparent 70%)', top: '40%', right: '20%', animation: 'float 12s ease-in-out infinite 2s' }} />

      {/* Left Panel — Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 40px', color: 'white',
      }} className="desktop-only">
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 20, background: 'var(--gradient-primary)', marginBottom: 32, boxShadow: 'var(--shadow-2xl)' }}>
            <Shield size={40} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, marginBottom: 16, fontFamily: 'var(--font-heading)' }}>
            GPPL Asset Management
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: 40 }}>
            Enterprise-grade asset lifecycle management for Ghaziabad Precision Product Private Limited
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Complete Asset Lifecycle Management', 'Multi-step Approval Workflows', 'Real-time Reports & Analytics', 'Role-based Access Control'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-secondary)', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{
        width: '100%', maxWidth: 460,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        background: 'rgba(255,255,255,0.03)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}>
        <div className="login-card" style={{ width: '100%' }}>
          {/* Logo Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-brand)', flexShrink: 0 }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.125rem', fontFamily: 'var(--font-heading)' }}>GPPL EAMS</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Asset Management System</div>
            </div>
          </div>

          <h2 style={{ color: 'white', marginBottom: 6, fontFamily: 'var(--font-heading)', fontSize: '1.625rem' }}>Welcome back</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 28, fontSize: '0.9375rem' }}>Sign in to your account</p>

          {/* Login Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button className={`tab-toggle ${loginMode === 'email' ? 'active' : ''}`} onClick={() => setLoginMode('email')}>
              Email
            </button>
            <button className={`tab-toggle ${loginMode === 'employee_id' ? 'active' : ''}`} onClick={() => setLoginMode('employee_id')}>
              Employee ID
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Login field */}
            <div style={{ marginBottom: 16 }}>
              <div className="login-input-group">
                <Mail size={16} className="login-input-icon" />
                <input
                  {...register('login', { required: loginMode === 'email' ? 'Email is required' : 'Employee ID is required' })}
                  type={loginMode === 'email' ? 'email' : 'text'}
                  placeholder={loginMode === 'email' ? 'admin@gppl.in' : 'GPPL-001'}
                  className={`login-input ${errors.login ? 'error' : ''}`}
                  autoComplete="username"
                />
              </div>
              {errors.login && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {errors.login.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <div className="login-input-group">
                <Lock size={16} className="login-input-icon" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`login-input ${errors.password ? 'error' : ''}`}
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {errors.password.message}</p>}
            </div>

            {/* Remember Me & Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" {...register('remember')} style={{ accentColor: 'var(--brand-primary)' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Remember me</span>
              </label>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10,
                background: 'var(--gradient-primary)',
                color: 'white', border: 'none', fontSize: '0.9375rem',
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: 'var(--shadow-brand)', transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 28, padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: 8 }}>Demo Credentials</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem' }}>
              <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Email:</strong> admin@gppl.in<br />
              <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Password:</strong> Admin@1234
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}
              >
                Sign up
              </button>
            </p>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: 24 }}>
            © 2024 Ghaziabad Precision Product Private Limited
          </p>
        </div>
      </div>
    </div>
  )
}
