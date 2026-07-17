import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Menu, Search, Bell, Sun, Moon, LogOut, Settings,
  User, ChevronDown, X, Loader2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotifications } from '../../contexts/NotificationContext'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

function GlobalSearch() {
  const [query, setQuery]       = useState('')
  const [focused, setFocused]   = useState(false)
  const navigate                = useNavigate()
  const inputRef                = useRef()

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get(`/search?q=${query}`).then(r => r.data),
    enabled: query.length >= 2,
    staleTime: 0,
  })

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const typeColors = {
    asset: '#2563EB', employee: '#10B981', vendor: '#8B5CF6',
    purchase_order: '#F59E0B', complaint: '#EF4444',
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {isFetching
          ? <Loader2 size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
          : <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search assets, employees, vendors... (Ctrl+K)"
          className="form-control"
          style={{ paddingLeft: 38, paddingRight: query ? 36 : 12, fontSize: '0.875rem' }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {focused && query.length >= 2 && data?.results?.length > 0 && (
        <div className="dropdown-menu" style={{ left: 0, right: 0, maxHeight: 400, overflowY: 'auto', minWidth: 'auto' }}>
          {data.results.map((r, i) => (
            <button
              key={i}
              className="dropdown-item"
              onClick={() => { navigate(r.url); setQuery(''); }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: typeColors[r.type] || 'var(--text-muted)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize', flexShrink: 0 }}>
                {r.type.replace('_', ' ')}
              </span>
            </button>
          ))}
          <div className="dropdown-divider" />
          <button className="dropdown-item" onClick={() => { navigate(`/search?q=${query}`); setQuery('') }}>
            <Search size={14} />
            <span>See all results for "<strong>{query}</strong>"</span>
          </button>
        </div>
      )}

      {focused && query.length >= 2 && !isFetching && (!data?.results?.length) && (
        <div className="dropdown-menu" style={{ left: 0, right: 0, minWidth: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No results found for "{query}"
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationActionButtons({ notification, onComplete }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  
  const handleAction = async (action) => {
    setLoading(true)
    try {
      await api.post(`/capital-sanctions/${notification.reference_id}/approve`, { action })
      setStatus(action === 'accept' ? 'accepted' : 'rejected')
      toast.success(action === 'accept' ? 'Approved successfully' : 'Rejected successfully')
      queryClient.invalidateQueries({ queryKey: ['capital-sanctions'] })
      onComplete()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process approval')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'accepted') {
    return <div style={{ fontSize: '0.75rem', color: 'var(--brand-success)', fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Accepted</div>
  }
  if (status === 'rejected') {
    return <div style={{ fontSize: '0.75rem', color: 'var(--brand-danger)', fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>✗ Rejected</div>
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button 
        className="btn" 
        style={{ background: 'var(--brand-success)', color: 'white', padding: '4px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        onClick={(e) => { e.stopPropagation(); handleAction('accept'); }}
        disabled={loading}
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button 
        className="btn" 
        style={{ background: 'var(--brand-danger)', color: 'white', padding: '4px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        onClick={(e) => { e.stopPropagation(); handleAction('reject'); }}
        disabled={loading}
      >
        {loading ? '...' : 'Reject'}
      </button>
    </div>
  )
}

function NotificationPanel({ onClose }) {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.get('/notifications?per_page=20').then(r => r.data),
  })
  const { markRead } = useNotifications()
  const queryClient = useQueryClient()

  const handleNotifClick = async (n) => {
    // Mark as read
    await markRead([n.id])
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    onClose()
    // Navigate if there's an action URL
    if (n.action_url) {
      navigate(n.action_url)
    }
  }

  const typeColor = {
    approval: 'var(--brand-primary)',
    success:  'var(--brand-success)',
    warning:  '#F59E0B',
    error:    'var(--brand-danger)',
    info:     'var(--text-muted)',
  }

  return (
    <div className="dropdown-menu" style={{ right: 0, width: 380, maxHeight: 480, overflowY: 'auto' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</span>
        {data?.unread_count > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            await markRead()
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          }} style={{ fontSize: '0.75rem' }}>Mark all read</button>
        )}
      </div>
      {(!data?.items || data.items.length === 0) && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No notifications</div>
      )}
      {data?.items?.map(n => (
        <div
          key={n.id}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: n.is_read ? 'transparent' : 'var(--bg-active)',
            cursor: n.action_url ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
          onClick={() => handleNotifClick(n)}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
              background: n.is_read ? 'var(--border-subtle)' : (typeColor[n.type] || 'var(--brand-primary)'),
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.875rem' }}>{n.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
                {n.action_url && !n.is_read && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                    View →
                  </span>
                )}
              </div>
              {n.type === 'approval' && n.module === 'capital_sanction' && !n.is_read && (
                <NotificationActionButtons 
                  notification={n} 
                  onComplete={() => {
                    markRead([n.id])
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


export default function Header({ onToggleSidebar, onOpenMobileSidebar }) {
  const { user, logout } = useAuth()
  const { toggle, isDark } = useTheme()
  const { unreadCount } = useNotifications()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header style={{
      position: 'fixed',
      top: 0, right: 0, left: 'var(--sidebar-width)',
      height: 'var(--header-height)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 20px',
      zIndex: 200,
      boxShadow: 'var(--shadow-sm)',
      transition: 'left 0.3s ease',
    }}>
      <style>{`
        :root { --z-sticky: 200; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .header-btn {
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
        }
        .header-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      `}</style>

      {/* Sidebar toggle */}
      <button className="header-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
        <Menu size={20} />
      </button>

      {/* Global Search */}
      <GlobalSearch />

      <div style={{ flex: 1 }} />

      {/* Theme Toggle */}
      <button className="header-btn" onClick={toggle} title={isDark ? 'Light Mode' : 'Dark Mode'}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <div className="dropdown">
        <button className="header-btn" onClick={() => { setNotifPanelOpen(o => !o); setUserMenuOpen(false); }}>
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              background: 'var(--brand-danger)', color: 'white',
              borderRadius: '50%', width: 16, height: 16,
              fontSize: '0.6rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-surface)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {notifPanelOpen && (
          <NotificationPanel onClose={() => setNotifPanelOpen(false)} />
        )}
      </div>

      {/* User Menu */}
      <div className="dropdown">
        <button
          onClick={() => { setUserMenuOpen(o => !o); setNotifPanelOpen(false); }}
          className="header-btn"
          style={{ width: 'auto', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, cursor: 'pointer', border: 'none' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'white',
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{user?.first_name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.role?.display_name}</div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </button>

        {userMenuOpen && (
          <div className="dropdown-menu">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700 }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <button className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
              <Settings size={15} /> Profile & Settings
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={logout}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
