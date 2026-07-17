import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, ArrowRightLeft, Download } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export function TransferStatusBadge({ status }) {
  const colors = { pending: 'warning', completed: 'success', rejected: 'danger' }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>{status}</span>
}

export default function TransferList() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [exportTimeRange, setExportTimeRange] = useState('lifetime')

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', { page }],
    queryFn: () => api.get('/transfers', { params: { page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const completeMut = useMutation({
    mutationFn: (id) => api.post(`/transfers/${id}/complete`),
    onSuccess: () => { toast.success('Transfer approved & completed'); qc.invalidateQueries(['transfers']) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to complete')
  })

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Exporting CSV...')
    try {
      const response = await api.get(`/transfers/export/csv?time_range=${exportTimeRange}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'gppl_transfers.csv')
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
          <h1>Asset Transfers</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Track assets moving between employees, departments, or locations.
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
          <Link to="/transfers/new" className="btn btn-primary">
            <Plus size={16} /> Initiate Transfer
          </Link>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading transfers...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Transfer #</th>
                <th>Asset</th>
                <th>Transfer Details</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.transfer_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(t.created_at), 'dd MMM yyyy')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.asset?.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.asset?.asset_tag}</div>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--brand-danger)' }}>From:</span> {t.from_employee ? t.from_employee.full_name : t.from_department?.name || 'Store'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ color: 'var(--brand-success)' }}>To:</span> {t.to_employee ? t.to_employee.full_name : t.to_department?.name || 'Store'}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{t.transfer_type}</td>
                  <td><TransferStatusBadge status={t.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {t.status === 'pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => completeMut.mutate(t.id)} disabled={completeMut.isLoading}>
                        <CheckCircle size={14} style={{ marginRight: 4 }}/> Approve & Execute
                      </button>
                    )}
                    {t.status === 'completed' && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Executed</span>}
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><ArrowRightLeft size={28} /></div>
                    <div style={{ fontWeight: 600 }}>No transfers found</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
