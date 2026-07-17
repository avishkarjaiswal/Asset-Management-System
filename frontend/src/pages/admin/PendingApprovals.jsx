import React, { useState, useEffect } from 'react'
import { Check, X, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PendingApprovals() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [selectedRole, setSelectedRole] = useState({})

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/pending-users')
      setUsers(res.data.users)
      
      // Initialize default role selection
      const initialRoles = {}
      res.data.users.forEach(u => {
        initialRoles[u.id] = 'employee'
      })
      setSelectedRole(initialRoles)
    } catch (err) {
      toast.error('Failed to fetch pending users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleApprove = async (id) => {
    setProcessingId(id)
    try {
      const role = selectedRole[id]
      await api.post(`/admin/approve-user/${id}`, { role })
      toast.success('User approved successfully')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve user')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Users size={28} color="var(--brand-primary)" />
            <h1 style={{ margin: 0 }}>Pending Approvals</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Approve new user registrations and assign roles.</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Registered At</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Assign Role</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending approvals.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {user.full_name}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={selectedRole[user.id] || 'employee'}
                      onChange={(e) => setSelectedRole({ ...selectedRole, [user.id]: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="employee">Employee</option>
                      <option value="approval_member">Approval Member</option>
                    </select>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processingId === user.id}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: 'var(--brand-primary)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 600,
                        cursor: processingId === user.id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: processingId === user.id ? 0.7 : 1
                      }}
                    >
                      {processingId === user.id ? 'Approving...' : <><Check size={16} /> Approve</>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
