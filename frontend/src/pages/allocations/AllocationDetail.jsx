import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Package, ArrowRight, User, History, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { format, isBefore, startOfDay } from 'date-fns'
import { AllocationStatusBadge } from './AllocationList'

export default function AllocationDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [comment, setComment] = useState('')

  const { data: alloc, isLoading } = useQuery({
    queryKey: ['allocation', id],
    queryFn: () => api.get(`/allocations/${id}`).then(r => r.data),
    retry: false
  })

  // Action mutations
  const approveMut = useMutation({
    mutationFn: (level) => api.post(`/allocations/${id}/approve`, { level, comments: comment }),
    onSuccess: () => { toast.success('Approved'); qc.invalidateQueries(['allocation', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Approval failed')
  })

  const rejectMut = useMutation({
    mutationFn: () => api.post(`/allocations/${id}/reject`, { comments: comment }),
    onSuccess: () => { toast.success('Rejected'); qc.invalidateQueries(['allocation', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Rejection failed')
  })

  const allocateMut = useMutation({
    mutationFn: () => api.post(`/allocations/${id}/allocate`, { condition: 'good' }),
    onSuccess: () => { toast.success('Asset allocated'); qc.invalidateQueries(['allocation', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Allocation failed')
  })

  const acknowledgeMut = useMutation({
    mutationFn: () => api.post(`/allocations/${id}/acknowledge`, { signature: 'Accepted digitally' }),
    onSuccess: () => { toast.success('Acknowledged'); qc.invalidateQueries(['allocation', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Acknowledgement failed')
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading allocation details...</div>
  if (!alloc) return <div style={{ padding: 40 }}>Not found</div>

  const isPending = alloc.status === 'pending'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/allocations" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0 }}>Request {alloc.allocation_number}</h1>
            <AllocationStatusBadge status={alloc.status} />
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Requested on {format(new Date(alloc.created_at), 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {alloc.expected_return_date && ['allocated', 'acknowledged'].includes(alloc.status) && isBefore(new Date(alloc.expected_return_date), startOfDay(new Date())) && (
        <div style={{ padding: '16px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#991B1B' }}>
          <AlertTriangle size={24} style={{ color: '#EF4444' }} />
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#991B1B' }}>Asset Overdue for Return</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>This asset was expected to be returned by <strong>{format(new Date(alloc.expected_return_date), 'dd MMM yyyy')}</strong> but has not been submitted yet.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 800 }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Details */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Allocation Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Asset</span>
                <div style={{ fontWeight: 500 }}>
                  {alloc.asset ? <Link to={`/assets/${alloc.asset.id}`}>{alloc.asset.asset_name}</Link> : '—'}
                </div>
              </div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Assignee</span>
                <div style={{ fontWeight: 500 }}>
                  {alloc.employee ? <Link to={`/employees/${alloc.employee.id}`}>{alloc.employee.full_name}</Link> : '—'}
                </div>
              </div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Expected Return</span>
                <div style={{ fontWeight: 500 }}>{alloc.expected_return_date ? format(new Date(alloc.expected_return_date), 'dd MMM yyyy') : 'Permanent'}</div>
              </div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Purpose</span>
                <div style={{ fontWeight: 500 }}>{alloc.purpose || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Notes</span>
                <div>{alloc.notes || '—'}</div>
              </div>
            </div>
          </div>

          {/* Workflow Actions */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Workflow Actions</h3>
            
            {isPending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  placeholder="Optional comments for approval/rejection..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={() => approveMut.mutate()} disabled={approveMut.isLoading}><CheckCircle size={16}/> Approve Allocation</button>
                  <button className="btn btn-danger" onClick={() => rejectMut.mutate()} disabled={rejectMut.isLoading}><XCircle size={16}/> Reject</button>
                </div>
              </div>
            )}

            {!isPending && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                Workflow is complete (Status: <strong>{alloc.status}</strong>)
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
