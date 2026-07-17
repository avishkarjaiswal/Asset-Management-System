import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Plus, Edit, Eye, X } from "lucide-react"
import api from "../../services/api"
import toast from "react-hot-toast"

function ApprovalProgress({ members }) {
  if (!members || members.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {members.map((m, i) => {
        const approved = m.status === "approved"
        const rejected = m.status === "rejected"
        const color = approved ? "#10b981" : rejected ? "#ef4444" : "var(--border-color)"
        const bg    = approved ? "#10b981" : rejected ? "#ef4444" : "var(--bg-elevated)"
        return (
          <React.Fragment key={i}>
            <div
              title={`${m.name || "Member " + (i + 1)}: ${m.status || "pending"}`}
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: bg, border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: approved || rejected ? "white" : "var(--text-muted)",
                fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                boxShadow: approved ? "0 0 6px rgba(16,185,129,0.35)" : "none",
                transition: "all 0.3s",
              }}
            >
              {approved ? "✓" : rejected ? "✗" : i + 1}
            </div>
            {i < members.length - 1 && (
              <div style={{
                width: 14, height: 2, flexShrink: 0,
                background: approved ? "#10b981" : "var(--border-color)",
                transition: "background 0.3s",
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function DetailedApprovalChain({ members }) {
  if (!members || members.length === 0) return null
  return (
    <div style={{ background: 'var(--bg-panel)', borderRadius: 8, border: '1px solid var(--border-color)', padding: 16 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Approval Members</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.map((m, i) => {
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
                    {m.name || m.gppl_id || `Member ${i + 1}`}
                  </div>
                </div>
              </div>
              <div>
                {approved ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>✓ Approved</span>
                    {m.acted_at && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(m.acted_at).toLocaleString('en-IN')}</span>}
                  </div>
                ) : rejected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>✗ Rejected</span>
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

function SanctionViewModal({ cs, onClose }) {
  if (!cs) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Sanction Details</h2>
          <button onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '1.4rem' }}>{cs.subject}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px", marginBottom: 24, background: 'var(--bg-panel)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            {[
              ["Item Description",  cs.item_description],
              ["Quantity",          cs.quantity],
              ["Total Amount",      cs.total_amount != null ? `₹${Number(cs.total_amount).toLocaleString("en-IN")}` : null],
              ["Supplier",          cs.supplier?.name],
            ].map(([label, val]) => val != null && (
              <div key={label}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>
          
          {cs.specification && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Specification</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5, background: "var(--bg-elevated)", padding: 12, borderRadius: 6, border: '1px solid var(--border-color)' }}>{cs.specification}</div>
            </div>
          )}
          {cs.justification && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Justification</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5, background: "var(--bg-elevated)", padding: 12, borderRadius: 6, border: '1px solid var(--border-color)' }}>{cs.justification}</div>
            </div>
          )}

          <DetailedApprovalChain members={cs.approval_members} />
        </div>
      </div>
    </div>
  )
}

export default function CapitalSanctionList() {
  const [page, setPage] = useState(1)
  const [viewModalCs, setViewModalCs] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["capital-sanctions", page],
    queryFn: () => api.get("/capital-sanctions", { params: { page } }).then(r => r.data),
  })

  return (
    <div>
      {viewModalCs && <SanctionViewModal cs={viewModalCs} onClose={() => setViewModalCs(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Capital Sanctions</h1>
        <Link to="/capital-sanctions/new" className="btn btn-primary">
          <Plus size={16} /> New Sanction
        </Link>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Approval Progress</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(cs => (
                <tr key={cs.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>#{cs.id}</td>
                  <td style={{ fontWeight: 500, color: "var(--text-heading)" }}>{cs.subject}</td>
                  <td>{cs.supplier?.name || "-"}</td>
                  <td style={{ fontWeight: 600 }}>Rs.{Number(cs.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td><ApprovalProgress members={cs.approval_members} /></td>
                  <td>
                    {(() => {
                      const s = cs.status
                      const cfg = {
                        completed:         { bg: "rgba(16,185,129,0.12)", color: "#10b981",              label: "Completed" },
                        sent_for_approval: { bg: "rgba(59,130,246,0.12)", color: "var(--brand-primary)", label: "In Progress" },
                        rejected:          { bg: "rgba(239,68,68,0.12)",  color: "#ef4444",              label: "Rejected" },
                        pending:           { bg: "rgba(245,158,11,0.12)", color: "var(--brand-warning)", label: "Pending" },
                      }[s] || { bg: "rgba(148,163,184,0.12)", color: "var(--text-muted)", label: s }
                      return (
                        <span style={{
                          background: cfg.bg, color: cfg.color,
                          padding: "3px 10px", borderRadius: 20,
                          fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap"
                        }}>{cfg.label}</span>
                      )
                    })()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button onClick={() => setViewModalCs(cs)} className="btn btn-ghost btn-sm btn-icon" title="View">
                        <Eye size={16} />
                      </button>
                      {!cs.approval_members?.some(m => m.status === 'approved') ? (
                        <Link to={`/capital-sanctions/${cs.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                          <Edit size={16} />
                        </Link>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    No capital sanctions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
