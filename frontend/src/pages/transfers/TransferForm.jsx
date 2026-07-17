import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function TransferForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { transfer_type: 'employee', condition: 'good' }
  })
  
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['allocated-assets-transfer'],
    queryFn: () => api.get('/assets', { params: { status: 'allocated', per_page: 500 } }).then(r => r.data.items),
  })

  const selectedAssetId = watch('asset_id')
  const selectedAsset = assets?.find(a => a.id == selectedAssetId)
  const currentOwnerId = selectedAsset?.current_employee?.id

  const { data: employees } = useQuery({
    queryKey: ['active-employees'],
    queryFn: () => api.get('/employees', { params: { status: 'active', per_page: 500 } }).then(r => r.data.items),
  })



  const saveMutation = useMutation({
    mutationFn: (data) => api.post('/transfers', data),
    onSuccess: () => {
      toast.success('Transfer initiated')
      qc.invalidateQueries(['transfers'])
      navigate('/transfers')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to initiate transfer')
    }
  })

  const onSubmit = (data) => {
    // clean up empty
    const payload = { ...data, transfer_type: 'employee' }
    saveMutation.mutate(payload)
  }

  if (assetsLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading form data...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/transfers" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>Initiate Asset Transfer</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Transfer Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <div className="form-group">
              <label>Select Asset *</label>
              <select className="form-control" {...register('asset_id', { required: 'Please select an asset' })}>
                <option value="">-- Choose Asset to Transfer --</option>
                {assets?.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.asset_name} ({a.asset_tag}) - Currently with {a.current_employee ? a.current_employee.full_name : 'IT Store'}
                  </option>
                ))}
              </select>
              {errors.asset_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.asset_id.message}</span>}
            </div>

            <div className="form-group">
              <label>Transfer To (Employee) *</label>
              <select className="form-control" {...register('to_employee_id', { required: 'Target employee is required' })}>
                <option value="">-- Choose Target Employee --</option>
                {employees?.filter(e => e.id !== currentOwnerId).map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              {errors.to_employee_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.to_employee_id.message}</span>}
            </div>

            <div className="form-group">
              <label>Reason for Transfer *</label>
              <textarea className="form-control" rows={3} {...register('reason', { required: 'Reason is required' })} placeholder="Briefly explain why this transfer is happening..."></textarea>
              {errors.reason && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.reason.message}</span>}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to="/transfers" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> Submit Transfer
          </button>
        </div>
      </form>
    </div>
  )
}
