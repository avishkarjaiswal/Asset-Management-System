import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PurchaseForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      vendor_id: '',
      department_name: '',
      order_date: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unit_price: 0, gst_rate: 18 }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors-active'],
    queryFn: () => api.get('/vendors', { params: { per_page: 500 } }).then(r => r.data.items),
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })



  const saveMut = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: (data) => {
      toast.success('Purchase Order Created')
      qc.invalidateQueries(['purchases'])
      navigate(`/purchases/${data.id}`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create PO')
    }
  })

  const onSubmit = (data) => {
    saveMut.mutate(data)
  }

  if (vendorsLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading form...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/purchases" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>Create Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>General Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label>Vendor *</label>
                  <select className="form-control" {...register('vendor_id', { required: 'Vendor is required' })}>
                    <option value="">-- Select Vendor --</option>
                    {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  {errors.vendor_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.vendor_id.message}</span>}
                </div>
                <div className="form-group">
                  <label>Department (Requesting)</label>
                  <select className="form-control" {...register('department_name')}>
                    <option value="">-- Central Store (no dept) --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Order Date *</label>
                  <input type="date" className="form-control" {...register('order_date', { required: 'Required' })} />
                </div>
                <div className="form-group">
                  <label>Expected Delivery</label>
                  <input type="date" className="form-control" {...register('expected_delivery')} />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Order Items</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => append({ description: '', quantity: 1, unit_price: 0, gst_rate: 18 })}>
                  <Plus size={14} style={{ marginRight: 4 }}/> Add Row
                </button>
              </div>
              
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Description *</th>
                    <th style={{ width: 100 }}>Qty *</th>
                    <th style={{ width: 150 }}>Unit Price *</th>
                    <th style={{ width: 100 }}>GST %</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="form-control" placeholder="Item name / specs" {...register(`items.${index}.description`, { required: true })} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" min="1" className="form-control" {...register(`items.${index}.quantity`, { required: true, min: 1 })} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" step="0.01" className="form-control" {...register(`items.${index}.unit_price`, { required: true })} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select className="form-control" {...register(`items.${index}.gst_rate`)}>
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => remove(index)} disabled={fields.length === 1} style={{ color: 'var(--brand-danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: 24, position: 'sticky', top: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Summary & Terms</h3>
            <div className="form-group">
              <label>Shipping / Billing Notes</label>
              <textarea className="form-control" rows={4} {...register('notes')} placeholder="Terms of payment, delivery instructions..."></textarea>
            </div>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/purchases" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Cancel</Link>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting || saveMut.isLoading}>
                <Save size={16} style={{ marginRight: 8 }}/> Create Draft PO
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
