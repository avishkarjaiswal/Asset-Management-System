import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Eye, Filter, RefreshCw, ArrowRightLeft, Download } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export function AllocationStatusBadge({ status }) {
  const colors = {
    pending: 'warning', manager_approved: 'info', it_approved: 'primary',
    allocated: 'accent', acknowledged: 'success', rejected: 'danger', returned: 'muted'
  }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>
    {status?.replace('_', ' ')}
  </span>
}

export default function AllocationList() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [exportTimeRange, setExportTimeRange] = useState('lifetime')

  const { data, isLoading } = useQuery({
    queryKey: ['allocations', { status, page }],
    queryFn: () => api.get('/allocations', { params: { status: status || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Exporting CSV...')
    try {
      const response = await api.get(`/allocations/export/csv?time_range=${exportTimeRange}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'gppl_allocations.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export successful', { id: loadingToast })
    } catch (err) {
      toast.error('Export failed', { id: loadingToast })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Asset Allocations</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {data?.total ? `${data.total.toLocaleString()} allocations` : 'Manage asset assignment workflows'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-control" style={{ width: 140, padding: '4px 8px', height: 36 }} value={exportTimeRange} onChange={e => setExportTimeRange(e.target.value)}>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 365 Days</option>
            <option value="lifetime">Lifetime</option>
          </select>
          <button onClick={handleExportCSV} className="btn btn-ghost">
            <Download size={16} /> Export CSV
          </button>
          <Link to="/allocations/new" className="btn btn-primary">
            <Plus size={16} /> New Request
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 220 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="allocated">Allocated / Active</option>
            <option value="rejected">Rejected</option>
            <option value="returned">Returned</option>
          </select>
          {status && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(''); setPage(1) }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading allocations...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(alloc => (
                  <tr key={alloc.id}>
                    <td>
                      <Link to={`/allocations/${alloc.id}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-heading)', textDecoration: 'none' }}>
                        {alloc.allocation_number}
                      </Link>
                      {alloc.allocation_date && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Allocated: {format(new Date(alloc.allocation_date), 'dd MMM yyyy')}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{format(new Date(alloc.created_at), 'dd MMM yyyy')}</td>
                    <td>
                      {alloc.asset ? (
                        <>
                          <Link to={`/assets/${alloc.asset.id}`} style={{ fontWeight: 500, color: 'var(--text-heading)', textDecoration: 'none' }}>{alloc.asset.asset_name}</Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alloc.asset.asset_tag}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      {alloc.employee ? (
                        <>
                          <Link to={`/employees/${alloc.employee.id}`} style={{ fontWeight: 500, color: 'var(--text-heading)', textDecoration: 'none' }}>{alloc.employee.full_name}</Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alloc.employee.department?.name}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td><AllocationStatusBadge status={alloc.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Link to={`/allocations/${alloc.id}`} className="btn btn-ghost btn-icon btn-sm" title="View Details"><Eye size={15} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><ArrowRightLeft size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No allocations found</div>
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
