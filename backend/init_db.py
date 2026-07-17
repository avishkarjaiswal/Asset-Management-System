import os
import sys
from app import create_app
from extensions import db
from models.user import Role, User, Permission
from models.employee import Department, Employee
from models.asset import AssetCategory, Asset

# ensure we load everything
import models

def seed_db(app_instance=None):
    print("Initializing Database...")
    
    def _do_seed():
        # Create all tables
        db.create_all()
        
        # Check if already seeded
        if Role.query.first():
            print("Database already seeded.")
            return

        # Roles
        super_admin = Role(name='super_admin', display_name='Super Admin', description='Full system access')
        it_admin = Role(name='it_admin', display_name='IT Admin', description='Manage IT assets')
        hr = Role(name='hr', display_name='Human Resources', description='Manage employees')
        dept_head = Role(name='department_head', display_name='Department Head', description='Manage department')
        employee_role = Role(name='employee', display_name='Employee', description='Standard employee')
        
        db.session.add_all([super_admin, it_admin, hr, dept_head, employee_role])
        db.session.commit()

        # Admin User
        import bcrypt
        hashed = bcrypt.hashpw(b"Admin@1234", bcrypt.gensalt()).decode('utf-8')
        admin = User(
            email='admin@gppl.in',
            password_hash=hashed,
            first_name='System',
            last_name='Admin',
            role_id=super_admin.id,
            is_active=True,
            is_email_verified=True
        )
        db.session.add(admin)
        db.session.commit()

        # Department
        it_dept = Department(name='IT', code='IT01')
        hr_dept = Department(name='HR', code='HR01')
        db.session.add_all([it_dept, hr_dept])
        db.session.commit()

        # Categories
        laptop_cat = AssetCategory(name='Laptops', code='LPT', description='Company Laptops')
        db.session.add(laptop_cat)
        db.session.commit()

        print("Seeding successful! Admin email: admin@gppl.in / Password: Admin@1234")

    if app_instance is None:
        app_instance = create_app()
        with app_instance.app_context():
            _do_seed()
    else:
        _do_seed()

if __name__ == '__main__':
    seed_db()
