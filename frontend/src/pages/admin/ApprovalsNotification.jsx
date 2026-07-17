import React, { useState, useEffect } from 'react'
import { Check, X, Users, Trash2, Clock, History } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function ApprovalsNotification() {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'history'
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [selectedRole, setSelectedRole] = useState({})

  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/pending-users')
      setPendingUsers(res.data.users)
      
      const initialRoles = {}
      res.data.users.forEach(u => {
        initialRoles[u.id] = 'employee'
      })
      setSelectedRole(initialRoles)
    } catch (err) {
      toast.error('Failed to fetch pending users')
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get('/admin/approved-users')
      setApprovedUsers(res.data.users)
    } catch (err) {
      toast.error('Failed to fetch approval history')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchPending(), fetchHistory()])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApprove = async (id) => {
    setProcessingId(id)
    try {
      const role = selectedRole[id]
      await api.post(`/admin/approve-user/${id}`, { role })
      toast.success('User approved successfully')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve user')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user account? This action cannot be undone.")) {
      return
    }
    
    setProcessingId(id)
    try {
      await api.delete(`/admin/user/${id}`)
      toast.success('User deleted successfully')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Users size={28} color="var(--brand-primary)" />
            <h1 style={{ margin: 0 }}>Approvals Notification</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Approve new user registrations and view approval history.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            color: activeTab === 'pending' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'pending' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9375rem'
          }}
        >
          <Clock size={18} />
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span style={{
              background: 'var(--brand-danger)',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'history' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9375rem'
          }}
        >
          <History size={18} />
          Approval History
        </button>
      </div>

      <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
                {activeTab === 'pending' ? 'Registered At' : 'Approved At'}
              </th>
              {activeTab === 'pending' && (
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Assign Role</th>
              )}
              {activeTab === 'history' && (
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Role</th>
              )}
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === 'pending' ? (
              pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pending approvals.
                  </td>
                </tr>
              ) : (
                pendingUsers.map(user => (
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
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                          {processingId === user.id ? 'Processing...' : <><Check size={16} /> Approve</>}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={processingId === user.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--brand-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontWeight: 600,
                            cursor: processingId === user.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: processingId === user.id ? 0.7 : 1
                          }}
                          title="Reject and Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
            ) : (
              approvedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No approval history found.
                  </td>
                </tr>
              ) : (
                approvedUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {user.full_name}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {user.approved_at ? new Date(user.approved_at).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                      <span style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--brand-primary)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600 
                      }}>
                        {user.role?.display_name || user.role?.name || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={processingId === user.id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--brand-danger)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          fontWeight: 600,
                          cursor: processingId === user.id ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: processingId === user.id ? 0.7 : 1
                        }}
                        title="Delete User Account"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
