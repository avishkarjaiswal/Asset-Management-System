import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, Download, Eye, Edit, Trash2, RefreshCw, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { format } from 'date-fns'

const STATUS_COLORS = {
  available: 'success', allocated: 'primary', in_maintenance: 'warning',
  in_repair: 'orange', lost: 'danger', scrapped: 'accent', reserved: 'info', disposed: 'muted',
}

function AssetStatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'muted'
  return (
    <span className={`badge badge-${color}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function AssetList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch]   = useState(searchParams.get('search') || '')
  const [status, setStatus]   = useState(searchParams.get('status') || '')
  const [categoryName, setCategoryName] = useState('')
  const [page, setPage]       = useState(1)
  const [exportTimeRange, setExportTimeRange] = useState('lifetime')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['assets', { search, status, categoryName, page }],
    queryFn: () => api.get('/assets', { params: { search, status, category_name: categoryName || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/assets/${id}`),
    onSuccess: () => { toast.success('Asset deleted'); qc.invalidateQueries(['assets']) },
    onError: (e) => toast.error(e.response?.data?.error || 'Delete failed'),
  })

  const handleDelete = (asset) => {
    if (window.confirm(`Delete asset ${asset.asset_tag}? This cannot be undone.`)) {
      deleteMutation.mutate(asset.id)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const loadingToast = toast.loading('Importing assets...')
    try {
      const { data: resData } = await api.post('/assets/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Imported ${resData.imported} assets. Skipped ${resData.skipped}.`, { id: loadingToast })
      qc.invalidateQueries(['assets'])
      qc.invalidateQueries(['asset-categories'])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed', { id: loadingToast })
    }
    e.target.value = '' // Reset input
  }

  const handleDownloadSchema = async () => {
    const loadingToast = toast.loading('Downloading schema...')
    try {
      const response = await api.get('/assets/import/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'asset_import_schema.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Schema downloaded', { id: loadingToast })
    } catch (err) {
      toast.error('Download failed', { id: loadingToast })
    }
  }

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Exporting CSV...')
    try {
      const response = await api.get(`/assets/export/csv?time_range=${exportTimeRange}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'gppl_assets.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export successful', { id: loadingToast })
    } catch (err) {
      toast.error('Export failed', { id: loadingToast })
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Assets</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {data?.total ? `${data.total.toLocaleString()} total assets` : 'Manage all company assets'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleDownloadSchema} className="btn btn-ghost" title="Download Excel Schema">
            <Download size={16} /> Schema
          </button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={16} /> Import Assets
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
              onChange={handleImport}
            />
          </label>
          <select className="form-control" style={{ width: 140, padding: '4px 8px', height: 36 }} value={exportTimeRange} onChange={e => setExportTimeRange(e.target.value)}>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 365 Days</option>
            <option value="lifetime">Lifetime</option>
          </select>
          <button onClick={handleExportCSV} className="btn btn-ghost">
            <Download size={16} /> Export CSV
          </button>
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} /> Add Asset
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by tag, name, serial, brand..."
              className="form-control"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select className="form-control" style={{ width: 160 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="in_maintenance">In Maintenance</option>
            <option value="lost">Lost</option>
            <option value="scrapped">Scrapped</option>
            <option value="reserved">Reserved</option>
            <option value="disposed">Disposed</option>
          </select>
          <input 
            className="form-control" 
            style={{ width: 180 }} 
            placeholder="Category Name" 
            value={categoryName} 
            onChange={e => { setCategoryName(e.target.value); setPage(1) }} 
          />
          {(search || status || categoryName) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus(''); setCategoryName(''); setPage(1) }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <p style={{ margin: 0 }}>Loading assets...</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Brand / Model</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>Current User</th>
                  <th>Warranty</th>
                  <th>Purchase Cost</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4, color: 'var(--brand-primary)', fontWeight: 600 }}>
                          {asset.asset_tag}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/assets/${asset.id}`} style={{ fontWeight: 600, color: 'var(--text-heading)', textDecoration: 'none' }}>
                        {asset.asset_name}
                      </Link>
                      {asset.serial_number && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>S/N: {asset.serial_number}</div>}
                    </td>
                    <td>
                      {asset.category && (
                        <span style={{ fontSize: '0.8125rem' }}>{asset.category.name}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {asset.brand && <div style={{ fontWeight: 500 }}>{asset.brand}</div>}
                      {asset.model && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{asset.model}</div>}
                    </td>
                    <td><AssetStatusBadge status={asset.status} /></td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {asset.current_employee ? (asset.current_employee.department_name || '—') : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {asset.current_employee
                        ? <Link to={`/employees/${asset.current_employee.id}`} style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>{asset.current_employee.full_name}</Link>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {asset.warranty_end ? (
                        <span style={{ color: asset.is_under_warranty ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                          {format(new Date(asset.warranty_end), 'dd MMM yyyy')}
                          {!asset.is_under_warranty && ' (Expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Link to={`/assets/${asset.id}`} className="btn btn-ghost btn-icon btn-sm" title="View">
                          <Eye size={15} />
                        </Link>
                        <Link to={`/assets/${asset.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                          <Edit size={15} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete"
                          style={{ color: 'var(--brand-danger)' }}
                          onClick={() => handleDelete(asset)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Search size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No assets found</div>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>Try adjusting your filters or add a new asset</p>
                      <Link to="/assets/new" className="btn btn-primary btn-sm">Add First Asset</Link>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.pages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                  Page {page} of {data.pages} • {data.total} total
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
