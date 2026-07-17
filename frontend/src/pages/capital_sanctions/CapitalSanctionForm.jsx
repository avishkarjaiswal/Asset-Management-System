import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Printer, UserCheck, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

/* ─── Number of fixed approval member rows ─────────────────────── */
const MEMBER_SLOTS = 4

/* ─── Single cascading row component ───────────────────────────── */
function ApprovalMemberRow({ index, allMembers, value, onChange, allSlots }) {
  // Unique sorted departments from the full member list
  const departments = [...new Set(allMembers.map(m => m.department))].sort()

  // Find what designations are already selected in the same department in OTHER slots
  const selectedDesignationsInDept = allSlots
    .filter((slot, i) => i !== index && slot.department === value.department && slot.designation)
    .map(slot => slot.designation)

  // Designations available in the selected department, excluding ones chosen in other slots
  const designations = value.department
    ? [...new Set(
        allMembers
          .filter(m => m.department === value.department && !selectedDesignationsInDept.includes(m.designation))
          .map(m => m.designation)
      )].sort()
    : []

  // Auto-fill name when department+designation resolves to exactly one member
  const resolvedMember = (value.department && value.designation)
    ? allMembers.find(
        m => m.department === value.department && m.designation === value.designation
      )
    : null

  // Sync auto-filled name into parent state
  useEffect(() => {
    const autoName = resolvedMember?.name ?? ''
    const autoGppl = resolvedMember?.gppl_id ?? ''
    if (autoName !== value.name || autoGppl !== value.gppl_id) {
      onChange({ ...value, name: autoName, gppl_id: autoGppl })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMember?.name, resolvedMember?.gppl_id])

  const selectStyle = {
    width: '100%',
    appearance: 'none',
    WebkitAppearance: 'none',
  }

  const wrapStyle = { position: 'relative', flex: 1 }

  const chevron = (
    <ChevronDown size={14} style={{
      position: 'absolute', right: 10, top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-muted)', pointerEvents: 'none',
      display: value.isFrozen ? 'none' : 'block'
    }} />
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 12,
      padding: '14px 16px',
      borderRadius: 10,
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-color)',
      position: 'relative',
    }}>
      {/* Row label badge */}
      <div style={{
        position: 'absolute', top: -10, left: 14,
        background: 'var(--gradient-primary)',
        color: 'white', fontSize: '0.65rem', fontWeight: 700,
        padding: '2px 10px', borderRadius: 20,
        letterSpacing: '0.06em',
      }}>
        MEMBER {index + 1}
      </div>

      {/* Department */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: '0.72rem' }}>Department</label>
        <div style={wrapStyle}>
          {value.isFrozen ? (
             <input className="form-control" readOnly value={value.department} style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', cursor: 'default' }} />
          ) : (
            <>
              <select
                className="form-control"
                style={selectStyle}
                value={value.department}
                onChange={e => onChange({ department: e.target.value, designation: '', name: '' })}
              >
                <option value="">— Select Department —</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {chevron}
            </>
          )}
        </div>
      </div>

      {/* Designation */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: '0.72rem' }}>Designation</label>
        <div style={wrapStyle}>
          {value.isFrozen ? (
             <input className="form-control" readOnly value={value.designation} style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', cursor: 'default' }} />
          ) : (
            <>
              <select
                className="form-control"
                style={selectStyle}
                value={value.designation}
                disabled={!value.department}
                onChange={e => onChange({ ...value, designation: e.target.value, name: '' })}
              >
                <option value="">— Select Designation —</option>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {chevron}
            </>
          )}
        </div>
      </div>

      {/* Name — read-only, auto-filled */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: '0.72rem' }}>Name</label>
        <input
          className="form-control"
          readOnly
          value={value.name}
          placeholder="Auto-filled from selection"
          style={{
            background: value.name
              ? 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(124,58,237,0.04))'
              : undefined,
            color: value.name ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'default',
            fontWeight: value.name ? 600 : 400,
          }}
        />
      </div>
    </div>
  )
}

