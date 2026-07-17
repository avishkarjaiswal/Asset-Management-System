import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Package, Printer, Download } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { POStatusBadge } from './PurchaseList'

export default function PurchaseDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api.get(`/purchases/${id}`).then(r => r.data),
  })

  const approveMut = useMutation({
    mutationFn: () => api.post(`/purchases/${id}/approve`),
    onSuccess: () => { toast.success('PO Approved'); qc.invalidateQueries(['purchase', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to approve')
  })

  const receiveMut = useMutation({
    mutationFn: (data) => api.post(`/purchases/${id}/receive`, data),
    onSuccess: () => { toast.success('Marked as received'); qc.invalidateQueries(['purchase', id]) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to receive')
  })

  const handleReceive = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    receiveMut.mutate({ invoice_number: fd.get('invoice_number'), invoice_date: fd.get('invoice_date') })
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading PO details...</div>
  if (!po) return <div style={{ padding: 40 }}>Purchase order not found</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/purchases" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0 }}>{po.po_number}</h1>
              <POStatusBadge status={po.status} />
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Created {format(new Date(po.created_at), 'dd MMM yyyy')}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} style={{ marginRight: 6 }}/> Print</button>
            {po.status === 'draft' && <button className="btn btn-primary" onClick={() => approveMut.mutate()} disabled={approveMut.isLoading}><CheckCircle size={16} style={{ marginRight: 6 }}/> Approve PO</button>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Order Items</h3></div>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price (₹)</th>
                  <th style={{ textAlign: 'right' }}>GST (%)</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.description}</div>
                      {item.hsn_code && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HSN: {item.hsn_code}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{item.unit_price}</td>
                    <td style={{ textAlign: 'right' }}>{item.gst_rate}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total_price}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{po.subtotal}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>GST Amount</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{po.gst_amount}</td>
                </tr>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.125rem' }}>Grand Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.125rem', color: 'var(--brand-primary)' }}>₹{po.total_amount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {po.status === 'approved' && (
            <div className="card" style={{ padding: 24, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}><Package size={20}/> Receive Order</h3>
              <form onSubmit={handleReceive} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ color: '#166534' }}>Invoice Number *</label>
                  <input name="invoice_number" required className="form-control" style={{ background: 'white' }}/>
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ color: '#166534' }}>Invoice Date *</label>
                  <input name="invoice_date" type="date" required className="form-control" style={{ background: 'white' }} defaultValue={new Date().toISOString().split('T')[0]}/>
                </div>
                <button type="submit" className="btn btn-success" disabled={receiveMut.isLoading}>Mark Received</button>
              </form>
            </div>
          )}

          {po.notes && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: '1rem' }}>Notes / Terms</h3>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{po.notes}</div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Vendor Details</h3>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>{po.vendor?.name}</div>
            {po.vendor?.contact_person && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{po.vendor.contact_person}</div>}
            {po.vendor?.email && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{po.vendor.email}</div>}
            {po.vendor?.phone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{po.vendor.phone}</div>}
            {po.vendor?.gst_number && <div style={{ marginTop: 8, fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-muted)', display: 'inline-block', borderRadius: 4 }}>GST: {po.vendor.gst_number}</div>}
          </div>
          
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Delivery Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Date</div>
                <div style={{ fontWeight: 500 }}>{po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Delivery</div>
                <div style={{ fontWeight: 500 }}>{po.expected_delivery ? format(new Date(po.expected_delivery), 'dd MMM yyyy') : '—'}</div>
              </div>
              {po.actual_delivery && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Delivery</div>
                  <div style={{ fontWeight: 500, color: 'var(--brand-success)' }}>{format(new Date(po.actual_delivery), 'dd MMM yyyy')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
