import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Globe, FileText, ShoppingCart } from 'lucide-react'
import api from '../../services/api'

export default function VendorDetail() {
  const { id } = useParams()
  
  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => api.get(`/vendors/${id}`).then(r => r.data),
    retry: false
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading vendor details...</div>
  if (error) return <div style={{ padding: 40, color: 'var(--brand-danger)' }}>Error loading vendor.</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/vendors" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0 }}>{vendor.name}</h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              {vendor.code}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            <span style={{ textTransform: 'capitalize' }}>{vendor.category || 'Vendor'}</span>
            {vendor.contact_person && ` • Primary Contact: ${vendor.contact_person}`}
          </p>
        </div>
        <Link to={`/vendors/${id}/edit`} className="btn btn-secondary"><Edit size={16} /> Edit Vendor</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Business Details</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>GST Number</span><div style={{ fontWeight: 500 }}>{vendor.gst_number || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>PAN Number</span><div style={{ fontWeight: 500 }}>{vendor.pan_number || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Notes</span><div>{vendor.notes || '—'}</div></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Bank Details</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Bank Name</span><div style={{ fontWeight: 500 }}>{vendor.bank_name || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>IFSC Code</span><div style={{ fontWeight: 500 }}>{vendor.bank_ifsc || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Account Number</span><div style={{ fontWeight: 500 }}>{vendor.bank_account || '—'}</div></div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Mail size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Email Address</div>
                  {vendor.email ? <a href={`mailto:${vendor.email}`} style={{ color: 'var(--text-heading)', textDecoration: 'none', fontWeight: 500 }}>{vendor.email}</a> : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Phone size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Phone Number</div>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{vendor.phone || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <Globe size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Website</div>
                  {vendor.website ? <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>{vendor.website}</a> : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
                <MapPin size={16} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Address</div>
                  <div style={{ color: 'var(--text-heading)' }}>
                    {vendor.address ? <div style={{ marginBottom: 4 }}>{vendor.address}</div> : null}
                    <div>{[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ') || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-muted)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.875rem' }}>Purchases</h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>From this vendor</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{vendor.purchase_count || 0}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