/* ─── Main Form ─────────────────────────────────────────────────── */
export default function CapitalSanctionForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Local state for the 4 cascading approval member rows
  const [memberSlots, setMemberSlots] = useState([
    { department: '', designation: 'HOD', name: '', gppl_id: '', isFrozen: true },
    { department: 'Plant Head', designation: 'Plant Head', name: '', gppl_id: '', isFrozen: true },
    { department: 'CFO', designation: 'CFO', name: '', gppl_id: '', isFrozen: true },
    { department: 'Managing Director', designation: 'Managing Director', name: '', gppl_id: '', isFrozen: true }
  ])

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      quantity: 1,
      total_amount: 0,
      status: 'pending',
      department_id: '',
    }
  })

  const formValues = watch()

  /* ── Remote data ── */
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', { params: { per_page: 500 } }).then(r => r.data.items || (Array.isArray(r.data) ? r.data : [])),
  })

  // Sync Member 1 with Requesting Department
  const selectedDeptId = watch('department_id')
  useEffect(() => {
    if (departments) {
      const deptName = departments.find(d => String(d.id) === String(selectedDeptId))?.name || ''
      setMemberSlots(prev => {
        const next = [...prev]
        // Only update if it actually changed to avoid unnecessary re-renders
        if (next[0].department !== deptName) {
          next[0] = { ...next[0], department: deptName }
        }
        return next
      })
    }
  }, [selectedDeptId, departments])

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors', { params: { per_page: 500 } }).then(r => r.data.items),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees', { params: { per_page: 500 } }).then(r => r.data.items),
  })

  const { data: approvalMembers = [] } = useQuery({
    queryKey: ['approval-members'],
    queryFn: () => api.get('/approval-members').then(r => r.data),
  })

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  /* ── Load existing record when editing ── */
  const { data: existingData } = useQuery({
    queryKey: ['capital-sanction', id],
    queryFn: () => api.get(`/capital-sanctions/${id}`).then(r => r.data),
    enabled: isEditing,
  })

  useEffect(() => {
    if (existingData) {
      reset({
        subject:          existingData.subject,
        item_description: existingData.item_description,
        specification:    existingData.specification,
        quantity:         existingData.quantity,
        supplier_id:      existingData.supplier_id || '',
        department_id:    existingData.department_id || '',
        justification:    existingData.justification,
        total_amount:     existingData.total_amount,
        officer_id:       existingData.officer_id || '',
      })
      // Restore saved member slots
      if (existingData.approval_members?.length) {
        setMemberSlots(prev => {
          const restored = [...prev]
          existingData.approval_members.forEach((m, i) => {
            if (i === 0) {
              restored[i] = {
                department:  m.department  || '',
                designation: 'HOD',
                name:        m.name        || '',
                gppl_id:     m.gppl_id     || '',
                isFrozen:    true
              }
            }
          })
          return restored
        })
      }
    }
  }, [existingData, reset])

  /* ── Save ── */
  const mutation = useMutation({
    mutationFn: (data) => isEditing
      ? api.put(`/capital-sanctions/${id}`, data)
      : api.post('/capital-sanctions', data),
    onSuccess: () => {
      toast.success(`Capital Sanction ${isEditing ? 'updated' : 'created'}!`)
      qc.invalidateQueries(['capital-sanctions'])
      navigate('/capital-sanctions')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  })

  const onSubmit = (data) => {
    // Only include slots that have at least a department chosen
    const approval_members = memberSlots
      .filter(s => s.department || s.name)
      .map(s => ({ 
        department: s.department, 
        designation: s.designation, 
        name: s.name,
        gppl_id: s.gppl_id,
        status: 'pending'
      }))

    mutation.mutate({ ...data, approval_members })
  }

  const onInvalid = (errors) => {
    toast.error("Please fill in all required fields marked with *")
  }

  /* ── Print ── */
  const handlePrint = () => {
    const printMembers = (isEditing && existingData?.approval_members?.length)
      ? existingData.approval_members
      : memberSlots.filter(s => s.name)
    const orgName    = settings?.company_name    || 'GPPL Asset Management'
    const orgAddress = settings?.company_address || ''
    const printDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const refNo      = isEditing ? `CS-${id}` : `CS-DRAFT-${Date.now().toString().slice(-6)}`

    // Resolve vendor name and department name from IDs if possible
    const selectedVendor = vendors?.find(v => String(v.id) === String(formValues.supplier_id))
    const selectedDept   = departments?.find(d => String(d.id) === String(formValues.department_id))
    const selectedOfficer = employees?.find(e => String(e.id) === String(formValues.officer_id))

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

          ${formValues.status !== 'completed' ? '<div class="watermark">DRAFT</div>' : ''}

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
            <div><strong>Status:</strong> ${(formValues.status || 'PENDING').toUpperCase()}</div>
          </div>

          <!-- SUBJECT -->
          <div class="section-label">Subject</div>
          <table class="detail-table">
            <tr>
              <td class="label">Subject</td>
              <td class="value">${formValues.subject || '—'}</td>
            </tr>
          </table>

          <!-- ITEM DETAILS -->
          <div class="section-label">Item Details</div>
          <table class="detail-table">
            <tr>
              <td class="label">Item Description</td>
              <td class="value">${formValues.item_description || '—'}</td>
            </tr>
            ${formValues.specification ? `
            <tr>
              <td class="label">Specification</td>
              <td class="value">${formValues.specification}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Quantity</td>
              <td class="value">${formValues.quantity || '—'}</td>
            </tr>
            <tr>
              <td class="label">Total Amount</td>
              <td class="value"><strong>&#8377; ${Number(formValues.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </table>

          <!-- VENDOR & DEPT -->
          <div class="section-label">Organisation & Supplier</div>
          <table class="detail-table">
            <tr>
              <td class="label">Name of Supplier</td>
              <td class="value">${selectedVendor?.name || '—'}</td>
            </tr>
            <tr>
              <td class="label">Requesting Department</td>
              <td class="value">${selectedDept?.name || '—'}</td>
            </tr>
            <tr>
              <td class="label">Officer Responsible</td>
              <td class="value">${selectedOfficer?.full_name || '—'}</td>
            </tr>
          </table>

          <!-- JUSTIFICATION -->
          <div class="section-label">Justification</div>
          <table class="detail-table">
            <tr>
              <td class="value" style="border-left: none">${formValues.justification || '—'}</td>
            </tr>
          </table>

          <!-- APPROVAL SIGNATURES -->
          <div class="sig-section">
            <div class="section-label">Approval Signatures</div>
            <div class="sig-grid">
              ${
                printMembers.length
                  ? printMembers.map(m => `
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

  const updateSlot = (index, val) => {
    setMemberSlots(prev => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/capital-sanctions" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>{isEditing ? 'Edit' : 'New'} Capital Sanction</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="card" style={{ maxWidth: 820 }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Subject *</label>
              <input type="text" className="form-control" {...register('subject', { required: 'Required' })} />
              {errors.subject && <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors.subject.message}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Item Description *</label>
              <textarea className="form-control" rows={3} {...register('item_description', { required: 'Required' })} />
              {errors.item_description && <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors.item_description.message}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Specification</label>
              <textarea className="form-control" rows={3} {...register('specification')} />
            </div>

            <div className="form-group">
              <label>Quantity *</label>
              <input type="number" className="form-control" min="1" {...register('quantity', { required: 'Required', valueAsNumber: true })} />
            </div>

            <div className="form-group">
              <label>Total Amount *</label>
              <input type="number" step="0.01" className="form-control" {...register('total_amount', { required: 'Required', valueAsNumber: true })} />
            </div>

            <div className="form-group">
              <label>Requesting Department *</label>
              <select className="form-control" {...register('department_id', { required: 'Required' })}>
                <option value="">-- Select Department --</option>
                {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.department_id && <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors.department_id.message}</span>}
            </div>

            <div className="form-group">
              <label>Name of Supplier</label>
              <select className="form-control" {...register('supplier_id')}>
                <option value="">-- Select Vendor --</option>
                {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Officer Responsible</label>
              <select className="form-control" {...register('officer_id')} disabled={!selectedDeptId}>
                <option value="">-- Select Officer --</option>
                {selectedDeptId && employees?.filter(e => String(e.department_id) === String(selectedDeptId)).map(e => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Justification *</label>
              <textarea className="form-control" rows={3} {...register('justification', { required: 'Required' })} />
              {errors.justification && <span style={{ color: 'var(--brand-danger)', fontSize: 12 }}>{errors.justification.message}</span>}
            </div>

            {/* ── Approval Members Section ───────────────────────────── */}
            <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 20,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserCheck size={16} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Approval Members</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Select from pre-defined approval members — designation and name auto-fill.
                  </p>
                </div>
              </div>

              {approvalMembers.length === 0 ? (
                <div style={{
                  padding: '20px 24px', borderRadius: 12,
                  background: 'var(--bg-muted)', border: '1px dashed var(--border-color)',
                  textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem',
                }}>
                  No approval members configured.{' '}
                  <Link to="/approval-members" style={{ color: 'var(--brand-secondary)' }}>
                    Add members here
                  </Link>{' '}
                  before filling this form.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {memberSlots.map((slot, i) => (
                    <ApprovalMemberRow
                      key={i}
                      index={i}
                      allMembers={approvalMembers}
                      value={slot}
                      onChange={(val) => updateSlot(i, val)}
                      allSlots={memberSlots}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--bg-muted)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center',
        }}>
          <button type="button" className="btn btn-ghost" onClick={handlePrint}
            style={{ marginRight: 'auto', color: 'var(--brand-secondary)' }}>
            <Printer size={16} /> Print Approval Form
          </button>
          <Link to="/capital-sanctions" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || mutation.isLoading}>
            <Save size={16} /> {isSubmitting || mutation.isLoading ? 'Sending...' : 'Send for Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}
