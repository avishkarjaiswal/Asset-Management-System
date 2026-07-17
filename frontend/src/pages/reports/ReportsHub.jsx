import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, TrendingUp, AlertTriangle, Briefcase, Package, Users, Truck, Wrench } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function ReportsHub() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  })

  const downloadReport = async (endpoint, filename) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${filename} downloaded`)
    } catch (e) {
      toast.error('Failed to download report')
    }
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading reports data...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1>Reports & Analytics</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Overview of enterprise assets, costs, and data exports.</p>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Total Assets</span>
            <div style={{ background: '#E0E7FF', padding: 8, borderRadius: 8 }}><Package size={20} color="#4338CA" /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-heading)' }}>{summary?.total_assets?.toLocaleString()}</div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Total Value</span>
            <div style={{ background: '#DCFCE7', padding: 8, borderRadius: 8 }}><TrendingUp size={20} color="#15803D" /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-heading)' }}>₹{summary?.total_purchase_cost?.toLocaleString()}</div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Maintenance Cost</span>
            <div style={{ background: '#FEE2E2', padding: 8, borderRadius: 8 }}><AlertTriangle size={20} color="#B91C1C" /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-heading)' }}>₹{summary?.total_maintenance_cost?.toLocaleString()}</div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Active Allocations</span>
            <div style={{ background: '#FEF3C7', padding: 8, borderRadius: 8 }}><Briefcase size={20} color="#B45309" /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-heading)' }}>{summary?.active_allocations?.toLocaleString()}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: 20 }}>Export Data (CSV)</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} color="var(--brand-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Assets Inventory</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Complete dump of all active assets, conditions, and locations.</p>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={() => downloadReport('/reports/assets/csv', 'assets_inventory.csv')} title="Download CSV"><Download size={18} /></button>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={24} color="var(--brand-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Allocations History</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Full history of asset allocations and return dates.</p>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={() => downloadReport('/reports/allocations/csv', 'allocations_history.csv')} title="Download CSV"><Download size={18} /></button>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={24} color="var(--brand-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Maintenance Logs</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>All scheduled, open, and completed repairs with costs.</p>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={() => downloadReport('/reports/maintenance/csv', 'maintenance_logs.csv')} title="Download CSV"><Download size={18} /></button>
        </div>

      </div>

    </div>
  )
}
