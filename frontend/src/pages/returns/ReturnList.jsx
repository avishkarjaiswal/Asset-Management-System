import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, RefreshCw, ArrowDownLeft, CheckCircle, Download } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export function ReturnStatusBadge({ status }) {
  const colors = { pending: 'warning', it_verified: 'primary', completed: 'success', rejected: 'danger' }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>{status?.replace('_', ' ')}</span>
}

export default function ReturnList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [exportTimeRange, setExportTimeRange] = useState('lifetime')
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [verifyRemarks, setVerifyRemarks] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['returns', { status, page }],
    queryFn: () => api.get('/returns', { params: { status: status || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, remarks }) => api.post(`/returns/${id}/verify`, { remarks }),
    onSuccess: () => { toast.success('Return verified by IT'); qc.invalidateQueries(['returns']); setShowVerifyModal(false) },
    onError: (e) => toast.error(e.response?.data?.error || 'Verification failed')
  })

  const completeMut = useMutation({
    mutationFn: (id) => api.post(`/returns/${id}/complete`),
    onSuccess: () => { toast.success('Asset return completed'); qc.invalidateQueries(['returns']) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to complete return')
  })

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Exporting CSV...')
    try {
      const response = await api.get(`/returns/export/csv?time_range=${exportTimeRange}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'gppl_returns.csv')
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
          <h1>Asset Returns</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Process assets returned by employees.
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
          <Link to="/returns/new" className="btn btn-primary">
            <Plus size={16} /> Initiate Return
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="it_verified">IT Verified</option>
            <option value="completed">Completed</option>
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
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading returns...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Return #</th>
                <th>Asset</th>
                <th>Returned By</th>
                <th>Condition</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(ret => (
                <tr key={ret.id}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{ret.return_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(ret.created_at), 'dd MMM yyyy')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ret.asset?.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ret.asset?.asset_tag}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ret.employee?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ret.employee?.department?.name}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{ret.condition_on_return}</td>
                  <td><ReturnStatusBadge status={ret.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {ret.status === 'pending' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedReturn(ret); setShowVerifyModal(true) }}>
                        Verify (IT)
                      </button>
                    )}
                    {ret.status === 'it_verified' && (
                      <button className="btn btn-success btn-sm" onClick={() => completeMut.mutate(ret.id)} disabled={completeMut.isLoading}>
                        <CheckCircle size={14} style={{ marginRight: 4 }}/> Finalize
                      </button>
                    )}
                    {ret.status === 'completed' && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Completed</span>}
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><ArrowDownLeft size={28} /></div>
                    <div style={{ fontWeight: 600 }}>No asset returns found</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showVerifyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Verify Asset Return</h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Confirm that you have received <strong>{selectedReturn?.asset?.asset_name}</strong> from <strong>{selectedReturn?.employee?.full_name}</strong>.
            </p>
            <div className="form-group">
              <label>IT Remarks (Optional)</label>
              <textarea className="form-control" rows={3} value={verifyRemarks} onChange={e => setVerifyRemarks(e.target.value)} placeholder="Condition notes, missing accessories, etc."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => verifyMut.mutate({ id: selectedReturn.id, remarks: verifyRemarks })} disabled={verifyMut.isLoading}>
                Submit Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
