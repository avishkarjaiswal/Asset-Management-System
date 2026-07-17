import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Trash2, Tag, MapPin, User, FileText, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { format } from 'date-fns'

const STATUS_COLORS = {
  available: 'success', allocated: 'primary', in_maintenance: 'warning',
  in_repair: 'orange', lost: 'danger', scrapped: 'accent', reserved: 'info', disposed: 'muted',
}

function AssetStatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'muted'
  return (
    <span className={`badge badge-${color}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.get(`/assets/${id}`).then(r => r.data),
    retry: false
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/assets/${id}`),
    onSuccess: () => { 
      toast.success('Asset deleted')
      qc.invalidateQueries(['assets'])
      navigate('/assets')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Delete failed'),
  })

  const handleDelete = () => {
    if (window.confirm('Delete this asset? This cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading asset details...</div>
  }

  if (error) {
    return <div style={{ padding: 40, color: 'var(--brand-danger)' }}>Error loading asset details.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/assets" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0 }}>{asset.asset_name}</h1>
            <AssetStatusBadge status={asset.status} />
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            {asset.asset_tag} • {asset.category?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/assets/${id}/edit`} className="btn btn-secondary"><Edit size={16} /> Edit Asset</Link>
          <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> Delete</button>
        </div>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        {/* Main Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Specifications Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Tag size={16} /> Specifications</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Brand</span><div style={{ fontWeight: 500 }}>{asset.brand || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Model</span><div style={{ fontWeight: 500 }}>{asset.model || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Serial Number</span><div style={{ fontWeight: 500 }}>{asset.serial_number || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Condition</span><div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{asset.condition}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Description</span><div>{asset.description || '—'}</div></div>
            </div>
          </div>

          {/* Lifecycle & Warranty */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} /> Lifecycle & Warranty</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Purchase Date</span><div style={{ fontWeight: 500 }}>{asset.purchase_date ? format(new Date(asset.purchase_date), 'dd MMM yyyy') : '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Purchase Cost</span><div style={{ fontWeight: 500 }}>{asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString('en-IN')}` : '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Vendor</span>
                <div style={{ fontWeight: 500 }}>{asset.vendor ? <Link to={`/vendors/${asset.vendor.id}`}>{asset.vendor.name}</Link> : '—'}</div>
              </div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Depreciated Value</span><div style={{ fontWeight: 500 }}>{asset.depreciated_value ? `₹${asset.depreciated_value.toLocaleString('en-IN')}` : '—'}</div></div>
              
              <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.875rem' }}>Warranty Coverage</h4>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {asset.warranty_start && asset.warranty_end 
                        ? `${format(new Date(asset.warranty_start), 'MMM yyyy')} to ${format(new Date(asset.warranty_end), 'MMM yyyy')}` 
                        : 'No warranty information'}
                    </p>
                  </div>
                  {asset.is_under_warranty ? (
                    <span className="badge badge-success"><CheckCircle size={14} style={{ marginRight: 4 }}/> Active</span>
                  ) : (
                    asset.warranty_end && <span className="badge badge-danger"><AlertCircle size={14} style={{ marginRight: 4 }}/> Expired</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Current Assignment */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} /> Current Assignment</h3>
            </div>
            {asset.status === 'allocated' && asset.current_employee ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                    {asset.current_employee.full_name.charAt(0)}
                  </div>
                  <div>
                    <Link to={`/employees/${asset.current_employee.id}`} style={{ fontWeight: 600, color: 'var(--text-heading)', textDecoration: 'none' }}>{asset.current_employee.full_name}</Link>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>ID: {asset.current_employee.employee_id}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}><MapPin size={14} color="var(--text-muted)" /> {asset.department?.name || 'No department'}</div>
                </div>
                <Link to="/returns/new" className="btn btn-secondary btn-sm" style={{ display: 'block', textAlign: 'center', width: '100%', marginTop: 16 }}>Request Return</Link>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <p style={{ margin: '0 0 16px' }}>This asset is currently {asset.status}.</p>
                {asset.status === 'available' && <Link to={`/allocations/new?asset=${asset.id}`} className="btn btn-primary btn-sm">Allocate Asset</Link>}
              </div>
            )}
          </div>

          {/* Recent History */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} /> Recent Activity</h3>
            </div>
            {asset.history?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {asset.history.map((event, i) => (
                  <div key={event.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {i !== asset.history.length - 1 && <div style={{ position: 'absolute', top: 24, bottom: -16, left: 11, width: 2, background: 'var(--border-color)' }} />}
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-muted)', border: '2px solid var(--bg-surface)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{event.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {format(new Date(event.event_date), 'dd MMM yyyy, h:mm a')}
                        {event.performed_by && ` • by ${event.performed_by.full_name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No history recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
