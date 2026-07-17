import React, { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AssetForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { status: 'available', condition: 'new' }
  })

  // Fetch asset if editing
  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.get(`/assets/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  // Fetch lookups
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/assets/categories').then(r => r.data) })
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/vendors').then(r => r.data.items) })
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) })

  useEffect(() => {
    if (asset) {
      reset({
        asset_tag: asset.asset_tag || '',
        asset_name: asset.asset_name || '',
        category_name: asset.category?.name || '',
        brand: asset.brand || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        status: asset.status || 'available',
        condition: asset.condition || 'good',
        vendor_id: asset.vendor_id || '',
        purchase_cost: asset.purchase_cost || '',
        purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
        warranty_end: asset.warranty_end ? asset.warranty_end.split('T')[0] : '',
        description: asset.description || '',
      })
    }
  }, [asset, reset])

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/assets/${id}`, data) : api.post('/assets', data),
    onSuccess: (res) => {
      toast.success(`Asset ${isEdit ? 'updated' : 'created'} successfully!`)
      qc.invalidateQueries(['assets'])
      navigate(`/assets/${res.data.id}`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save asset')
    }
  })

  const onSubmit = (data) => {
    // Clean up empty strings to null for integers
    const payload = { ...data }
    if (!payload.category_name) delete payload.category_name
    if (!payload.vendor_id) delete payload.vendor_id
    if (!payload.purchase_cost) delete payload.purchase_cost
    
    saveMutation.mutate(payload)
  }

  if (isEdit && assetLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to={isEdit ? `/assets/${id}` : '/assets'} className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Basic Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Asset Name *</label>
              <input className="form-control" {...register('asset_name', { required: 'Name is required' })} placeholder="e.g. Dell Latitude 7420" />
              {errors.asset_name && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.asset_name.message}</span>}
            </div>

            <div className="form-group">
              <label>Asset Tag (Optional)</label>
              <input className="form-control" {...register('asset_tag')} placeholder="Auto-generated if left blank" disabled={isEdit} />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <input className="form-control" {...register('category_name', { required: 'Category is required' })} placeholder="e.g. Laptops" />
              {errors.category_name && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.category_name.message}</span>}
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Specifications</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Brand</label>
              <input className="form-control" {...register('brand')} placeholder="e.g. Dell" />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input className="form-control" {...register('model')} placeholder="e.g. Latitude 7420" />
            </div>
            <div className="form-group">
              <label>Serial Number</label>
              <input className="form-control" {...register('serial_number')} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" {...register('status')}>
                <option value="available">Available</option>
                <option value="lost">Lost</option>
                <option value="scrapped">Scrapped</option>
                <option value="disposed">Disposed</option>
              </select>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Note: 'Allocated' and 'In Maintenance' are managed automatically.</span>
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select className="form-control" {...register('condition')}>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Purchase & Warranty</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Vendor</label>
              <select className="form-control" {...register('vendor_id')}>
                <option value="">Select Vendor</option>
                {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Purchase Cost (₹)</label>
              <input type="number" step="0.01" className="form-control" {...register('purchase_cost')} />
            </div>
            <div className="form-group">
              <label>Purchase Date</label>
              <input type="date" className="form-control" {...register('purchase_date')} />
            </div>
            <div className="form-group">
              <label>Warranty End Date</label>
              <input type="date" className="form-control" {...register('warranty_end')} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label>Description / Remarks</label>
            <textarea className="form-control" rows={3} {...register('description')} placeholder="Any additional notes..."></textarea>
          </div>

        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to={isEdit ? `/assets/${id}` : '/assets'} className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}
