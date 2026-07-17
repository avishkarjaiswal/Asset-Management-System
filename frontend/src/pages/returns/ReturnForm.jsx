import React from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function ReturnForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialAllocId = searchParams.get('allocation') || ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { allocation_id: initialAllocId, condition: 'good' }
  })

  // Fetch active allocations (assets currently with employees)
  const { data: allocations, isLoading: allocsLoading } = useQuery({
    queryKey: ['active-allocations'],
    queryFn: () => api.get('/allocations', { params: { per_page: 500 } }).then(r => r.data.items.filter(a => a.status === 'allocated' || a.status === 'acknowledged')),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => api.post('/returns', data),
    onSuccess: () => {
      toast.success('Return initiated successfully')
      qc.invalidateQueries(['returns', 'allocations', 'assets'])
      navigate('/returns')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to initiate return')
    }
  })

  const onSubmit = (data) => {
    saveMutation.mutate(data)
  }

  if (allocsLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading form data...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/returns" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>Initiate Asset Return</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Return Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <div className="form-group">
              <label>Select Active Allocation *</label>
              <select className="form-control" {...register('allocation_id', { required: 'Please select an allocation' })}>
                <option value="">-- Choose Asset to Return --</option>
                {allocations?.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.asset?.asset_name} ({a.asset?.asset_tag}) - Assigned to {a.employee?.full_name}
                  </option>
                ))}
              </select>
              {errors.allocation_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.allocation_id.message}</span>}
              {!allocations?.length && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>No active allocations found.</p>}
            </div>

            <div className="form-group">
              <label>Condition upon Return *</label>
              <select className="form-control" {...register('condition')}>
                <option value="good">Good / Working</option>
                <option value="fair">Fair (Normal wear and tear)</option>
                <option value="poor">Poor (Requires repair)</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost / Stolen</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Damage Description (If any)</label>
              <textarea className="form-control" rows={3} {...register('damage_description')} placeholder="Describe any damages or issues with the returned asset..."></textarea>
            </div>
            
            <div className="form-group">
              <label>Additional Notes</label>
              <textarea className="form-control" rows={2} {...register('notes')} placeholder="Any other remarks..."></textarea>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to="/returns" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> Submit Return
          </button>
        </div>
      </form>
    </div>
  )
}
