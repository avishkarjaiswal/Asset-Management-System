import React, { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function VendorForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => api.get(`/vendors/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (vendor) {
      reset({
        code: vendor.code || '',
        name: vendor.name || '',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        alternate_phone: vendor.alternate_phone || '',
        category: vendor.category || '',
        website: vendor.website || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        gst_number: vendor.gst_number || '',
        pan_number: vendor.pan_number || '',
        bank_name: vendor.bank_name || '',
        bank_account: vendor.bank_account || '',
        bank_ifsc: vendor.bank_ifsc || '',
        notes: vendor.notes || '',
      })
    }
  }, [vendor, reset])

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/vendors/${id}`, data) : api.post('/vendors', data),
    onSuccess: (res) => {
      toast.success(`Vendor ${isEdit ? 'updated' : 'created'} successfully!`)
      qc.invalidateQueries(['vendors'])
      navigate(isEdit ? `/vendors/${id}` : '/vendors')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save vendor')
    }
  })

  const onSubmit = (data) => saveMutation.mutate(data)

  if (isEdit && vendorLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to={isEdit ? `/vendors/${id}` : '/vendors'} className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Basic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Vendor Code *</label>
              <input className="form-control" {...register('code', { required: 'Code is required' })} disabled={isEdit} placeholder="e.g. VEND-001" />
              {errors.code && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.code.message}</span>}
            </div>
            <div className="form-group">
              <label>Vendor Name *</label>
              <input className="form-control" {...register('name', { required: 'Name is required' })} placeholder="e.g. Dell Enterprise" />
              {errors.name && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label>Category</label>
              <input className="form-control" {...register('category')} placeholder="e.g. Hardware, Software" />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input className="form-control" {...register('website')} placeholder="https://..." />
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Contact Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Contact Person</label>
              <input className="form-control" {...register('contact_person')} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" {...register('email')} />
            </div>
            <div className="form-group">
              <label>Primary Phone</label>
              <input className="form-control" {...register('phone')} />
            </div>
            <div className="form-group">
              <label>Alternate Phone</label>
              <input className="form-control" {...register('alternate_phone')} />
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Address</h3>
          <div className="form-group">
            <label>Street Address</label>
            <textarea className="form-control" rows={2} {...register('address')}></textarea>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20 }}>
            <div className="form-group">
              <label>City</label>
              <input className="form-control" {...register('city')} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-control" {...register('state')} />
            </div>
            <div className="form-group">
              <label>Pincode</label>
              <input className="form-control" {...register('pincode')} />
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Compliance & Banking</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>GST Number</label>
              <input className="form-control" {...register('gst_number')} />
            </div>
            <div className="form-group">
              <label>PAN Number</label>
              <input className="form-control" {...register('pan_number')} />
            </div>
            <div className="form-group">
              <label>Bank Name</label>
              <input className="form-control" {...register('bank_name')} />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input className="form-control" {...register('bank_account')} />
            </div>
            <div className="form-group">
              <label>IFSC Code</label>
              <input className="form-control" {...register('bank_ifsc')} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label>Internal Notes</label>
            <textarea className="form-control" rows={3} {...register('notes')} placeholder="Notes about vendor quality, delivery time, etc."></textarea>
          </div>

        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to={isEdit ? `/vendors/${id}` : '/vendors'} className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  )
}
