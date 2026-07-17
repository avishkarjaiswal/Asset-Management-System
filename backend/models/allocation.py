"""
AssetAllocation and AllocationApproval models
"""
from datetime import datetime, timezone
from extensions import db


class AssetAllocation(db.Model):
    __tablename__ = 'asset_allocations'

    id = db.Column(db.Integer, primary_key=True)
    allocation_number = db.Column(db.String(30), unique=True, nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='RESTRICT'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='RESTRICT'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)

    status = db.Column(db.String(30), default='pending')
    # pending, manager_approved, it_approved, allocated, acknowledged, returned, rejected, cancelled

    request_date = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    allocation_date = db.Column(db.DateTime(timezone=True))
    expected_return_date = db.Column(db.Date)
    actual_return_date = db.Column(db.Date)

    purpose = db.Column(db.Text)
    accessories = db.Column(db.JSON, default=list)  # list of accessories handed over
    handover_condition = db.Column(db.String(20), default='good')

    # Acknowledgement
    acknowledged_at = db.Column(db.DateTime(timezone=True))
    acknowledgement_signature = db.Column(db.Text)  # base64 digital signature

    # Certificate PDF
    certificate_path = db.Column(db.String(500))

    requested_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset', back_populates='allocations')
    employee = db.relationship('Employee', back_populates='allocations', foreign_keys=[employee_id])
    approvals = db.relationship('AllocationApproval', back_populates='allocation', cascade='all, delete-orphan', lazy='subquery')

    def to_dict(self):
        return {
            'id': self.id,
            'allocation_number': self.allocation_number,
            'asset_id': self.asset_id,
            'asset': {
                'id': self.asset.id,
                'asset_tag': self.asset.asset_tag,
                'asset_name': self.asset.asset_name,
                'brand': self.asset.brand,
                'model': self.asset.model,
                'primary_image': self.asset.primary_image,
            } if self.asset else None,
            'employee_id': self.employee_id,
            'employee': {
                'id': self.employee.id,
                'full_name': self.employee.full_name,
                'employee_id': self.employee.employee_id,
                'department': self.employee.department.name if self.employee.department else None,
            } if self.employee else None,
            'status': self.status,
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'allocation_date': self.allocation_date.isoformat() if self.allocation_date else None,
            'expected_return_date': self.expected_return_date.isoformat() if self.expected_return_date else None,
            'purpose': self.purpose,
            'accessories': self.accessories or [],
            'handover_condition': self.handover_condition,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'notes': self.notes,
            'approvals': [a.to_dict() for a in self.approvals],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AllocationApproval(db.Model):
    __tablename__ = 'allocation_approvals'

    id = db.Column(db.Integer, primary_key=True)
    allocation_id = db.Column(db.Integer, db.ForeignKey('asset_allocations.id', ondelete='CASCADE'), nullable=False)
    approver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approval_level = db.Column(db.String(30))  # manager, it_admin, store_manager
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    comments = db.Column(db.Text)
    decided_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    allocation = db.relationship('AssetAllocation', back_populates='approvals')
    approver = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'allocation_id': self.allocation_id,
            'approval_level': self.approval_level,
            'status': self.status,
            'comments': self.comments,
            'approver': {
                'id': self.approver.id,
                'full_name': self.approver.full_name,
            } if self.approver else None,
            'decided_at': self.decided_at.isoformat() if self.decided_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
