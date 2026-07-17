"""
Capital Sanction Model
"""
from datetime import datetime, timezone
from extensions import db


class CapitalSanction(db.Model):
    __tablename__ = 'capital_sanctions'

    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(255), nullable=False)
    item_description = db.Column(db.Text, nullable=False)
    specification = db.Column(db.Text)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    supplier_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    justification = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    officer_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    
    status = db.Column(db.String(30), default='pending')  # pending, approved, rejected
    approval_members = db.Column(db.JSON, default=list)  # list of names or employee IDs
    
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    supplier = db.relationship('Vendor', foreign_keys=[supplier_id])
    department = db.relationship('Department', foreign_keys=[department_id])
    officer = db.relationship('Employee', foreign_keys=[officer_id])

    def to_dict(self):
        return {
            'id': self.id,
            'subject': self.subject,
            'item_description': self.item_description,
            'specification': self.specification,
            'quantity': self.quantity,
            'supplier_id': self.supplier_id,
            'supplier': {
                'id': self.supplier.id,
                'name': self.supplier.name,
            } if self.supplier else None,
            'department_id': self.department_id,
            'department': {
                'id': self.department.id,
                'name': self.department.name,
            } if self.department else None,
            'justification': self.justification,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'officer_id': self.officer_id,
            'officer': {
                'id': self.officer.id,
                'full_name': self.officer.full_name,
            } if self.officer else None,
            'status': self.status,
            'approval_members': self.approval_members or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
