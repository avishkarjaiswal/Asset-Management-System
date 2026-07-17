"""AssetTransfer model"""
from datetime import datetime, timezone
from extensions import db


class AssetTransfer(db.Model):
    __tablename__ = 'asset_transfers'

    id = db.Column(db.Integer, primary_key=True)
    transfer_number = db.Column(db.String(30), unique=True, nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='RESTRICT'), nullable=False)

    transfer_type = db.Column(db.String(20))  # employee, department, branch, location

    from_employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    to_employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    from_department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    to_department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    from_location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True)
    to_location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True)
    from_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)
    to_branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)

    status = db.Column(db.String(20), default='pending')  # pending, approved, completed, rejected
    transfer_date = db.Column(db.DateTime(timezone=True))
    reason = db.Column(db.Text)
    condition_at_transfer = db.Column(db.String(20), default='good')
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime(timezone=True))
    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset')
    from_employee = db.relationship('Employee', foreign_keys=[from_employee_id])
    to_employee = db.relationship('Employee', foreign_keys=[to_employee_id])

    def to_dict(self):
        return {
            'id': self.id,
            'transfer_number': self.transfer_number,
            'asset_id': self.asset_id,
            'asset': {'id': self.asset.id, 'asset_tag': self.asset.asset_tag, 'asset_name': self.asset.asset_name} if self.asset else None,
            'transfer_type': self.transfer_type,
            'from_employee': {'id': self.from_employee.id, 'full_name': self.from_employee.full_name} if self.from_employee else None,
            'to_employee': {'id': self.to_employee.id, 'full_name': self.to_employee.full_name} if self.to_employee else None,
            'from_department_id': self.from_department_id,
            'to_department_id': self.to_department_id,
            'status': self.status,
            'transfer_date': self.transfer_date.isoformat() if self.transfer_date else None,
            'reason': self.reason,
            'condition_at_transfer': self.condition_at_transfer,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
