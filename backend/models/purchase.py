"""
PurchaseOrder, PurchaseItem models
"""
from datetime import datetime, timezone
from extensions import db


class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'

    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(50), unique=True, nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='RESTRICT'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(30), default='draft')
    # draft, pending_approval, approved, ordered, partially_received, received, cancelled

    order_date = db.Column(db.Date)
    expected_delivery = db.Column(db.Date)
    actual_delivery = db.Column(db.Date)

    subtotal = db.Column(db.Numeric(14, 2), default=0)
    gst_amount = db.Column(db.Numeric(14, 2), default=0)
    discount = db.Column(db.Numeric(14, 2), default=0)
    total_amount = db.Column(db.Numeric(14, 2), default=0)
    currency = db.Column(db.String(5), default='INR')

    invoice_number = db.Column(db.String(100))
    invoice_date = db.Column(db.Date)
    invoice_file = db.Column(db.String(500))

    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = db.Column(db.DateTime(timezone=True))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text)
    shipping_address = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vendor = db.relationship('Vendor', back_populates='purchase_orders')
    items = db.relationship('PurchaseItem', back_populates='purchase_order', cascade='all, delete-orphan', lazy='subquery')

    def to_dict(self):
        return {
            'id': self.id,
            'po_number': self.po_number,
            'vendor_id': self.vendor_id,
            'vendor': {'id': self.vendor.id, 'name': self.vendor.name} if self.vendor else None,
            'status': self.status,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'expected_delivery': self.expected_delivery.isoformat() if self.expected_delivery else None,
            'actual_delivery': self.actual_delivery.isoformat() if self.actual_delivery else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'gst_amount': float(self.gst_amount) if self.gst_amount else 0,
            'discount': float(self.discount) if self.discount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'currency': self.currency,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date.isoformat() if self.invoice_date else None,
            'notes': self.notes,
            'items': [item.to_dict() for item in self.items],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PurchaseItem(db.Model):
    __tablename__ = 'purchase_items'

    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='SET NULL'), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('asset_categories.id', ondelete='SET NULL'), nullable=True)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    quantity_received = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    gst_rate = db.Column(db.Numeric(5, 2), default=18)
    total_price = db.Column(db.Numeric(12, 2))
    hsn_code = db.Column(db.String(20))
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    purchase_order = db.relationship('PurchaseOrder', back_populates='items')

    def to_dict(self):
        return {
            'id': self.id,
            'purchase_order_id': self.purchase_order_id,
            'asset_id': self.asset_id,
            'category_id': self.category_id,
            'description': self.description,
            'quantity': self.quantity,
            'quantity_received': self.quantity_received,
            'unit_price': float(self.unit_price) if self.unit_price else 0,
            'gst_rate': float(self.gst_rate) if self.gst_rate else 0,
            'total_price': float(self.total_price) if self.total_price else 0,
            'hsn_code': self.hsn_code,
            'remarks': self.remarks,
        }
