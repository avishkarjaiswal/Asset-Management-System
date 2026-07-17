import os
import random
from datetime import datetime, timedelta, timezone
from app import create_app
from extensions import db
from models.user import Role, User
from models.employee import Department, Employee
from models.asset import AssetCategory, Asset
from models.allocation import AssetAllocation
from models.history import AssetHistory
from models.vendor import Vendor
import bcrypt

def add_dummy_data():
    print("Generating comprehensive dummy data for GPPL EAMS...")
    app = create_app()
    with app.app_context():
        
        # 1. Departments (Ensure they exist)
        it_dept = Department.query.filter_by(code='IT01').first()
        hr_dept = Department.query.filter_by(code='HR01').first()
        if not it_dept:
            it_dept = Department(name='IT Department', code='IT01')
            db.session.add(it_dept)
        if not hr_dept:
            hr_dept = Department(name='Human Resources', code='HR01')
            db.session.add(hr_dept)
            
        sales_dept = Department.query.filter_by(code='SLS01').first()
        if not sales_dept:
            sales_dept = Department(name='Sales & Marketing', code='SLS01')
            db.session.add(sales_dept)
            
        ops_dept = Department.query.filter_by(code='OPS01').first()
        if not ops_dept:
            ops_dept = Department(name='Operations', code='OPS01')
            db.session.add(ops_dept)
            
        db.session.commit()

        # 2. Employees
        employees_data = [
            ('GPPL-002', 'Ravi', 'Sharma', 'ravi.sharma@gppl.in', it_dept.id, 'System Administrator'),
            ('GPPL-003', 'Priya', 'Patel', 'priya.p@gppl.in', hr_dept.id, 'HR Manager'),
            ('GPPL-004', 'Amit', 'Kumar', 'amit.k@gppl.in', sales_dept.id, 'Sales Executive'),
            ('GPPL-005', 'Neha', 'Singh', 'neha.s@gppl.in', ops_dept.id, 'Operations Manager'),
            ('GPPL-006', 'Vikram', 'Rathore', 'vikram.r@gppl.in', it_dept.id, 'Network Engineer'),
            ('GPPL-007', 'Anita', 'Desai', 'anita.d@gppl.in', sales_dept.id, 'Marketing Lead'),
        ]
        
        employee_objs = []
        for emp_id, fname, lname, email, dept_id, desig in employees_data:
            emp = Employee.query.filter_by(employee_id=emp_id).first()
            if not emp:
                emp = Employee(
                    employee_id=emp_id, first_name=fname, last_name=lname,
                    email=email, department_id=dept_id, designation=desig,
                    joining_date=(datetime.now(timezone.utc) - timedelta(days=random.randint(100, 1000))).date()
                )
                db.session.add(emp)
                employee_objs.append(emp)
        db.session.commit()
        
        # Add some regular user logins for these employees
        emp_role = Role.query.filter_by(name='employee').first()
        hashed_pw = bcrypt.hashpw(b"User@1234", bcrypt.gensalt()).decode('utf-8')
        for emp in employee_objs:
            if not User.query.filter_by(email=emp.email).first():
                user = User(
                    email=emp.email, password_hash=hashed_pw,
                    first_name=emp.first_name, last_name=emp.last_name,
                    role_id=emp_role.id, employee_id=emp.id, is_active=True
                )
                db.session.add(user)
        db.session.commit()

        # 3. Vendors
        vendors = []
        for name, contact in [('Dell India Pvt Ltd', 'sales@dell.co.in'), ('Lenovo Enterprise', 'b2b@lenovo.in'), ('HP Business Solutions', 'corporate@hp.com')]:
            v = Vendor.query.filter_by(name=name).first()
            if not v:
                v = Vendor(name=name, code=f"VEND-{random.randint(100, 999)}", email=contact, is_active=True, contact_person='Account Manager')
                db.session.add(v)
            vendors.append(v)
        db.session.commit()

        # 4. Asset Categories
        cat_laptop = AssetCategory.query.filter_by(code='LPT').first()
        cat_monitor = AssetCategory(name='Monitors', code='MNT', description='External Displays')
        cat_mobile = AssetCategory(name='Mobile Devices', code='MOB', description='Phones and Tablets')
        cat_server = AssetCategory(name='Servers', code='SRV', description='Data Center Equipment')
        
        for cat in [cat_monitor, cat_mobile, cat_server]:
            if not AssetCategory.query.filter_by(code=cat.code).first():
                db.session.add(cat)
        db.session.commit()

        # 5. Assets
        # Create a mix of available, allocated, and in-maintenance assets
        admin_user = User.query.filter_by(email='admin@gppl.in').first()
        
        assets_to_create = [
            (cat_laptop.id, 'Dell Latitude 7420', 'LPT-2024-001', 'Dell', 'Latitude 7420', 85000, 'allocated'),
            (cat_laptop.id, 'Dell Latitude 7420', 'LPT-2024-002', 'Dell', 'Latitude 7420', 85000, 'available'),
            (cat_laptop.id, 'Lenovo ThinkPad X1', 'LPT-2024-003', 'Lenovo', 'ThinkPad X1 Carbon', 110000, 'allocated'),
            (cat_laptop.id, 'Lenovo ThinkPad T14', 'LPT-2024-004', 'Lenovo', 'ThinkPad T14', 75000, 'in_maintenance'),
            (cat_laptop.id, 'HP EliteBook 840', 'LPT-2024-005', 'HP', 'EliteBook 840 G8', 92000, 'allocated'),
            (cat_monitor.id, 'Dell UltraSharp 27"', 'MNT-2024-001', 'Dell', 'U2722D', 32000, 'allocated'),
            (cat_monitor.id, 'Dell UltraSharp 27"', 'MNT-2024-002', 'Dell', 'U2722D', 32000, 'available'),
            (cat_mobile.id, 'iPad Pro 11"', 'MOB-2024-001', 'Apple', 'iPad Pro 4th Gen', 89000, 'allocated'),
            (cat_server.id, 'PowerEdge R740', 'SRV-2023-001', 'Dell', 'PowerEdge R740', 450000, 'available'),
        ]

        created_assets = []
        for cat_id, name, tag, brand, model, cost, status in assets_to_create:
            if not Asset.query.filter_by(asset_tag=tag).first():
                a = Asset(
                    category_id=cat_id, asset_name=name, asset_tag=tag,
                    brand=brand, model=model, serial_number=f"SN-{random.randint(10000,99999)}",
                    purchase_cost=cost, status=status,
                    purchase_date=datetime.now(timezone.utc).date() - timedelta(days=random.randint(30, 300)),
                    warranty_end=datetime.now(timezone.utc).date() + timedelta(days=random.randint(100, 800)),
                    department_id=it_dept.id if status == 'available' else None,
                    is_active=True
                )
                db.session.add(a)
                created_assets.append(a)
        
        db.session.commit()

        # 6. Allocations & History
        # We allocated 4 assets above. Let's assign them to the employees we created.
        allocated_assets = [a for a in created_assets if a.status == 'allocated']
        employees_for_allocation = Employee.query.all()
        
        for i, asset in enumerate(allocated_assets):
            emp = employees_for_allocation[i % len(employees_for_allocation)]
            
            # Update asset
            asset.current_employee_id = emp.id
            asset.department_id = emp.department_id
            
            # Create Allocation Record
            alloc = AssetAllocation(
                allocation_number=f"ALC-{datetime.now().strftime('%Y%m')}-{random.randint(100,999)}",
                asset_id=asset.id,
                employee_id=emp.id,
                department_id=emp.department_id,
                status='active',
                allocation_date=datetime.now(timezone.utc) - timedelta(days=random.randint(5, 60)),
                purpose='Standard issue for role',
                requested_by=admin_user.id
            )
            db.session.add(alloc)
            
            # Add History
            hist = AssetHistory(
                asset_id=asset.id,
                event_type='allocated',
                description=f"Allocated to {emp.first_name} {emp.last_name} ({emp.employee_id})",
                performed_by=admin_user.id,
                event_date=alloc.allocation_date
            )
            db.session.add(hist)

        # For the one in maintenance
        maint_asset = next((a for a in created_assets if a.status == 'in_maintenance'), None)
        if maint_asset:
            hist = AssetHistory(
                asset_id=maint_asset.id,
                event_type='maintenance',
                description="Sent for screen repair under warranty",
                performed_by=admin_user.id,
                event_date=datetime.now(timezone.utc) - timedelta(days=2)
            )
            db.session.add(hist)

        db.session.commit()
        print("Dummy data successfully populated!")

if __name__ == '__main__':
    add_dummy_data()
