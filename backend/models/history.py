"""AssetHistory — immutable audit trail for every asset event"""
from datetime import datetime, timezone
from extensions import db


class AssetHistory(db.Model):
    __tablename__ = 'asset_history'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='CASCADE'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    # created, updated, allocated, returned, transferred, maintenance, repaired,
    # complaint, status_changed, condition_changed, scrapped, disposed
    event_date = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    description = db.Column(db.Text, nullable=False)
    old_value = db.Column(db.JSON)
    new_value = db.Column(db.JSON)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reference_id = db.Column(db.Integer)  # ID of related record (allocation_id, maintenance_id, etc.)
    reference_type = db.Column(db.String(50))  # allocation, return, transfer, maintenance, complaint
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset', back_populates='history')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'asset_id': self.asset_id,
            'event_type': self.event_type,
            'event_date': self.event_date.isoformat() if self.event_date else None,
            'description': self.description,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'performed_by': {
                'id': self.user.id,
                'full_name': self.user.full_name,
            } if self.user else None,
            'reference_id': self.reference_id,
            'reference_type': self.reference_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
