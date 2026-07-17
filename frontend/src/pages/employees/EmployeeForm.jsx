import React, { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function EmployeeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { status: 'active' }
  })

  // Fetch employee if editing
  const { data: emp, isLoading: empLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  // Fetch lookups
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) })
  const { data: employees } = useQuery({ queryKey: ['all-employees'], queryFn: () => api.get('/employees', { params: { per_page: 500 } }).then(r => r.data.items) })

  useEffect(() => {
    if (emp) {
      reset({
        employee_id: emp.employee_id || '',
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        department_name: emp.department?.name || '',
        designation: emp.designation || '',
        status: emp.status || 'active',
        joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
      })
    }
  }, [emp, reset])

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/employees/${id}`, data) : api.post('/employees', data),
    onSuccess: (res) => {
      toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully!`)
      qc.invalidateQueries(['employees'])
      navigate(isEdit ? `/employees/${id}` : '/employees')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save employee')
    }
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (!payload.department_name) delete payload.department_name
    saveMutation.mutate(payload)
  }

  if (isEdit && empLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to={isEdit ? `/employees/${id}` : '/employees'} className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
        <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ maxWidth: 800 }}>
        <div style={{ padding: 24 }}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Personal Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Employee ID *</label>
              <input className="form-control" {...register('employee_id', { required: 'Employee ID is required' })} disabled={isEdit} placeholder="e.g. GPPL-001" />
              {errors.employee_id && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.employee_id.message}</span>}
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" className="form-control" {...register('email', { required: 'Email is required' })} placeholder="e.g. employee@gppl.in" />
              {errors.email && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label>First Name *</label>
              <input className="form-control" {...register('first_name', { required: 'First Name is required' })} />
              {errors.first_name && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.first_name.message}</span>}
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input className="form-control" {...register('last_name', { required: 'Last Name is required' })} />
              {errors.last_name && <span style={{ color: 'var(--brand-danger)', fontSize: '0.75rem' }}>{errors.last_name.message}</span>}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-control" {...register('phone')} />
            </div>
            
            <div className="form-group">
              <label>Joining Date</label>
              <input type="date" className="form-control" {...register('joining_date')} />
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Employment Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" {...register('department_name')}>
                <option value="">-- Select Department --</option>
                {departments?.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Designation</label>
              <input className="form-control" {...register('designation')} placeholder="e.g. Software Engineer" />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-control" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <Link to={isEdit ? `/employees/${id}` : '/employees'} className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMutation.isLoading}>
            <Save size={16} /> {isEdit ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  )
}
