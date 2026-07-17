import React, { useState, useEffect } from "react"
import { Inbox as InboxIcon, CheckCircle, XCircle, Clock, Search, Printer } from "lucide-react"
import api from "../../services/api"
import toast from "react-hot-toast"
import { useAuth } from "../../contexts/AuthContext"

/* ─── Approval progress circles ─────────────────────────────────────── */
function ApprovalProgress({ members }) {
  if (!members || members.length === 0) return null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {members.map((m, i) => {
        const approved = m.status === "approved"
        const rejected = m.status === "rejected"
        const color    = approved ? "#10b981" : rejected ? "#ef4444" : "var(--border-color)"
        const bg       = approved ? "#10b981" : rejected ? "#ef4444" : "var(--bg-elevated)"
        return (
          <React.Fragment key={i}>
            <div title={`${m.name || "Member " + (i + 1)}: ${m.status || "pending"}`}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: bg,
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: approved || rejected ? "white" : "var(--text-muted)",
                fontSize: "0.7rem", fontWeight: 700,
                transition: "all 0.3s ease",
                boxShadow: approved ? "0 0 8px rgba(16,185,129,0.3)" : rejected ? "0 0 8px rgba(239,68,68,0.3)" : "none",
                flexShrink: 0,
              }}>
              {approved ? "✓" : rejected ? "✗" : i + 1}
            </div>
            {i < members.length - 1 && (
              <div style={{
                width: 16, height: 2,
                background: approved ? "#10b981" : "var(--border-color)",
                transition: "background 0.3s ease",
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function InboxActionButtons({ req, userIds, onAction }) {
  const [localStatus, setLocalStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const membersList = req.approval_members || []
  const myMember = membersList.find(m => userIds.has(m.gppl_id) && m.status === 'pending') 
                   || [...membersList].reverse().find(m => userIds.has(m.gppl_id))
  const actualStatus = localStatus || myMember?.status || 'pending'

  const handleAction = async (e, action) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await api.post(`/capital-sanctions/${req.id}/approve`, { action })
      setLocalStatus(action === 'accept' ? 'approved' : 'rejected')
      toast.success(action === 'accept' ? 'Approved successfully' : 'Rejected successfully')
      if (onAction) onAction()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process approval')
    } finally {
      setLoading(false)
    }
  }

  if (actualStatus === 'approved') {
    return <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Approved</div>
  }
  if (actualStatus === 'rejected') {
    return <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>✗ Rejected</div>
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button 
        className="btn" 
        style={{ background: '#10b981', color: 'white', padding: '4px 12px', fontSize: '0.7rem', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
        onClick={(e) => handleAction(e, 'accept')}
        disabled={loading}
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button 
        className="btn" 
        style={{ background: '#ef4444', color: 'white', padding: '4px 12px', fontSize: '0.7rem', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
        onClick={(e) => handleAction(e, 'reject')}
        disabled={loading}
      >
        {loading ? '...' : 'Reject'}
      </button>
    </div>
  )
}

function DetailedApprovalChain({ req, userIds, onAction }) {
  const members = req.approval_members || []
  if (members.length === 0) return null

  return (
    <div style={{ background: 'var(--bg-panel)', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 24, padding: 16 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Approval Members</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.map((m, i) => {
          const isMe = userIds.has(m.gppl_id)
          const approved = m.status === 'approved'
          const rejected = m.status === 'rejected'
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: approved ? '#10b981' : rejected ? '#ef4444' : 'var(--bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: approved || rejected ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
                  {approved ? '✓' : rejected ? '✗' : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.name || m.gppl_id || `Member ${i + 1}`} {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(You)</span>}
                  </div>
                </div>
              </div>
              
              <div>
                {isMe && m.status === 'pending' ? (
                  <InboxActionButtons req={req} userIds={userIds} onAction={onAction} />
                ) : approved ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                      ✓ Approved
                    </span>
                    {m.acted_at && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(m.acted_at).toLocaleString('en-IN')}</span>}
                  </div>
                ) : rejected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                      ✗ Rejected
                    </span>
                    {m.acted_at && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(m.acted_at).toLocaleString('en-IN')}</span>}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Pending</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main Inbox page ────────────────────────────────────────────────── */
export default function Inbox() {
  const { user }              = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState("")

  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('readMessages') || '[]'))
    } catch {
      return new Set()
    }
  })

  const handleSelectReq = (id) => {
    setSelectedId(id)
    if (!readIds.has(id)) {
      const newReadIds = new Set(readIds)
      newReadIds.add(id)
      setReadIds(newReadIds)
      localStorage.setItem('readMessages', JSON.stringify([...newReadIds]))
    }
  }

  const userIds = new Set([user?.employee_id, user?.email].filter(Boolean))

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get("/capital-sanctions", { params: { pending_for_me: true } })
      setRequests(res.data.items || [])
    } catch {
      toast.error("Failed to load inbox")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      await api.post(`/capital-sanctions/${id}/approve`, { action })
      toast.success(action === "accept" ? "✓ Sanction approved!" : "✗ Sanction rejected")
      fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action}`)
    }
  }

  const [settings, setSettings] = useState(null)
  
  useEffect(() => { 
    fetchRequests() 
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {})
  }, [])

  const handlePrint = () => {
    if (!selectedReq) return;
    const orgName    = settings?.company_name    || 'GPPL Asset Management'
    const orgAddress = settings?.company_address || ''
    const printDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const refNo      = `CS-${selectedReq.id}`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Capital Sanction Approval Form</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 13px;
              color: #111;
              padding: 32px 48px;
              line-height: 1.5;
            }

            /* ── Header ── */
            .header {
              text-align: center;
              border-bottom: 3px double #222;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .org-name {
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            .org-address {
              font-size: 12px;
              color: #555;
              margin-top: 4px;
            }
            .form-title {
              font-size: 15px;
              font-weight: 700;
              margin-top: 10px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              border: 2px solid #111;
              display: inline-block;
              padding: 4px 20px;
              border-radius: 2px;
            }

            /* ── Meta row ── */
            .meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 18px;
              font-size: 12px;
              color: #444;
            }

            /* ── Section label ── */
            .section-label {
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              background: #f0f0f0;
              padding: 5px 10px;
              border-left: 4px solid #222;
              margin: 18px 0 10px;
            }

            /* ── Details table ── */
            .detail-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .detail-table td {
              border: 1px solid #ccc;
              padding: 7px 12px;
              vertical-align: top;
            }
            .detail-table td.label {
              width: 30%;
              font-weight: 600;
              background: #fafafa;
              color: #333;
            }
            .detail-table td.value {
              width: 70%;
            }

            /* ── Signatures ── */
            .sig-section {
              margin-top: 48px;
            }
            .sig-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 48px 32px;
              margin-top: 16px;
            }
            .sig-box {
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
            }
            .sig-stamp {
              height: 44px;
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
              align-items: center;
              margin-bottom: 4px;
            }
            .stamp {
              font-weight: 800;
              font-size: 13px;
              border: 2px solid;
              padding: 2px 8px;
              border-radius: 4px;
              transform: rotate(-3deg);
              display: inline-block;
              line-height: 1.1;
            }
            .stamp.approved { color: #10b981; border-color: #10b981; }
            .stamp.rejected { color: #ef4444; border-color: #ef4444; }
            .stamp span { font-size: 9px; font-weight: 600; color: #555; display: block; margin-top: 2px; }
            .sig-line {
              border-top: 1px solid #444;
              width: 100%;
              margin: 0 0 6px 0;
            }
            .sig-name { font-weight: 700; font-size: 13px; }
            .sig-role { font-size: 11px; color: #555; margin-top: 2px; }
            .sig-dept { font-size: 10px; color: #888; }

            /* ── Footer ── */
            .print-footer {
              margin-top: 40px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
              font-size: 10px;
              color: #888;
              display: flex;
              justify-content: space-between;
            }

            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 140px;
              font-weight: 900;
              color: rgba(200, 0, 0, 0.08);
              z-index: -1;
              pointer-events: none;
              white-space: nowrap;
            }

            @media print {
              @page { size: A4; margin: 10mm; }
              body { 
                padding: 0;
                font-size: 12px;
                line-height: 1.3;
              }
              .header { padding-bottom: 10px; margin-bottom: 12px; }
              .org-name { font-size: 18px; }
              .section-label { margin: 12px 0 6px; padding: 4px 8px; }
              .detail-table { margin-bottom: 4px; }
              .detail-table td { padding: 4px 8px; }
              .sig-section { margin-top: 20px; }
              .sig-grid { gap: 24px 16px; margin-top: 10px; }
              .sig-stamp { height: 38px; }
              .stamp { font-size: 12px; }
              .stamp span { font-size: 8px; }
              .print-footer { margin-top: 20px; padding-top: 6px; }
              .watermark { font-size: 100px; }
            }
          </style>
        </head>
        <body>

          ${selectedReq.status !== 'completed' ? '<div class="watermark">DRAFT</div>' : ''}

          <!-- HEADER -->
          <div class="header">
            <div class="org-name">${orgName}</div>
            ${orgAddress ? `<div class="org-address">${orgAddress}</div>` : ''}
            <div style="margin-top:10px">
              <span class="form-title">Capital Sanction Approval Form</span>
            </div>
          </div>

          <!-- META -->
          <div class="meta">
            <div><strong>Ref No:</strong> ${refNo}</div>
            <div><strong>Date:</strong> ${printDate}</div>
            <div><strong>Status:</strong> ${(selectedReq.status || 'PENDING').toUpperCase()}</div>
          </div>

          <!-- SUBJECT -->
          <div class="section-label">Subject</div>
          <table class="detail-table">
            <tr>
              <td class="label">Subject</td>
              <td class="value">${selectedReq.subject || '—'}</td>
            </tr>
          </table>

          <!-- ITEM DETAILS -->
          <div class="section-label">Item Details</div>
          <table class="detail-table">
            <tr>
              <td class="label">Item Description</td>
              <td class="value">${selectedReq.item_description || '—'}</td>
            </tr>
            ${selectedReq.specification ? `
            <tr>
              <td class="label">Specification</td>
              <td class="value">${selectedReq.specification}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Quantity</td>
              <td class="value">${selectedReq.quantity || '—'}</td>
            </tr>
            <tr>
              <td class="label">Total Amount</td>
              <td class="value"><strong>&#8377; ${Number(selectedReq.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </table>

          <!-- VENDOR & DEPT -->
          <div class="section-label">Organisation & Supplier</div>
          <table class="detail-table">
            <tr>
              <td class="label">Name of Supplier</td>
              <td class="value">${selectedReq.supplier?.name || '—'}</td>
            </tr>
            <tr>
              <td class="label">Requesting Department</td>
              <td class="value">${selectedReq.department?.name || '—'}</td>
            </tr>
            <tr>
              <td class="label">Officer Responsible</td>
              <td class="value">${selectedReq.officer?.full_name || '—'}</td>
            </tr>
          </table>

          <!-- JUSTIFICATION -->
          <div class="section-label">Justification</div>
          <table class="detail-table">
            <tr>
              <td class="value" style="border-left: none">${selectedReq.justification || '—'}</td>
            </tr>
          </table>

          <!-- APPROVAL SIGNATURES -->
          <div class="sig-section">
            <div class="section-label">Approval Signatures</div>
            <div class="sig-grid">
              ${
                selectedReq.approval_members?.length
                  ? selectedReq.approval_members.map(m => `
                    <div class="sig-box">
                      <div class="sig-stamp">
                      ${m.status === 'approved' 
                        ? `<div class="stamp approved">&#10003; APPROVED<span>${m.acted_at ? new Date(m.acted_at).toLocaleString('en-IN') : ''}</span></div>`
                        : m.status === 'rejected'
                        ? `<div class="stamp rejected">&#10007; REJECTED<span>${m.acted_at ? new Date(m.acted_at).toLocaleString('en-IN') : ''}</span></div>`
                        : ``
                      }
                      </div>
                      <div class="sig-line"></div>
                      <div class="sig-name">${m.name || '—'}</div>
                      <div class="sig-role">${m.designation || '—'}</div>
                      <div class="sig-dept">${m.department || '—'}</div>
                    </div>`).join('')
                  : `<div class="sig-box"><div class="sig-stamp"></div><div class="sig-line"></div><div class="sig-name">Authorised Signatory</div></div>`
              }
            </div>
          </div>

          <!-- FOOTER -->
          <div class="print-footer">
            <span>Generated by ${orgName} Asset Management System</span>
            <span>Printed on: ${new Date().toLocaleString('en-IN')}</span>
          </div>

        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 350)
  }

  const filteredRequests = requests.filter(r => 
    r.subject.toLowerCase().includes(search.toLowerCase()) || 
    (r.officer?.full_name || "").toLowerCase().includes(search.toLowerCase())
  )

  const selectedReq = requests.find(r => r.id === selectedId)

  return (
    <div style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <InboxIcon size={24} color="var(--brand-primary)" />
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Mailbox</h1>
        </div>
        <button onClick={fetchRequests} style={{
          padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-color)",
          background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem",
        }}>
          🔄 Refresh
        </button>
      </div>

      {/* Split Pane Container */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        background: "var(--bg-panel)", 
        borderRadius: 12, 
        border: "1px solid var(--border-color)", 
        overflow: "hidden" 
      }}>
        
        {/* LEFT PANE: Email List */}
        <div style={{ 
          width: "350px", 
          borderRight: "1px solid var(--border-color)", 
          display: "flex", 
          flexDirection: "column",
          background: "var(--bg-panel)" 
        }}>
          {/* Search Box */}
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
              <input 
                type="text" 
                placeholder="Search inbox..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 34px", 
                  borderRadius: 6, border: "1px solid var(--border-color)",
                  background: "var(--bg-elevated)", color: "var(--text-primary)",
                  fontSize: "0.85rem", outline: "none"
                }}
              />
            </div>
          </div>

          {/* Email Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>No requests found.</div>
            ) : (
              filteredRequests.map((req) => {
                const isSelected = selectedId === req.id
                const isUnread = !readIds.has(req.id)
                return (
                  <div 
                    key={req.id} 
                    onClick={() => handleSelectReq(req.id)}
                    style={{ 
                      padding: "14px 16px", 
                      borderBottom: "1px solid var(--border-color)",
                      background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                      borderLeft: isSelected ? "3px solid var(--brand-primary)" : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: "0.85rem", fontWeight: isUnread ? 800 : 600, color: isSelected ? "var(--brand-primary)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0 }}></div>}
                        {req.officer?.full_name || "Unknown Officer"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 8 }}>
                        {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: isUnread ? 800 : (isSelected ? 600 : 500), color: "var(--text-heading)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.subject}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.item_description}
                    </div>
                    <InboxActionButtons req={req} userIds={userIds} />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Email Details */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-elevated)", position: "relative" }}>
          {!selectedReq ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <InboxIcon size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>Select an item to read</p>
            </div>
          ) : (
            <div style={{ padding: "32px 40px", maxWidth: "800px" }}>
              
              {/* Email Header */}
              <div style={{ marginBottom: 24, borderBottom: "1px solid var(--border-color)", paddingBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-primary)" }}>{selectedReq.subject}</h2>
                  <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>
                    <Printer size={16} /> Print
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: "50%", background: "var(--brand-primary)", 
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 600, fontSize: "1.1rem" 
                    }}>
                      {(selectedReq.officer?.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                        {selectedReq.officer?.full_name || "Unknown Officer"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Department: {selectedReq.department?.name || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {selectedReq.created_at ? new Date(selectedReq.created_at).toLocaleString("en-IN") : ""}
                    </div>
                    {/* Overall Status Badge */}
                    <div style={{ marginTop: 8 }}>
                       {(() => {
                        const cfg = {
                          completed:         { bg: "rgba(16,185,129,0.12)",  color: "#10b981", label: "Completed" },
                          sent_for_approval: { bg: "rgba(59,130,246,0.12)",  color: "var(--brand-primary)", label: "In Progress" },
                          rejected:          { bg: "rgba(239,68,68,0.12)",   color: "#ef4444", label: "Rejected" },
                          pending:           { bg: "rgba(245,158,11,0.12)",  color: "var(--brand-warning)", label: "Pending" },
                        }[selectedReq.status] || { bg: "rgba(148,163,184,0.12)", color: "var(--text-muted)", label: selectedReq.status }
                        return (
                          <span style={{
                            background: cfg.bg, color: cfg.color, padding: "4px 10px", borderRadius: 6,
                            fontSize: "0.75rem", fontWeight: 600
                          }}>{cfg.label}</span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Body / Content */}
              <div style={{ background: "var(--bg-panel)", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Sanction Details</div>
                </div>
                <div style={{ padding: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px", marginBottom: 24 }}>
                    {[
                      ["Item Description",  selectedReq.item_description],
                      ["Quantity",          selectedReq.quantity],
                      ["Total Amount",      selectedReq.total_amount != null ? `₹${Number(selectedReq.total_amount).toLocaleString("en-IN")}` : null],
                      ["Supplier",          selectedReq.supplier?.name],
                    ].map(([label, val]) => val != null && (
                      <div key={label}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                        <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedReq.specification && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Specification</div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5, background: "var(--bg-elevated)", padding: 12, borderRadius: 6 }}>{selectedReq.specification}</div>
                    </div>
                  )}
                  {selectedReq.justification && (
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Justification</div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5, background: "var(--bg-elevated)", padding: 12, borderRadius: 6 }}>{selectedReq.justification}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Tracker inside Mail (Moved below body) */}
              <DetailedApprovalChain 
                req={selectedReq} 
                userIds={userIds} 
                onAction={() => fetchRequests()} 
              />

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
