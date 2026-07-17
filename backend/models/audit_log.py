"""AuditLog model — tracks every user action system-wide"""
from datetime import datetime, timezone
from extensions import db


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    # create, update, delete, login, logout, approve, reject, allocate, return, transfer, export
    module = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer)
    entity_type = db.Column(db.String(50))
    description = db.Column(db.Text)
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    status = db.Column(db.String(10), default='success')  # success, failed
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'user': {
                'id': self.user.id,
                'full_name': self.user.full_name,
                'email': self.user.email,
            } if self.user else None,
            'action': self.action,
            'module': self.module,
            'entity_id': self.entity_id,
            'entity_type': self.entity_type,
            'description': self.description,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
