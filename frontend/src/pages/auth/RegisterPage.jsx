import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Shield, Lock, Mail, Loader2, AlertCircle, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate   = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const { register, handleSubmit, formState: { errors }, setError } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await registerUser({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password
      })
      toast.success('Registration successful! Waiting for admin approval.')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.'
      setError('root.serverError', { message: msg })
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
            Join GPPL EAMS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: 40 }}>
            Create an administrator account to manage assets, allocations, and system settings.
          </p>
        </div>
      </div>

      {/* Right Panel — Register Form */}
      <div style={{
        width: '100%', maxWidth: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        background: 'rgba(255,255,255,0.03)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}>
        <div className="login-card" style={{ width: '100%' }}>
          {/* Logo Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }} className="mobile-only">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-brand)', flexShrink: 0 }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.125rem', fontFamily: 'var(--font-heading)' }}>GPPL EAMS</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Asset Management System</div>
            </div>
          </div>

          <h2 style={{ color: 'white', marginBottom: 6, fontFamily: 'var(--font-heading)', fontSize: '1.625rem' }}>Create Account</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 28, fontSize: '0.9375rem' }}>Sign up as an administrator</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* First Name & Last Name */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="login-input-group">
                  <UserIcon size={16} className="login-input-icon" />
                  <input
                    {...register('first_name', { required: 'First name is required' })}
                    type="text"
                    placeholder="First Name"
                    className={`login-input ${errors.first_name ? 'error' : ''}`}
                  />
                </div>
                {errors.first_name && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.first_name.message}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <div className="login-input-group">
                  <UserIcon size={16} className="login-input-icon" />
                  <input
                    {...register('last_name', { required: 'Last name is required' })}
                    type="text"
                    placeholder="Last Name"
                    className={`login-input ${errors.last_name ? 'error' : ''}`}
                  />
                </div>
                {errors.last_name && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.last_name.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <div className="login-input-group">
                <Mail size={16} className="login-input-icon" />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="Email Address"
                  className={`login-input ${errors.email ? 'error' : ''}`}
                />
              </div>
              {errors.email && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <div className="login-input-group">
                <Lock size={16} className="login-input-icon" />
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a password"
                  className={`login-input ${errors.password ? 'error' : ''}`}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            {errors.root?.serverError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="var(--brand-danger)" />
                <span style={{ color: 'var(--brand-danger)', fontSize: '0.875rem' }}>{errors.root.serverError.message}</span>
              </div>
            )}

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
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account...</> : 'Sign Up'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', color: 'var(--brand-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}
              >
                Sign in
              </button>
            </p>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: 32 }}>
            © 2024 Ghaziabad Precision Product Private Limited
          </p>
        </div>
      </div>
    </div>
  )
}
