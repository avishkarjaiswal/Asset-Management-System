import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ShieldAlert, Activity, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'

export default function AuditLogs() {
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { moduleFilter, actionFilter, page }],
    queryFn: () => api.get('/audit', { params: { module: moduleFilter || undefined, action: actionFilter || undefined, page, per_page: 30 } }).then(r => r.data),
    keepPreviousData: true,
  })

  if (error && error.response?.status === 403) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--brand-danger)" style={{ marginBottom: 16 }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view audit logs. This area is restricted to IT Admins and Auditors.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>System Audit Logs</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Immutable record of all system activities and modifications.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 180 }} value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1) }}>
            <option value="">All Modules</option>
            <option value="assets">Assets</option>
            <option value="employees">Employees</option>
            <option value="allocations">Allocations</option>
            <option value="returns">Returns</option>
            <option value="transfers">Transfers</option>
            <option value="maintenance">Maintenance</option>
            <option value="vendors">Vendors</option>
            <option value="auth">Authentication</option>
          </select>
          <select className="form-control" style={{ width: 180 }} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}>
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="allocate">Allocate</option>
            <option value="return">Return</option>
            <option value="login">Login</option>
          </select>
          {(moduleFilter || actionFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setModuleFilter(''); setActionFilter(''); setPage(1) }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit logs...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <div style={{ fontWeight: 500 }}>{format(new Date(log.created_at), 'dd MMM yyyy')}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                    </td>
                    <td>
                      {log.user ? (
                        <div style={{ fontSize: '0.8125rem' }}>
                          <div style={{ fontWeight: 500 }}>{log.user.full_name}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{log.user.email}</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>System</span>}
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>{log.module}</td>
                    <td>
                      <span className={`badge badge-${log.action === 'create' ? 'success' : log.action === 'delete' ? 'danger' : log.action === 'update' ? 'warning' : 'primary'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{log.description}</td>
                    <td style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{log.ip_address || '—'}</td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Activity size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No logs found</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
            
            {data?.pages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                  Page {page} of {data.pages}
                </span>
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
