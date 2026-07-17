import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, Edit, Trash2, Globe, Mail, Phone, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function VendorList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', { search, page }],
    queryFn: () => api.get('/vendors', { params: { search, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/vendors/${id}`),
    onSuccess: () => { toast.success('Vendor deleted'); qc.invalidateQueries(['vendors']) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete vendor'),
  })

  const handleDelete = (vendor) => {
    if (window.confirm(`Delete vendor ${vendor.name}?`)) {
      deleteMutation.mutate(vendor.id)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Vendors & Suppliers</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {data?.total ? `${data.total.toLocaleString()} vendors` : 'Manage your suppliers and AMC providers'}
          </p>
        </div>
        <Link to="/vendors/new" className="btn btn-primary">
          <Plus size={16} /> Add Vendor
        </Link>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={15} className="search-icon" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by vendor name, code, contact..."
              className="form-control"
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading vendors...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Vendor Name</th>
                  <th>Contact Person</th>
                  <th>Contact Info</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(vendor => (
                  <tr key={vendor.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {vendor.code}
                      </span>
                    </td>
                    <td>
                      <Link to={`/vendors/${vendor.id}`} style={{ fontWeight: 600, color: 'var(--text-heading)', textDecoration: 'none' }}>
                        {vendor.name}
                      </Link>
                      {vendor.website && (
                        <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                          <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Globe size={10} /> {vendor.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{vendor.contact_person || '—'}</td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {vendor.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--text-muted)" /> {vendor.email}</div>}
                        {vendor.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="var(--text-muted)" /> {vendor.phone}</div>}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {vendor.city ? `${vendor.city}${vendor.state ? `, ${vendor.state}` : ''}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      <span style={{ textTransform: 'capitalize' }}>{vendor.category || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Link to={`/vendors/${vendor.id}`} className="btn btn-ghost btn-icon btn-sm" title="View"><Eye size={15} /></Link>
                        <Link to={`/vendors/${vendor.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit size={15} /></Link>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDelete(vendor)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Search size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No vendors found</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
            
            {data?.pages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                  Page {page} of {data.pages}
                </span>
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
