import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Package, Users, ArrowRightLeft, ArrowLeftRight,
  Wrench, MessageSquare, Truck, ShoppingCart, BarChart2, ClipboardList,
  Settings, Building2, Shield, ChevronRight, Layers, FileText, UserCheck
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',   path: '/dashboard',  icon: LayoutDashboard, roles: null },
  { label: 'Inbox',       path: '/inbox',      icon: MessageSquare, roles: ['approval_member'] },
  { label: 'Approvals Notification', path: '/admin/pending-approvals', icon: Users, roles: ['super_admin'] },
  { label: 'Assets',      path: '/assets',     icon: Package, roles: null },
  { label: 'Employees',   path: '/employees',  icon: Users, roles: null },
  { label: 'Departments', path: '/departments', icon: Building2, roles: null },
  { label: 'Allocations', path: '/allocations', icon: ArrowRightLeft, roles: null },
  { label: 'Returns',     path: '/returns',     icon: ArrowLeftRight, roles: null },
  { label: 'Transfers',   path: '/transfers',   icon: ArrowRightLeft, roles: null },
  { label: 'Maintenance',  path: '/maintenance', icon: Wrench, roles: null },
  { label: 'Complaints',   path: '/complaints',  icon: MessageSquare, roles: null },
  { label: 'Vendors',      path: '/vendors',     icon: Truck, roles: null },
  { label: 'Purchases',    path: '/purchases',   icon: ShoppingCart, roles: null },
  { label: 'Capital Sanctions', path: '/capital-sanctions', icon: FileText, roles: null },
  { label: 'Approval Members',  path: '/approval-members',  icon: UserCheck, roles: null },
  { label: 'Reports',      path: '/reports',     icon: BarChart2, roles: null },
  { label: 'Audit Logs',   path: '/audit',       icon: ClipboardList, roles: ['super_admin','it_admin','auditor'] },
  { label: 'Settings',     path: '/settings',    icon: Settings, roles: ['super_admin','it_admin'] },
]

function NavItem({ item, collapsed, depth = 0, pendingCount = 0 }) {
  const [open, setOpen] = React.useState(false)
  const { pathname } = useLocation()

  if (item.children) {
    const isActive = item.children.some(c => pathname.startsWith(c.path.split('?')[0]))
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="sidebar-link"
          style={{
            paddingLeft: depth > 0 ? '32px' : undefined,
            background: isActive ? 'rgba(37,99,235,0.12)' : 'transparent',
            color: isActive ? 'var(--brand-secondary)' : undefined,
          }}
          title={collapsed ? item.label : undefined}
        >
          <item.icon size={18} />
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>{item.label}</span>
              <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div style={{ paddingLeft: 8 }}>
            {item.children.map(c => <NavItem key={c.path} item={c} collapsed={collapsed} depth={depth + 1} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/assets' || item.path === '/allocations' || item.path === '/returns' || item.path === '/transfers'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: depth > 0 && !collapsed ? '32px' : undefined }}
    >
      <item.icon size={18} />
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
      {!collapsed && item.path === '/admin/pending-approvals' && pendingCount > 0 && (
        <span style={{
          background: 'var(--brand-danger)',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          marginLeft: 'auto'
        }}>
          {pendingCount}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, mobileOpen, onClose }) {
  const { user } = useAuth()
  const roleName = user?.role?.name
  const [pendingCount, setPendingCount] = React.useState(0)

  React.useEffect(() => {
    if (roleName === 'super_admin') {
      import('../../services/api').then(({ default: api }) => {
        const fetchCount = () => {
          api.get('/admin/pending-users')
            .then(res => setPendingCount(res.data.users?.length || 0))
            .catch(() => {})
        }
        fetchCount()
        const interval = setInterval(fetchCount, 30000)
        return () => clearInterval(interval)
      })
    }
  }, [roleName])

  const visibleItems = NAV_ITEMS.filter(item => {
    if (roleName === 'approval_member') {
      return item.path === '/inbox';
    }
    return !item.roles || item.roles.includes(roleName);
  })

  return (
    <aside
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 240,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 20px',
        gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: 'var(--shadow-brand)',
        }}>
          <Shield size={20} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9375rem', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>GPPL</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Asset Management</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <style>{`
          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            color: rgba(255,255,255,0.55);
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.15s ease;
            width: 100%;
            border: none;
            background: transparent;
            cursor: pointer;
            white-space: nowrap;
            margin-bottom: 2px;
          }
          .sidebar-link:hover {
            background: rgba(255,255,255,0.07);
            color: rgba(255,255,255,0.9);
          }
          .sidebar-link.active {
            background: var(--gradient-primary);
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
          }
          .sidebar-section {
            font-size: 0.65rem;
            font-weight: 700;
            color: rgba(255,255,255,0.25);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            padding: 12px 12px 4px;
          }
        `}</style>
        {visibleItems.map(item => (
          <NavItem key={item.label} item={item} collapsed={collapsed} pendingCount={pendingCount} />
        ))}
      </nav>

      {/* User info at bottom */}
      {!collapsed && user && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.role?.display_name}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
