import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, Edit, Trash2, RefreshCw, Mail, Phone, Briefcase, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

function EmployeeStatusBadge({ status }) {
  const colors = { active: 'success', inactive: 'muted', terminated: 'danger', on_leave: 'warning' }
  return (
    <span className={`badge badge-${colors[status] || 'muted'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function EmployeeList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [exportTimeRange, setExportTimeRange] = useState('lifetime')

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search, departmentName, status, page }],
    queryFn: () => api.get('/employees', { params: { search, department_name: departmentName || undefined, status: status || undefined, page, per_page: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}`),
    onSuccess: () => { toast.success('Employee deactivated'); qc.invalidateQueries(['employees']) },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to deactivate employee'),
  })

  const handleDelete = (emp) => {
    if (window.confirm(`Deactivate ${emp.full_name}? They will not be able to log in.`)) {
      deleteMutation.mutate(emp.id)
    }
  }

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Exporting CSV...')
    try {
      const response = await api.get(`/employees/export/csv?time_range=${exportTimeRange}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'gppl_employees.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export successful', { id: loadingToast })
    } catch (err) {
      toast.error('Export failed', { id: loadingToast })
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const loadingToast = toast.loading('Importing employees...')
    try {
      const { data: resData } = await api.post('/employees/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Imported ${resData.imported} employees. Updated ${resData.updated}. Skipped ${resData.skipped}.`, { id: loadingToast })
      qc.invalidateQueries(['employees'])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed', { id: loadingToast })
    }
    e.target.value = '' // Reset input
  }

  const handleDownloadSchema = async () => {
    const loadingToast = toast.loading('Downloading schema...')
    try {
      const response = await api.get('/employees/import/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'employee_import_schema.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Schema downloaded', { id: loadingToast })
    } catch (err) {
      toast.error('Download failed', { id: loadingToast })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Employees</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {data?.total ? `${data.total.toLocaleString()} total employees` : 'Manage staff and asset assignments'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleDownloadSchema} className="btn btn-ghost" title="Download Excel Schema">
            <Download size={16} /> Schema
          </button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={16} /> Import
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
          <Link to="/employees/new" className="btn btn-primary">
            <Plus size={16} /> Add Employee
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, ID, email..."
              className="form-control"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={departmentName}
            onChange={e => { setDepartmentName(e.target.value); setPage(1) }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select className="form-control" style={{ width: 140 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
          {(search || departmentName || status !== 'active') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDepartmentName(''); setStatus(''); setPage(1) }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading employees...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact Info</th>
                  <th>Department & Role</th>
                  <th>Status</th>
                  <th>Assets</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                          {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/employees/${emp.id}`} style={{ fontWeight: 600, color: 'var(--text-heading)', textDecoration: 'none' }}>
                            {emp.full_name}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {emp.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--text-muted)" /> {emp.email}</div>
                        {emp.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="var(--text-muted)" /> {emp.phone}</div>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        <div style={{ fontWeight: 500 }}>{emp.department?.name || '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', marginTop: 2 }}>
                          <Briefcase size={12} /> {emp.designation || '—'}
                        </div>
                      </div>
                    </td>
                    <td><EmployeeStatusBadge status={emp.status} /></td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        {emp.allocated_asset_count || 0} assigned
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Link to={`/employees/${emp.id}`} className="btn btn-ghost btn-icon btn-sm" title="View"><Eye size={15} /></Link>
                        <Link to={`/employees/${emp.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit size={15} /></Link>
                        {emp.status !== 'terminated' && (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDelete(emp)} title="Deactivate">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Search size={28} /></div>
                      <div style={{ fontWeight: 600 }}>No employees found</div>
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
