import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, CheckCircle, XCircle, Info, Star } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { ComplaintStatusBadge } from './ComplaintList'

export default function ComplaintDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: (data) => api.post(`/complaints/${id}/update`, data),
    onSuccess: () => { 
      toast.success('Ticket updated')
      qc.invalidateQueries(['complaint', id])
      setMessage('')
      setNewStatus('')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update ticket')
  })

  const handleUpdate = (e) => {
    e.preventDefault()
    if (!message && !newStatus) return
    updateMut.mutate({ message, status: newStatus || ticket.status, is_internal: isInternal })
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading ticket...</div>
  if (!ticket) return <div style={{ padding: 40 }}>Ticket not found</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/complaints" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0 }}>{ticket.title}</h1>
            <ComplaintStatusBadge status={ticket.status} />
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Ticket {ticket.complaint_number} • Reported on {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        
        {/* Left Column - Chat / Updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Description</h3>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-heading)' }}>{ticket.description}</div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Updates & Activity</h3>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ticket.updates?.map(update => (
                <div key={update.id} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: update.is_internal ? '#FEF3C7' : 'var(--brand-primary)', color: update.is_internal ? '#92400E' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 }}>
                    {update.updated_by ? update.updated_by.first_name?.charAt(0) : 'S'}
                  </div>
                  <div style={{ flex: 1, background: update.is_internal ? '#FFFBEB' : 'var(--bg-muted)', padding: 16, borderRadius: 8, border: update.is_internal ? '1px solid #FDE68A' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{update.updated_by ? update.updated_by.full_name : 'System'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(update.created_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                    {update.status_from !== update.status_to && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                        Changed status from <strong>{update.status_from}</strong> to <strong>{update.status_to}</strong>
                      </div>
                    )}
                    {update.message && <div style={{ whiteSpace: 'pre-wrap' }}>{update.message}</div>}
                    {update.is_internal && <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>Internal Note (Not visible to employee)</div>}
                  </div>
                </div>
              ))}
              {!ticket.updates?.length && <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No updates yet.</div>}
            </div>
            
            {ticket.status !== 'closed' && (
              <div style={{ padding: 24, borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <textarea className="form-control" rows={3} placeholder="Type your reply or note here..." value={message} onChange={e => setMessage(e.target.value)}></textarea>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                        Internal Note
                      </label>
                      <select className="form-control" style={{ width: 180, padding: '6px 12px' }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        <option value="">Keep current status ({ticket.status})</option>
                        {ticket.status !== 'open' && <option value="open">Re-open</option>}
                        {ticket.status !== 'in_progress' && <option value="in_progress">Mark In Progress</option>}
                        {ticket.status !== 'resolved' && <option value="resolved">Mark Resolved</option>}
                        {ticket.status !== 'closed' && <option value="closed">Close Ticket</option>}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={updateMut.isLoading || (!message && !newStatus)}>
                      <Send size={16} /> Post Update
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Meta Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Ticket Info</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reported By</div>
                <div style={{ fontWeight: 500 }}>{ticket.employee?.full_name}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Related Asset</div>
                {ticket.asset ? (
                  <div>
                    <Link to={`/assets/${ticket.asset.id}`} style={{ fontWeight: 500 }}>{ticket.asset.asset_tag}</Link>
                    <div style={{ fontSize: '0.8125rem' }}>{ticket.asset.asset_name}</div>
                  </div>
                ) : '—'}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</div>
                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{ticket.category?.replace('_', ' ') || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</div>
                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{ticket.priority}</div>
              </div>
            </div>
          </div>

          {ticket.rating && (
            <div className="card" style={{ padding: 24, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', color: '#92400E' }}>Employee Feedback</h3>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={18} fill={star <= ticket.rating ? '#D97706' : 'none'} color={star <= ticket.rating ? '#D97706' : '#D1D5DB'} />
                ))}
              </div>
              <div style={{ color: '#78350F', fontSize: '0.875rem', fontStyle: 'italic' }}>
                "{ticket.feedback || 'No written feedback provided.'}"
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
