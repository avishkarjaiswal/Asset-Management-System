import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Briefcase, Calendar, Laptop, History, User } from 'lucide-react'
import api from '../../services/api'
import { format } from 'date-fns'

function StatusBadge({ status }) {
  const colors = { active: 'success', inactive: 'muted', terminated: 'danger', on_leave: 'warning' }
  return <span className={`badge badge-${colors[status] || 'muted'}`}>{status?.replace('_', ' ')}</span>
}

export default function EmployeeDetail() {
  const { id } = useParams()
  
  const { data: emp, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then(r => r.data),
    retry: false
  })

  const { data: history } = useQuery({
    queryKey: ['employee-history', id],
    queryFn: () => api.get(`/employees/${id}/asset-history`).then(r => r.data),
    enabled: !!emp
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading employee details...</div>
  if (error) return <div style={{ padding: 40, color: 'var(--brand-danger)' }}>Error loading employee.</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/employees" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.25rem' }}>
            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0 }}>{emp.full_name}</h1>
              <StatusBadge status={emp.status} />
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
              {emp.designation || 'Employee'} • ID: {emp.employee_id}
            </p>
          </div>
        </div>
        <Link to={`/employees/${id}/edit`} className="btn btn-secondary"><Edit size={16} /> Edit Profile</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Current Assets */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Laptop size={16} /> Currently Assigned Assets</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Tag</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Allocation Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emp.allocated_assets?.map(alloc => (
                    <tr key={alloc.id}>
                      <td><Link to={`/assets/${alloc.asset.id}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{alloc.asset.asset_tag}</Link></td>
                      <td>{alloc.asset.asset_name}</td>
                      <td>{alloc.asset.category?.name}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{format(new Date(alloc.allocation_date), 'dd MMM yyyy')}</td>
                      <td>
                        <Link to={`/returns/new?allocation=${alloc.id}`} className="btn btn-ghost btn-sm">Return</Link>
                      </td>
                    </tr>
                  ))}
                  {(!emp.allocated_assets || emp.allocated_assets.length === 0) && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No assets currently assigned</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-muted)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <Link to={`/allocations/new?employee=${emp.id}`} className="btn btn-primary btn-sm">Request New Asset</Link>
            </div>
          </div>

          {/* Asset History */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={16} /> Assignment History</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Status</th>
                    <th>From</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.map(hist => (
                    <tr key={hist.id}>
                      <td><Link to={`/assets/${hist.asset?.id}`}>{hist.asset?.asset_tag}</Link></td>
                      <td>
                        <span className={`badge badge-${hist.status === 'active' ? 'success' : 'muted'}`}>{hist.status}</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{format(new Date(hist.allocation_date), 'dd MMM yyyy')}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{hist.return_date ? format(new Date(hist.return_date), 'dd MMM yyyy') : '—'}</td>
                    </tr>
                  ))}
                  {(!history || history.length === 0) && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No historical records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Mail size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Email Address</div>
                  <a href={`mailto:${emp.email}`} style={{ color: 'var(--text-heading)', textDecoration: 'none', fontWeight: 500 }}>{emp.email}</a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Phone size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Phone Number</div>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{emp.phone || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <MapPin size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Location</div>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{emp.location?.name || '—'}</div>
                </div>
              </div>
            </div>

            <h3 style={{ margin: '24px 0 16px', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Employment Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Briefcase size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Department</div>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{emp.department?.name || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Calendar size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Joining Date</div>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{emp.joining_date ? format(new Date(emp.joining_date), 'dd MMM yyyy') : '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
