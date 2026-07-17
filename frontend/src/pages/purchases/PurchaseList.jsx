import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, FileText, CheckCircle, Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export function POStatusBadge({ status }) {
  const colors = { draft: 'muted', approved: 'primary', ordered: 'warning', received: 'success', cancelled: 'danger' }
  return <span className={`badge badge-${colors[status] || 'muted'}`} style={{ textTransform: 'capitalize' }}>{status}</span>
}

export default function PurchaseList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { status, page }],
    queryFn: () => api.get('/purchases', { params: { status: status || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Purchase Orders</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Manage asset procurement, POs, and vendor orders.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/purchases/new')}>
          <Plus size={16} /> Create PO
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading purchase orders...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Total Amount</th>
                <th>Expected Delivery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(po => (
                <tr key={po.id} onClick={() => navigate(`/purchases/${po.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{po.po_number}</div>
                  </td>
                  <td>
                    {po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{po.vendor?.name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>₹{po.total_amount}</div>
                  </td>
                  <td>
                    {po.expected_delivery ? format(new Date(po.expected_delivery), 'dd MMM yyyy') : '—'}
                  </td>
                  <td><POStatusBadge status={po.status} /></td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><FileText size={28} /></div>
                    <div style={{ fontWeight: 600 }}>No purchase orders found</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
