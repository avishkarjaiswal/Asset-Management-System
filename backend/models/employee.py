"""
Employee, Department, Location, Branch models
"""
import uuid
from datetime import datetime, timezone
from extensions import db


class Branch(db.Model):
    __tablename__ = 'branches'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    pincode = db.Column(db.String(10))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    departments = db.relationship('Department', back_populates='branch', lazy='dynamic')
    locations = db.relationship('Location', back_populates='branch', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'pincode': self.pincode,
            'phone': self.phone,
            'email': self.email,
            'is_active': self.is_active,
        }


class Location(db.Model):
    __tablename__ = 'locations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)
    floor = db.Column(db.String(50))
    room = db.Column(db.String(50))
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    branch = db.relationship('Branch', back_populates='locations')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'branch_id': self.branch_id,
            'branch': self.branch.to_dict() if self.branch else None,
            'floor': self.floor,
            'room': self.room,
            'description': self.description,
            'is_active': self.is_active,
        }


class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    branch = db.relationship('Branch', back_populates='departments')
    manager = db.relationship('Employee', foreign_keys=[manager_id], post_update=True)
    employees = db.relationship('Employee', back_populates='department', foreign_keys='Employee.department_id', lazy='dynamic')
    assets = db.relationship('Asset', back_populates='department', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'branch_id': self.branch_id,
            'branch': self.branch.to_dict() if self.branch else None,
            'manager_id': self.manager_id,
            'parent_id': self.parent_id,
            'description': self.description,
            'is_active': self.is_active,
            'employee_count': self.employees.filter(Employee.status != 'terminated').count(),
            'asset_count': self.assets.count(),
        }


class Employee(db.Model):
    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()), nullable=False)
    employee_id = db.Column(db.String(20), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    alternate_phone = db.Column(db.String(20))
    photo = db.Column(db.String(500))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    designation = db.Column(db.String(150))
    manager_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True)
    joining_date = db.Column(db.Date)
    exit_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')  # active, inactive, on_leave, terminated
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    department = db.relationship('Department', back_populates='employees', foreign_keys=[department_id])
    manager = db.relationship('Employee', remote_side=[id], foreign_keys=[manager_id])
    location = db.relationship('Location')
    allocations = db.relationship('AssetAllocation', back_populates='employee', foreign_keys='AssetAllocation.employee_id', lazy='dynamic')
    complaints = db.relationship('Complaint', back_populates='employee', lazy='dynamic')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_active(self):
        return self.status == 'active'

    def to_dict(self):
        from models.allocation import AssetAllocation
        return {
            'id': self.id,
            'uuid': self.uuid,
            'employee_id': self.employee_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'photo': self.photo,
            'department_id': self.department_id,
            'department': self.department.to_dict() if self.department else None,
            'designation': self.designation,
            'manager_id': self.manager_id,
            'manager': {'id': self.manager.id, 'full_name': self.manager.full_name} if self.manager else None,
            'location': self.location.to_dict() if self.location else None,
            'joining_date': self.joining_date.isoformat() if self.joining_date else None,
            'exit_date': self.exit_date.isoformat() if self.exit_date else None,
            'status': self.status,
            'allocated_asset_count': self.allocations.filter(AssetAllocation.status.in_(['allocated', 'acknowledged'])).count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
