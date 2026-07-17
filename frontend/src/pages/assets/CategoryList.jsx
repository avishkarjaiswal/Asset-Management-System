import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Layers, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function CategoryList() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', code: '', description: '', depreciation_rate: 20, useful_life_years: 5 })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => api.get('/assets/categories').then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (data) => api.post('/assets/categories', data),
    onSuccess: () => {
      toast.success('Category created')
      qc.invalidateQueries(['asset-categories'])
      setShowModal(false)
      setFormData({ name: '', code: '', description: '', depreciation_rate: 20, useful_life_years: 5 })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save category')
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/assets/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted')
      qc.invalidateQueries(['asset-categories'])
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete category')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMut.mutate(formData)
  }

  const handleDelete = (cat) => {
    if (window.confirm(`Are you sure you want to delete ${cat.name}?`)) {
      deleteMut.mutate(cat.id)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Asset Categories</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage categories for asset grouping and depreciation rules.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading categories...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Category Name</th>
                <th>Depreciation Rate</th>
                <th>Useful Life</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map(cat => (
                <tr key={cat.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cat.code}</td>
                  <td style={{ fontWeight: 500 }}>{cat.name}</td>
                  <td>{cat.depreciation_rate}% / yr</td>
                  <td>{cat.useful_life_years} Years</td>
                  <td style={{ color: 'var(--text-muted)' }}>{cat.description || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {cat.asset_count === 0 ? (
                      <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(cat)} disabled={deleteMut.isLoading} style={{ color: 'var(--brand-danger)' }}>
                        <Trash2 size={16}/>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In use ({cat.asset_count})</span>
                    )}
                  </td>
                </tr>
              ))}
              {!categories?.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Layers size={28}/></div>
                      <div style={{ fontWeight: 600 }}>No categories configured</div>
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
          <div className="card" style={{ width: 450, maxWidth: '90%', padding: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>New Category</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Category Name *</label>
                <input required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Laptops" />
              </div>
              <div className="form-group">
                <label>Category Code *</label>
                <input required className="form-control" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. LPT" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Depreciation Rate (%)</label>
                  <input type="number" required className="form-control" value={formData.depreciation_rate} onChange={e => setFormData({...formData, depreciation_rate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Useful Life (Years)</label>
                  <input type="number" required className="form-control" value={formData.useful_life_years} onChange={e => setFormData({...formData, useful_life_years: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveMut.isLoading}>Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
