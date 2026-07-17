import React from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AllocationForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialAssetId = searchParams.get('asset') || ''
  const initialEmployeeId = searchParams.get('employee') || ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { 
      asset_id: initialAssetId, 
      employee_id: initialEmployeeId,
      allocation_date: new Date().toISOString().split('T')[0]
    }
  })

  // Fetch available assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['available-assets'],
    queryFn: () => api.get('/assets', { params: { status: 'available', per_page: 500 } }).then(r => r.data.items),
  })

  // Fetch active employees
  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ['active-employees'],
    queryFn: () => api.get('/employees', { params: { status: 'active', per_page: 500 } }).then(r => r.data.items),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => api.post('/allocations', data),
    onSuccess: (res) => {
      toast.success('Allocation request submitted!')
      qc.invalidateQueries(['allocations', 'assets', 'employees'])
      navigate(`/allocations/${res.data.id}`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to submit request')
    }
  })

  const onSubmit = (data) => {
    saveMutation.mutate(data)
  }

  if (assetsLoading || empLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading form data...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/allocations" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>Request Asset Allocation</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Assignment Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <div className="form-group">
              <label>Select Asset *</label>
              <select className="form-control" {...register('asset_id', { required: 'Please select an asset' })}>
                <option value="">-- Choose an available asset --</option>
                {assets?.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_tag})</option>)}
              </select>
              {errors.asset_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.asset_id.message}</span>}
              {!assets?.length && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>No available assets. Please add one first.</p>}
            </div>

            <div className="form-group">
              <label>Assign To Employee *</label>
              <select className="form-control" {...register('employee_id', { required: 'Please select an employee' })}>
                <option value="">-- Choose an employee --</option>
                {employees?.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
              </select>
              {errors.employee_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.employee_id.message}</span>}
            </div>
            
            <div className="form-group">
              <label>Allocation Date *</label>
              <input type="date" className="form-control" {...register('allocation_date', { required: 'Allocation Date is required' })} />
              {errors.allocation_date && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.allocation_date.message}</span>}
            </div>
            
            <div className="form-group">
              <label>Expected Return Date (Optional)</label>
              <input type="date" className="form-control" {...register('expected_return_date')} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leave blank if permanent assignment.</span>
            </div>

            <div className="form-group">
              <label>Purpose / Justification *</label>
              <textarea className="form-control" rows={3} {...register('purpose', { required: 'Purpose is required' })} placeholder="Briefly explain why this asset is needed..."></textarea>
              {errors.purpose && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.purpose.message}</span>}
            </div>
            

          </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to="/allocations" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> Submit Request
          </button>
        </div>
      </form>
    </div>
  )
}
