import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, Plus, Pencil, Trash2, X, Save, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

/* ─── helpers ─────────────────────────────────────────────────── */
const empty = { department: '', designation: '', name: '', gppl_id: '' }

/* ─── Modal ────────────────────────────────────────────────────── */
function MemberModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState(member ? { ...member } : { ...empty })
  const [errors, setErrors] = useState({})
  const qc = useQueryClient()

  const { data: deptList = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      member
        ? api.put(`/approval-members/${member.id}`, data)
        : api.post('/approval-members', data),
    onSuccess: () => {
      toast.success(member ? 'Member updated!' : 'Member added!')
      qc.invalidateQueries(['approval-members'])
      onSaved?.()
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  })

  const validate = () => {
    const e = {}
    if (!form.department.trim()) e.department = 'Required'
    if (!form.designation.trim()) e.designation = 'Required'
    if (!form.name.trim()) e.name = 'Required'
    if (!form.gppl_id?.trim()) e.gppl_id = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    mutation.mutate(form)
  }

  const field = (key, label, placeholder) => (
    <div className="form-group">
      <label>{label} *</label>
      <input
        className="form-control"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && (
        <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors[key]}</span>
      )}
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: 460, borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        animation: 'slideUp 0.22s ease',
      }}>
        <style>{`
          @keyframes slideUp {
            from { opacity:0; transform:translateY(20px) }
            to   { opacity:1; transform:translateY(0) }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--gradient-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={20} color="white" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
              {member ? 'Edit Member' : 'Add Approval Member'}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.7)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Department — combobox from departments table */}
          <div className="form-group">
            <label>Department *</label>
            <select
              className="form-control"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            >
              <option value="">— Select Department —</option>
              {deptList.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            {errors.department && (
              <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors.department}</span>
            )}
          </div>
          {field('designation', 'Designation', 'e.g. Chief Financial Officer')}
          {field('name', 'Name', 'e.g. John Doe')}
          {field('gppl_id', 'GPPL ID (Employee ID)', 'e.g. EMP123')}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              <Save size={16} /> {member ? 'Update' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function ApprovalMemberList() {
  const [modal, setModal] = useState(null)   // null | 'add' | member-object
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['approval-members'],
    queryFn: () => api.get('/approval-members').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/approval-members/${id}`),
    onSuccess: () => {
      toast.success('Member deleted')
      qc.invalidateQueries(['approval-members'])
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = (m) => {
    if (window.confirm(`Delete "${m.name}"?`)) deleteMutation.mutate(m.id)
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return (
      m.department.toLowerCase().includes(q) ||
      m.designation.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q)
    )
  })

  // Flat list, simple data table (space efficient)
  const sortedMembers = filtered.sort((a, b) => {
    if (a.department !== b.department) return a.department.localeCompare(b.department)
    if (a.designation !== b.designation) return a.designation.localeCompare(b.designation)
    return a.name.localeCompare(b.name)
  })

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-brand)',
          }}>
            <UserCheck size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Approval Members</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              Manage members used in Capital Sanction approval workflows
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Member
        </button>
      </div>



      {/* Search */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            className="form-control"
            style={{ paddingLeft: 34 }}
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
      ) : members.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <UserCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            No approval members yet. Add your first member to get started.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No results for "{search}"
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Designation</th>
                <th>Name</th>
                <th>GPPL ID</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.department}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{m.designation}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                        {m.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                        {m.name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.gppl_id || '—'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Edit"
                        onClick={() => setModal(m)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Delete"
                        style={{ color: 'var(--brand-danger)' }}
                        onClick={() => handleDelete(m)}
                        disabled={deleteMutation.isLoading}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <MemberModal
          member={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
