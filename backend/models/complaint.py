"""Complaint and ComplaintUpdate models"""
from datetime import datetime, timezone
from extensions import db


class Complaint(db.Model):
    __tablename__ = 'complaints'

    id = db.Column(db.Integer, primary_key=True)
    complaint_number = db.Column(db.String(30), unique=True, nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='RESTRICT'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='RESTRICT'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(10), default='medium')  # low, medium, high, critical
    status = db.Column(db.String(20), default='open')
    # open, assigned, in_progress, resolved, closed, reopened

    category = db.Column(db.String(50))  # hardware, software, network, other
    resolution = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime(timezone=True))
    closed_at = db.Column(db.DateTime(timezone=True))
    due_date = db.Column(db.Date)

    attachments = db.Column(db.JSON, default=list)
    sla_breach = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Integer)  # 1-5 satisfaction rating
    feedback = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset', back_populates='complaints')
    employee = db.relationship('Employee', back_populates='complaints')
    assignee = db.relationship('User')
    updates = db.relationship('ComplaintUpdate', back_populates='complaint', cascade='all, delete-orphan', lazy='subquery', order_by='ComplaintUpdate.created_at')

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_number': self.complaint_number,
            'asset_id': self.asset_id,
            'asset': {
                'id': self.asset.id,
                'asset_tag': self.asset.asset_tag,
                'asset_name': self.asset.asset_name,
            } if self.asset else None,
            'employee': {
                'id': self.employee.id,
                'full_name': self.employee.full_name,
                'employee_id': self.employee.employee_id,
            } if self.employee else None,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'category': self.category,
            'resolution': self.resolution,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'sla_breach': self.sla_breach,
            'rating': self.rating,
            'updates': [u.to_dict() for u in self.updates],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ComplaintUpdate(db.Model):
    __tablename__ = 'complaint_updates'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    status_from = db.Column(db.String(20))
    status_to = db.Column(db.String(20))
    message = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    complaint = db.relationship('Complaint', back_populates='updates')
    updater = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'status_from': self.status_from,
            'status_to': self.status_to,
            'message': self.message,
            'is_internal': self.is_internal,
            'updated_by': {'id': self.updater.id, 'full_name': self.updater.full_name} if self.updater else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
