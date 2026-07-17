import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Wrench, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

function MaintenanceStatusBadge({ status }) {
  const colors = { open: 'warning', in_progress: 'primary', completed: 'success', cancelled: 'muted' }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>{status?.replace('_', ' ')}</span>
}

export default function MaintenanceList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  
  // For new record
  const [newRecord, setNewRecord] = useState({ asset_id: '', problem_description: '', scheduled_date: '', maintenance_type: 'repair' })

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', { status, page }],
    queryFn: () => api.get('/maintenance', { params: { status: status || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets-for-maintenance'],
    queryFn: () => api.get('/assets', { params: { per_page: 500 } }).then(r => r.data.items),
  })

  const createMut = useMutation({
    mutationFn: (data) => api.post('/maintenance', data),
    onSuccess: () => { toast.success('Maintenance scheduled'); qc.invalidateQueries(['maintenance']); setShowModal(false) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to schedule')
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/maintenance/${id}`, data),
    onSuccess: () => { toast.success('Maintenance updated'); qc.invalidateQueries(['maintenance']); setSelectedRecord(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update')
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate(newRecord)
  }

  const handleComplete = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateMut.mutate({
      id: selectedRecord.id,
      data: {
        status: 'completed',
        work_done: formData.get('work_done'),
        cost: parseFloat(formData.get('cost') || 0),
        completion_date: formData.get('completion_date'),
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Maintenance & Servicing</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Track repairs, AMCs, and scheduled maintenance for all assets.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setNewRecord({ asset_id: '', problem_description: '', scheduled_date: '', maintenance_type: 'repair' }); setShowModal(true) }}>
          <Plus size={16} /> Schedule Maintenance
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 220 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="open">Open / Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading maintenance records...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Record #</th>
                <th>Asset</th>
                <th>Type</th>
                <th>Description</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(record => (
                <tr key={record.id}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{record.maintenance_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(record.created_at), 'dd MMM yyyy')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{record.asset?.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{record.asset?.asset_tag}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{record.maintenance_type}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    <div style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.problem_description}>
                      {record.problem_description}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {record.scheduled_date ? format(new Date(record.scheduled_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td><MaintenanceStatusBadge status={record.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {record.status !== 'completed' && record.status !== 'cancelled' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedRecord(record)}>
                        <CheckCircle size={14} style={{ marginRight: 4 }}/> Mark Complete
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Wrench size={28} /></div>
                    <div style={{ fontWeight: 600 }}>No maintenance records found</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Schedule Maintenance</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Select Asset *</label>
                <select className="form-control" required value={newRecord.asset_id} onChange={e => setNewRecord({...newRecord, asset_id: e.target.value})}>
                  <option value="">-- Choose Asset --</option>
                  {assets?.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_tag})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Maintenance Type</label>
                <select className="form-control" value={newRecord.maintenance_type} onChange={e => setNewRecord({...newRecord, maintenance_type: e.target.value})}>
                  <option value="repair">Corrective Repair</option>
                  <option value="preventive">Preventive Maintenance (AMC)</option>
                  <option value="inspection">Inspection / Audit</option>
                </select>
              </div>
              <div className="form-group">
                <label>Problem / Task Description *</label>
                <textarea className="form-control" required rows={3} value={newRecord.problem_description} onChange={e => setNewRecord({...newRecord, problem_description: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label>Scheduled Date</label>
                <input type="date" className="form-control" value={newRecord.scheduled_date} onChange={e => setNewRecord({...newRecord, scheduled_date: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isLoading}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Complete Maintenance</h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Asset: <strong>{selectedRecord.asset?.asset_name}</strong>
            </p>
            <form onSubmit={handleComplete} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Work Done *</label>
                <textarea className="form-control" name="work_done" required rows={3} placeholder="Describe the repairs or service performed..."></textarea>
              </div>
              <div className="form-group">
                <label>Total Cost (₹)</label>
                <input type="number" step="0.01" className="form-control" name="cost" defaultValue={0} />
              </div>
              <div className="form-group">
                <label>Completion Date *</label>
                <input type="date" className="form-control" name="completion_date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedRecord(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={updateMut.isLoading}>Mark as Completed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
