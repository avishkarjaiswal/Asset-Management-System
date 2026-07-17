"""Maintenance and AMCContract models"""
from datetime import datetime, timezone
from extensions import db


class Maintenance(db.Model):
    __tablename__ = 'maintenance'

    id = db.Column(db.Integer, primary_key=True)
    maintenance_number = db.Column(db.String(30), unique=True, nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='RESTRICT'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True)

    maintenance_type = db.Column(db.String(30))  # repair, preventive, amc, inspection, upgrade
    status = db.Column(db.String(20), default='open')
    # open, assigned, in_progress, completed, cancelled

    reported_date = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    scheduled_date = db.Column(db.Date)
    completion_date = db.Column(db.Date)
    next_service_date = db.Column(db.Date)

    problem_description = db.Column(db.Text, nullable=False)
    work_done = db.Column(db.Text)
    parts_replaced = db.Column(db.JSON, default=list)

    technician_name = db.Column(db.String(150))
    technician_phone = db.Column(db.String(20))

    cost = db.Column(db.Numeric(10, 2), default=0)
    invoice_number = db.Column(db.String(100))
    invoice_file = db.Column(db.String(500))

    condition_before = db.Column(db.String(20))
    condition_after = db.Column(db.String(20))

    is_under_warranty = db.Column(db.Boolean, default=False)
    is_under_amc = db.Column(db.Boolean, default=False)

    reported_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    asset = db.relationship('Asset', back_populates='maintenance_records')
    vendor = db.relationship('Vendor')

    def to_dict(self):
        return {
            'id': self.id,
            'maintenance_number': self.maintenance_number,
            'asset_id': self.asset_id,
            'asset': {
                'id': self.asset.id,
                'asset_tag': self.asset.asset_tag,
                'asset_name': self.asset.asset_name,
            } if self.asset else None,
            'vendor': {'id': self.vendor.id, 'name': self.vendor.name} if self.vendor else None,
            'maintenance_type': self.maintenance_type,
            'status': self.status,
            'reported_date': self.reported_date.isoformat() if self.reported_date else None,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'next_service_date': self.next_service_date.isoformat() if self.next_service_date else None,
            'problem_description': self.problem_description,
            'work_done': self.work_done,
            'parts_replaced': self.parts_replaced or [],
            'technician_name': self.technician_name,
            'cost': float(self.cost) if self.cost else 0,
            'invoice_number': self.invoice_number,
            'is_under_warranty': self.is_under_warranty,
            'is_under_amc': self.is_under_amc,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AMCContract(db.Model):
    __tablename__ = 'amc_contracts'

    id = db.Column(db.Integer, primary_key=True)
    contract_number = db.Column(db.String(50), unique=True, nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='RESTRICT'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='CASCADE'), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(12, 2))
    coverage = db.Column(db.Text)
    terms = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    vendor = db.relationship('Vendor')

    def to_dict(self):
        return {
            'id': self.id,
            'contract_number': self.contract_number,
            'vendor': {'id': self.vendor.id, 'name': self.vendor.name} if self.vendor else None,
            'asset_id': self.asset_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'amount': float(self.amount) if self.amount else 0,
            'coverage': self.coverage,
            'is_active': self.is_active,
        }
