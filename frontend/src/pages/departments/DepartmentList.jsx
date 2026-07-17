import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function DepartmentList() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  
  const [formData, setFormData] = useState({ name: '', code: '', description: '' })

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments-full'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (data) => editingDept ? api.put(`/departments/${editingDept.id}`, data) : api.post('/departments', data),
    onSuccess: () => {
      toast.success(editingDept ? 'Department updated' : 'Department created')
      qc.invalidateQueries(['departments-full'])
      qc.invalidateQueries(['departments'])
      setShowModal(false)
      setEditingDept(null)
      setFormData({ name: '', code: '', description: '' })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save department')
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success('Department deleted')
      qc.invalidateQueries(['departments-full'])
      qc.invalidateQueries(['departments'])
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete department')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMut.mutate(formData)
  }

  const handleEdit = (dept) => {
    setEditingDept(dept)
    setFormData({ name: dept.name, code: dept.code || '', description: dept.description || '' })
    setShowModal(true)
  }

  const handleDelete = (dept) => {
    if (window.confirm(`Are you sure you want to delete ${dept.name}?`)) {
      deleteMut.mutate(dept.id)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Departments & Structure</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage organizational units.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { 
          setEditingDept(null)
          setFormData({ name: '', code: '', description: '' })
          setShowModal(true) 
        }}>
          <Plus size={16} /> New Department
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading departments...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Department Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments?.map(dept => (
                <tr key={dept.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{dept.code || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{dept.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{dept.description || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(dept)}><Edit2 size={16}/></button>
                      {(dept.employee_count === 0 && dept.asset_count === 0) ? (
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(dept)} disabled={deleteMut.isLoading} style={{ color: 'var(--brand-danger)' }}>
                          <Trash2 size={16}/>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={`${dept.employee_count} Employees, ${dept.asset_count} Assets`}>In use</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!departments?.length && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Building size={28}/></div>
                      <div style={{ fontWeight: 600 }}>No departments configured</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 400, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>{editingDept ? 'Edit' : 'New'} Department</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Department Name *</label>
                <input required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Information Technology" />
              </div>
              <div className="form-group">
                <label>Department Code *</label>
                <input required className="form-control" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. IT" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveMut.isLoading}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
