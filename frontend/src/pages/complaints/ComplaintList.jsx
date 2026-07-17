import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export function ComplaintStatusBadge({ status }) {
  const colors = { open: 'danger', in_progress: 'warning', resolved: 'success', closed: 'muted' }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>{status?.replace('_', ' ')}</span>
}

export default function ComplaintList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [newComplaint, setNewComplaint] = useState({ asset_id: '', title: '', description: '', priority: 'medium', category: 'hardware' })

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', { status, priority, page }],
    queryFn: () => api.get('/complaints', { params: { status: status || undefined, priority: priority || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  // We need current user's employee_id for the form, or we can just fetch all employees for demo purposes to pick who is complaining.
  const { data: employees } = useQuery({
    queryKey: ['active-employees'],
    queryFn: () => api.get('/employees', { params: { status: 'active', per_page: 500 } }).then(r => r.data.items),
  })

  const { data: assets } = useQuery({
    queryKey: ['assets-allocated'],
    queryFn: () => api.get('/assets', { params: { status: 'allocated', per_page: 500 } }).then(r => r.data.items),
  })

  const createMut = useMutation({
    mutationFn: (data) => api.post('/complaints', data),
    onSuccess: () => { toast.success('Ticket created'); qc.invalidateQueries(['complaints']); setShowModal(false) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create ticket')
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newComplaint.employee_id) {
      toast.error('Please select an employee (Reporting user)')
      return
    }
    createMut.mutate(newComplaint)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>IT Helpdesk Tickets</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Manage employee complaints and asset issues.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className="form-control" style={{ width: 180 }} value={priority} onChange={e => { setPriority(e.target.value); setPage(1) }}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {(status || priority) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(''); setPriority(''); setPage(1) }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading tickets...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Reported By</th>
                <th>Asset</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(ticket => (
                <tr key={ticket.id} onClick={() => window.location.href = `/complaints/${ticket.id}`} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{ticket.complaint_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(ticket.created_at), 'dd MMM, HH:mm')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ticket.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{ticket.category?.replace('_', ' ')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ticket.employee?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.employee?.department?.name}</div>
                  </td>
                  <td>
                    {ticket.asset ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{ticket.asset.asset_tag}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.asset.asset_name}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                      color: ticket.priority === 'critical' ? '#DC2626' : ticket.priority === 'high' ? '#EA580C' : ticket.priority === 'medium' ? '#D97706' : '#4B5563',
                      background: ticket.priority === 'critical' ? '#FEE2E2' : ticket.priority === 'high' ? '#FFEDD5' : ticket.priority === 'medium' ? '#FEF3C7' : '#F3F4F6'
                    }}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td><ComplaintStatusBadge status={ticket.status} /></td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><MessageSquare size={28} /></div>
                    <div style={{ fontWeight: 600 }}>No tickets found</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Raise New Ticket</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Reported By (Employee) *</label>
                <select className="form-control" required value={newComplaint.employee_id} onChange={e => setNewComplaint({...newComplaint, employee_id: e.target.value})}>
                  <option value="">-- Select Employee --</option>
                  {employees?.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Related Asset *</label>
                <select className="form-control" required value={newComplaint.asset_id} onChange={e => setNewComplaint({...newComplaint, asset_id: e.target.value})}>
                  <option value="">-- Select Asset --</option>
                  {assets?.filter(a => newComplaint.employee_id ? a.current_employee_id == newComplaint.employee_id : true).map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_tag})</option>)}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Only showing assets assigned to selected employee if chosen.</span>
              </div>
              <div className="form-group">
                <label>Subject / Issue Title *</label>
                <input className="form-control" required value={newComplaint.title} onChange={e => setNewComplaint({...newComplaint, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea className="form-control" required rows={4} value={newComplaint.description} onChange={e => setNewComplaint({...newComplaint, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Category</label>
                  <input className="form-control" value={newComplaint.category} onChange={e => setNewComplaint({...newComplaint, category: e.target.value})} placeholder="e.g. Hardware Issue" />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-control" value={newComplaint.priority} onChange={e => setNewComplaint({...newComplaint, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isLoading}>Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
