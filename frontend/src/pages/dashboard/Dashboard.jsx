import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Package, Users, CheckCircle2, Wrench, AlertTriangle,
  TrendingUp, Clock, Building2, Truck, DollarSign,
  ArrowRight, Activity, ShieldAlert, Calendar, Plus, Clock3
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS = {
  available: '#10B981', allocated: '#2563EB', in_maintenance: '#F59E0B',
  lost: '#EF4444', scrapped: '#8B5CF6', reserved: '#06B6D4', disposed: '#94A3B8',
}

function StatCard({ label, value, icon: Icon, color, sublabel, to, onClick }) {
  const card = (
    <div className={`stat-card ${color || ''}`} style={{ cursor: to || onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className="stat-label">{label}</div>
          {sublabel && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sublabel}</div>}
        </div>
        <div className="stat-icon" style={{
          background: color === 'success' ? '#ECFDF5' : color === 'warning' ? '#FFFBEB' : color === 'danger' ? '#FEF2F2' : color === 'accent' ? '#F5F3FF' : 'var(--bg-active)',
          color: color === 'success' ? '#10B981' : color === 'warning' ? '#F59E0B' : color === 'danger' ? '#EF4444' : color === 'accent' ? '#8B5CF6' : 'var(--brand-primary)',
        }}>
          <Icon size={22} />
        </div>
      </div>
      {to && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
          View all <ArrowRight size={14} />
        </div>
      )}
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card
}

function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '80%' }} />
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  })

  const { data: statusDist } = useQuery({
    queryKey: ['chart-status'],
    queryFn: () => api.get('/dashboard/charts/status-distribution').then(r => r.data),
  })

  const { data: deptAssets } = useQuery({
    queryKey: ['chart-dept'],
    queryFn: () => api.get('/dashboard/charts/department-assets').then(r => r.data),
  })

  const { data: monthlyPurchases } = useQuery({
    queryKey: ['chart-monthly'],
    queryFn: () => api.get('/dashboard/charts/monthly-purchases').then(r => r.data),
  })

  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => api.get('/dashboard/recent-activities').then(r => r.data),
  })

  const { data: upcomingWarranty } = useQuery({
    queryKey: ['upcoming-warranty'],
    queryFn: () => api.get('/dashboard/upcoming-warranty').then(r => r.data),
  })

  const { data: overdueReturns } = useQuery({
    queryKey: ['overdue-returns'],
    queryFn: () => api.get('/dashboard/overdue-returns').then(r => r.data),
  })

  const monthlyData = (monthlyPurchases || []).map(d => ({
    month: MONTHS[d.month - 1],
    count: d.count,
    cost: Math.round(d.cost / 1000),
  }))

  const eventColors = {
    created: '#2563EB', allocated: '#10B981', returned: '#8B5CF6',
    transferred: '#F59E0B', maintenance: '#F97316', repaired: '#10B981',
    updated: '#64748B',
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', marginBottom: 4 }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.first_name} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")} — Here's what's happening today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} /> New Asset
          </Link>
          <Link to="/allocations/new" className="btn btn-secondary">
            <Plus size={16} /> New Allocation
          </Link>
        </div>
      </div>

      {/* ── Top Overdue Banner ── */}
      {stats?.overdue_returns > 0 && (
        <div 
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, cursor: 'pointer' }} 
          onClick={() => document.getElementById('overdue-returns-section')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <AlertTriangle size={20} style={{ color: '#EF4444' }} />
          <div style={{ color: '#991B1B', fontWeight: 500 }}>
            {stats.overdue_returns} {stats.overdue_returns === 1 ? 'asset is' : 'assets are'} currently overdue for return. Click here to view them.
          </div>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {statsLoading ? (
          Array(8).fill(0).map((_, i) => <SkeletonStatCard key={i} />)
        ) : stats ? (<>
          <StatCard label="Total Assets"      value={stats.total_assets}      icon={Package}      to="/assets" />
          <StatCard label="Available"         value={stats.available}         icon={CheckCircle2} color="success" to="/assets?status=available" />
          <StatCard label="Allocated"         value={stats.allocated}         icon={Users}        to="/assets?status=allocated" />
          <StatCard label="In Maintenance"    value={stats.in_maintenance}    icon={Wrench}       color="warning" to="/maintenance" />
          <StatCard label="Warranty Expiring" value={stats.warranty_expiring} icon={AlertTriangle} color="warning" sublabel="Next 30 days" to="/assets" />
          <StatCard label="Pending Requests"  value={stats.pending_requests}  icon={Clock}        color={stats.pending_requests > 0 ? 'danger' : ''} to="/allocations?status=pending" />
          <StatCard label="Total Employees"   value={stats.total_employees}   icon={Users}        to="/employees" />
          <StatCard label="Open Complaints"   value={stats.open_complaints}   icon={ShieldAlert}  color={stats.open_complaints > 0 ? 'danger' : ''} to="/complaints" />
          <StatCard 
            label="Overdue Returns"   
            value={stats.overdue_returns}   
            icon={Clock3}       
            color={stats.overdue_returns > 0 ? 'danger' : ''} 
            onClick={() => document.getElementById('overdue-returns-section')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <StatCard label="Asset Utilization" value={`${stats.asset_utilization}%`} icon={TrendingUp} color={stats.asset_utilization > 80 ? 'success' : ''} />
          <StatCard label="Total Asset Value" value={`₹${(stats.total_purchase_cost/100000).toFixed(1)}L`} icon={DollarSign} sublabel="Purchase cost" />
        </>) : null}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid-cols-3" style={{ marginBottom: 24 }}>
        {/* Asset Status Donut */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Asset Status</div>
              <div className="card-subtitle">Distribution by status</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {(statusDist || []).map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94A3B8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend formatter={(v) => v.replace('_', ' ')} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Assets Bar Chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Assets by Department</div>
              <div className="card-subtitle">Top departments by asset count</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptAssets || []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} />
              <Bar dataKey="count" name="Assets" fill="url(#primaryGrad)" radius={[4,4,0,0]} />
              <defs>
                <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Monthly Purchases Area Chart ── */}
      {monthlyData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Purchases</div>
              <div className="card-subtitle">Asset purchases over the last 12 months (cost in ₹ thousands)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} />
              <Area type="monotone" dataKey="cost" name="Cost (₹K)" stroke="#2563EB" strokeWidth={2.5} fill="url(#costGrad)" dot={{ fill: '#2563EB', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Bottom Row: Activity Feed + Warranty Expiry + Overdue Returns ── */}
      <div className="grid-cols-3">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest asset events</div>
            </div>
            <Activity size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {(recentActivities || []).slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: i < 7 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: `${eventColors[a.event_type] || '#64748B'}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Activity size={14} style={{ color: eventColors[a.event_type] || '#64748B' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.description}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} />
                    {a.event_date ? format(new Date(a.event_date), 'dd MMM yyyy, HH:mm') : ''}
                  </p>
                </div>
                <span className={`badge badge-${a.event_type === 'allocated' ? 'primary' : a.event_type === 'returned' ? 'accent' : a.event_type === 'maintenance' ? 'warning' : 'muted'}`} style={{ flexShrink: 0 }}>
                  {a.event_type}
                </span>
              </div>
            ))}
            {!recentActivities?.length && (
              <div className="empty-state" style={{ padding: 40 }}>
                <Activity size={32} style={{ color: 'var(--text-muted)' }} />
                <p style={{ margin: 0 }}>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Warranty Expiry */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Warranty Expiring Soon</div>
              <div className="card-subtitle">Next 60 days</div>
            </div>
            <AlertTriangle size={18} style={{ color: 'var(--brand-warning)' }} />
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {(upcomingWarranty || []).map((a, i) => (
              <Link to={`/assets/${a.id}`} key={i} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', transition: 'all 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.paddingLeft = '8px'}
                  onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={16} style={{ color: '#F59E0B' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.brand} • {a.department}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F59E0B' }}>
                      {format(new Date(a.warranty_end), 'dd MMM')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(a.warranty_end), 'yyyy')}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!upcomingWarranty?.length && (
              <div className="empty-state" style={{ padding: 40 }}>
                <CheckCircle2 size={32} style={{ color: '#10B981' }} />
                <p style={{ margin: 0, color: '#10B981', fontWeight: 600 }}>No warranties expiring soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Overdue Returns */}
        <div className="card" id="overdue-returns-section">
          <div className="card-header">
            <div>
              <div className="card-title">Overdue Returns</div>
              <div className="card-subtitle">Pending submissions</div>
            </div>
            <Clock3 size={18} style={{ color: 'var(--brand-danger)' }} />
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {(overdueReturns || []).map((a, i) => (
              <Link to={`/allocations/${a.id}`} key={i} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', transition: 'all 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.paddingLeft = '8px'}
                  onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.employee_name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>
                      {format(new Date(a.expected_return_date), 'dd MMM')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(a.expected_return_date), 'yyyy')}</div>
                  </div>
                </div>
              </Link>
            ))}
            {!overdueReturns?.length && (
              <div className="empty-state" style={{ padding: 40 }}>
                <CheckCircle2 size={32} style={{ color: '#10B981' }} />
                <p style={{ margin: 0, color: '#10B981', fontWeight: 600 }}>No overdue returns!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
