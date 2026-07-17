"""
AssetReturn, ReturnItem models
"""
from datetime import datetime, timezone
from extensions import db


class AssetReturn(db.Model):
    __tablename__ = 'asset_returns'

    id = db.Column(db.Integer, primary_key=True)
    return_number = db.Column(db.String(30), unique=True, nullable=False)
    allocation_id = db.Column(db.Integer, db.ForeignKey('asset_allocations.id', ondelete='RESTRICT'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='RESTRICT'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='RESTRICT'), nullable=False)

    status = db.Column(db.String(20), default='pending')
    # pending, it_verified, approved, completed, rejected

    return_date = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    condition_on_return = db.Column(db.String(20), default='good')
    accessories_returned = db.Column(db.JSON, default=list)
    accessories_missing = db.Column(db.JSON, default=list)

    damage_description = db.Column(db.Text)
    damage_photos = db.Column(db.JSON, default=list)
    damage_cost = db.Column(db.Numeric(10, 2), default=0)

    it_verified_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    it_verified_at = db.Column(db.DateTime(timezone=True))
    it_remarks = db.Column(db.Text)

    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime(timezone=True))

    initiated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset')
    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'return_number': self.return_number,
            'allocation_id': self.allocation_id,
            'asset_id': self.asset_id,
            'asset': {
                'id': self.asset.id,
                'asset_tag': self.asset.asset_tag,
                'asset_name': self.asset.asset_name,
            } if self.asset else None,
            'employee_id': self.employee_id,
            'employee': {
                'id': self.employee.id,
                'full_name': self.employee.full_name,
                'employee_id': self.employee.employee_id,
            } if self.employee else None,
            'status': self.status,
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'condition_on_return': self.condition_on_return,
            'accessories_returned': self.accessories_returned or [],
            'accessories_missing': self.accessories_missing or [],
            'damage_description': self.damage_description,
            'damage_cost': float(self.damage_cost) if self.damage_cost else 0,
            'damage_photos': self.damage_photos or [],
            'it_remarks': self.it_remarks,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ReturnItem(db.Model):
    """Individual accessory items in a return checklist."""
    __tablename__ = 'return_items'

    id = db.Column(db.Integer, primary_key=True)
    return_id = db.Column(db.Integer, db.ForeignKey('asset_returns.id', ondelete='CASCADE'), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    expected = db.Column(db.Boolean, default=True)
    returned = db.Column(db.Boolean, default=False)
    condition = db.Column(db.String(20))
    remarks = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'expected': self.expected,
            'returned': self.returned,
            'condition': self.condition,
            'remarks': self.remarks,
        }
