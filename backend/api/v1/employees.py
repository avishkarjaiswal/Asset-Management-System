"""
Employees API — CRUD, allocated assets, history
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from extensions import db
from models.employee import Employee, Department, Location, Branch
from models.allocation import AssetAllocation
from middleware.audit_middleware import log_action
from utils import parse_date

employees_bp = Blueprint('employees', __name__)


def _paginate(query, page, per_page):
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [e.to_dict() for e in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
        'per_page': per_page,
    }


@employees_bp.route('', methods=['GET'])
@jwt_required()
def list_employees():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '')
    department_name = request.args.get('department_name')
    status = request.args.get('status')

    query = Employee.query
    if search:
        query = query.filter(or_(
            Employee.first_name.ilike(f'%{search}%'),
            Employee.last_name.ilike(f'%{search}%'),
            Employee.employee_id.ilike(f'%{search}%'),
            Employee.email.ilike(f'%{search}%'),
            Employee.designation.ilike(f'%{search}%'),
        ))
    if department_name:
        query = query.join(Department, Employee.department_id == Department.id).filter(db.func.lower(Department.name) == department_name.lower())
    if status:
        query = query.filter_by(status=status)
    else:
        query = query.filter_by(status='active')

    query = query.order_by(Employee.first_name)
    return jsonify(_paginate(query, page, per_page)), 200


@employees_bp.route('/<int:emp_id>', methods=['GET'])
@jwt_required()
def get_employee(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    data = emp.to_dict()
    # Include current allocations
    allocs = emp.allocations.filter(AssetAllocation.status.in_(['allocated', 'acknowledged'])).all()
    data['allocated_assets'] = [a.to_dict() for a in allocs]
    return jsonify(data), 200


@employees_bp.route('', methods=['POST'])
@jwt_required()
def create_employee():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data.get('employee_id') or not data.get('email'):
        return jsonify({'error': 'employee_id and email are required'}), 400

    existing_id = Employee.query.filter_by(employee_id=data['employee_id']).first()
    existing_email = Employee.query.filter_by(email=data['email']).first()
    
    # If the exact same employee exists and is terminated, we can reactivate and update them
    existing_emp = existing_id or existing_email
    
    if existing_emp:
        if existing_emp.status != 'terminated':
            if existing_id and existing_id.status != 'terminated':
                return jsonify({'error': 'Employee ID already exists and is active'}), 409
            if existing_email and existing_email.status != 'terminated':
                return jsonify({'error': 'Email already exists and is active'}), 409
        else:
            # Reactivate and update the terminated employee
            department_id = data.get('department_id')
            department_name = data.get('department_name')
            if department_name:
                dept = Department.query.filter(db.func.lower(Department.name) == department_name.lower()).first()
                if not dept:
                    dept = Department(name=department_name, code=department_name[:4].upper() + str(len(department_name)))
                    db.session.add(dept)
                    db.session.flush()
                department_id = dept.id

            existing_emp.status = 'active'
            existing_emp.first_name = data['first_name']
            existing_emp.last_name = data['last_name']
            existing_emp.email = data['email']
            existing_emp.employee_id = data['employee_id']
            existing_emp.phone = data.get('phone')
            existing_emp.department_id = department_id
            existing_emp.designation = data.get('designation')
            existing_emp.location_id = data.get('location_id')
            if data.get('joining_date'):
                existing_emp.joining_date = parse_date(data.get('joining_date'))
            
            db.session.commit()
            log_action('update', 'employees', f'Reactivated employee {existing_emp.employee_id}', entity_id=existing_emp.id, entity_type='employee', user_id=user_id)
            return jsonify(existing_emp.to_dict()), 201

    department_id = data.get('department_id')
    department_name = data.get('department_name')
    if department_name:
        dept = Department.query.filter(db.func.lower(Department.name) == department_name.lower()).first()
        if not dept:
            dept = Department(name=department_name, code=department_name[:4].upper() + str(len(department_name)))
            db.session.add(dept)
            db.session.flush()
        department_id = dept.id

    emp = Employee(
        employee_id=data['employee_id'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        phone=data.get('phone'),
        department_id=department_id,
        designation=data.get('designation'),
        manager_id=data.get('manager_id'),
        location_id=data.get('location_id'),
        joining_date=parse_date(data.get('joining_date')),
        status=data.get('status', 'active'),
        address=data.get('address'),
        emergency_contact=data.get('emergency_contact'),
    )
    db.session.add(emp)
    db.session.commit()
    log_action('create', 'employees', f'Created employee {emp.employee_id}', entity_id=emp.id, entity_type='employee', user_id=user_id)
    return jsonify(emp.to_dict()), 201


@employees_bp.route('/<int:emp_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_employee(emp_id):
    user_id = get_jwt_identity()
    emp = Employee.query.get_or_404(emp_id)
    data = request.get_json()
    updatable = ['first_name', 'last_name', 'email', 'phone', 'alternate_phone',
                 'department_id', 'designation', 'manager_id', 'location_id',
                 'joining_date', 'exit_date', 'status', 'address', 'emergency_contact', 'photo']
                 
    if 'department_name' in data:
        department_name = data['department_name']
        if department_name:
            dept = Department.query.filter(db.func.lower(Department.name) == department_name.lower()).first()
            if not dept:
                dept = Department(name=department_name, code=department_name[:4].upper() + str(len(department_name)))
                db.session.add(dept)
                db.session.flush()
            data['department_id'] = dept.id
        else:
            data['department_id'] = None

    for field in updatable:
        if field in data:
            if field in ['joining_date', 'exit_date']:
                setattr(emp, field, parse_date(data[field]))
            else:
                setattr(emp, field, data[field])
    db.session.commit()
    log_action('update', 'employees', f'Updated employee {emp.employee_id}', entity_id=emp.id, entity_type='employee', user_id=user_id)
    return jsonify(emp.to_dict()), 200


@employees_bp.route('/<int:emp_id>', methods=['DELETE'])
@jwt_required()
def delete_employee(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    if emp.allocations.filter(AssetAllocation.status.in_(['allocated', 'acknowledged'])).count() > 0:
        return jsonify({'error': 'Employee has active allocations. Return all assets first.'}), 400
    emp.status = 'terminated'
    db.session.commit()
    return jsonify({'message': 'Employee deactivated'}), 200


@employees_bp.route('/<int:emp_id>/asset-history', methods=['GET'])
@jwt_required()
def employee_asset_history(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    allocs = AssetAllocation.query.filter_by(employee_id=emp_id)\
        .order_by(AssetAllocation.created_at.desc()).all()
    return jsonify([a.to_dict() for a in allocs]), 200


@employees_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    import io, csv
    from flask import send_file
    time_range = request.args.get('time_range', 'lifetime')
    query = Employee.query
    
    if time_range != 'lifetime':
        from datetime import datetime, timedelta, timezone
        days = int(time_range)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Employee.created_at >= cutoff)
        
    employees = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Employee ID', 'Email Address', 'First Name', 'Last Name',
        'Phone Number', 'Joining Date', 'Department', 'Designation', 'Status'
    ])
    for emp in employees:
        writer.writerow([
            emp.employee_id, emp.email, emp.first_name, emp.last_name,
            emp.phone, emp.joining_date,
            emp.department.name if emp.department else '',
            emp.designation, emp.status
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='gppl_employees.csv'
    )

@employees_bp.route('/import/template', methods=['GET'])
@jwt_required()
def import_template():
    import io
    import pandas as pd
    from flask import send_file
    
    columns = [
        'Employee ID', 'Email Address', 'First Name', 'Last Name', 
        'Phone Number', 'Joining Date', 'Department', 'Designation'
    ]
    df = pd.DataFrame(columns=columns)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Employees')
        worksheet = writer.sheets['Employees']
        for i, col in enumerate(columns):
            worksheet.column_dimensions[chr(65 + i)].width = max(len(col) + 5, 15)
            
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='employee_import_schema.xlsx'
    )

@employees_bp.route('/import/excel', methods=['POST'])
@jwt_required()
def import_excel():
    import pandas as pd
    from sqlalchemy.exc import IntegrityError
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        required_cols = ['Employee ID', 'First Name', 'Last Name', 'Email Address']
        for col in required_cols:
            if col not in df.columns:
                return jsonify({'error': f'Missing required column: {col}'}), 400
                
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        
        seen_emp_ids = set()
        
        for index, row in df.iterrows():
            emp_id = row.get('Employee ID')
            if not emp_id or pd.isna(emp_id):
                skipped_count += 1
                continue
                
            emp_id_str = str(emp_id).strip()
            if emp_id_str in seen_emp_ids:
                skipped_count += 1
                continue
            seen_emp_ids.add(emp_id_str)
            
            first_name = str(row.get('First Name')).strip() if pd.notna(row.get('First Name')) else 'Unknown'
            last_name = str(row.get('Last Name')).strip() if pd.notna(row.get('Last Name')) else 'Unknown'
            email = str(row.get('Email Address')).strip() if pd.notna(row.get('Email Address')) else f"{emp_id_str}@example.com"
            
            # Lookup or create department
            dept_name = row.get('Department')
            dept_id = None
            if dept_name and pd.notna(dept_name):
                dept_name_str = str(dept_name).strip()
                dept = Department.query.filter(Department.name.ilike(dept_name_str)).first()
                if not dept:
                    base_code = dept_name_str[:4].upper()
                    code = base_code
                    counter = 1
                    while Department.query.filter_by(code=code).first():
                        code = f"{base_code[:3]}{counter}"
                        counter += 1
                    dept = Department(name=dept_name_str, code=code)
                    db.session.add(dept)
                    db.session.flush()
                dept_id = dept.id
                
            status_val = str(row.get('Status')).strip().lower() if pd.notna(row.get('Status')) else 'active'
            if status_val not in ('active', 'inactive', 'on_leave', 'terminated'):
                status_val = 'active'
                
            existing_emp = Employee.query.filter_by(employee_id=emp_id_str).first()
            if not existing_emp:
                # Check email uniqueness across other users
                if Employee.query.filter_by(email=email).first():
                    # Modify email to prevent crash if duplicate email exists for new employee
                    email = f"{emp_id_str}_{email}"
                    
                emp = Employee(
                    employee_id=emp_id_str,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    phone=str(row.get('Phone Number')).strip() if pd.notna(row.get('Phone Number')) else None,
                    department_id=dept_id,
                    designation=str(row.get('Designation')).strip() if pd.notna(row.get('Designation')) else None,
                    joining_date=parse_date(row.get('Joining Date')) if pd.notna(row.get('Joining Date')) else None,
                    status=status_val
                )
                db.session.add(emp)
                imported_count += 1
            else:
                # Upsert existing
                existing_emp.first_name = first_name
                existing_emp.last_name = last_name
                
                # Update email only if unique
                if existing_emp.email != email:
                    if not Employee.query.filter_by(email=email).first():
                        existing_emp.email = email
                        
                if pd.notna(row.get('Phone Number')): existing_emp.phone = str(row.get('Phone Number')).strip()
                if dept_id: existing_emp.department_id = dept_id
                if pd.notna(row.get('Designation')): existing_emp.designation = str(row.get('Designation')).strip()
                if pd.notna(row.get('Joining Date')): existing_emp.joining_date = parse_date(row.get('Joining Date'))
                if pd.notna(row.get('Status')): existing_emp.status = status_val
                updated_count += 1
                
        db.session.commit()
        return jsonify({
            'message': 'Import completed successfully',
            'imported': imported_count,
            'updated': updated_count,
            'skipped': skipped_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


# ── Departments ─────────────────────────────────────────────────────────────

@employees_bp.route('/departments/all', methods=['GET'])
@jwt_required()
def list_all_departments():
    depts = Department.query.filter_by(is_active=True).order_by(Department.name).all()
    return jsonify([d.to_dict() for d in depts]), 200
