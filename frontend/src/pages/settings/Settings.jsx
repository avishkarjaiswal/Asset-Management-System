import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Settings as SettingsIcon, Building, Shield, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function Settings() {
  const qc = useQueryClient()
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    support_email: '',
    asset_prefix: 'GPPL',
    auto_approve_allocations: 'false'
  })

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  useEffect(() => {
    if (data) {
      setFormData(prev => ({ ...prev, ...data }))
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: () => {
      toast.success('Settings saved successfully')
      qc.invalidateQueries(['settings'])
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save settings')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMut.mutate(formData)
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading settings...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--brand-primary)', color: 'white', padding: 8, borderRadius: 8 }}><SettingsIcon size={24} /></div>
        <div>
          <h1 style={{ margin: 0 }}>System Settings</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Configure application preferences and company details.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 32 }}>
        
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid var(--brand-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Building size={16} /> General
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={16} /> Security
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={16} /> Notifications
          </div>
        </div>

        {/* Content */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem' }}>Company Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label>Company Name</label>
                  <input className="form-control" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="e.g. Ghaziabad Precision Product Pvt Ltd" />
                </div>
                <div className="form-group">
                  <label>Support Email</label>
                  <input type="email" className="form-control" value={formData.support_email} onChange={e => setFormData({...formData, support_email: e.target.value})} placeholder="it@gppl.in" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Headquarters Address</label>
                  <textarea className="form-control" rows={2} value={formData.company_address} onChange={e => setFormData({...formData, company_address: e.target.value})}></textarea>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }}></div>

            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem' }}>Asset Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label>Default Asset Tag Prefix</label>
                  <input className="form-control" value={formData.asset_prefix} onChange={e => setFormData({...formData, asset_prefix: e.target.value})} placeholder="e.g. AST" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-generated assets will start with this prefix (e.g., GPPL-0001)</span>
                </div>
                <div className="form-group">
                  <label>Auto-Approve Allocations</label>
                  <select className="form-control" value={formData.auto_approve_allocations} onChange={e => setFormData({...formData, auto_approve_allocations: e.target.value})}>
                    <option value="false">No (Requires Manager & IT Approval)</option>
                    <option value="true">Yes (Skip approvals, direct handover)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={saveMut.isLoading}>
                <Save size={16} /> Save Settings
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}
