"""
Vendor model
"""
from datetime import datetime, timezone
from extensions import db


class Vendor(db.Model):
    __tablename__ = 'vendors'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(30), unique=True, nullable=False)
    contact_person = db.Column(db.String(150))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    alternate_phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    pincode = db.Column(db.String(10))
    gst_number = db.Column(db.String(20))
    pan_number = db.Column(db.String(15))
    website = db.Column(db.String(255))
    category = db.Column(db.String(50))  # hardware, software, amc, furniture, etc.
    rating = db.Column(db.Integer, default=0)  # 1-5
    bank_name = db.Column(db.String(150))
    bank_account = db.Column(db.String(50))
    bank_ifsc = db.Column(db.String(20))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    assets = db.relationship('Asset', back_populates='vendor', foreign_keys='Asset.vendor_id', lazy='dynamic')
    purchase_orders = db.relationship('PurchaseOrder', back_populates='vendor', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'contact_person': self.contact_person,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'gst_number': self.gst_number,
            'pan_number': self.pan_number,
            'website': self.website,
            'category': self.category,
            'rating': self.rating,
            'is_active': self.is_active,
            'purchase_count': self.purchase_orders.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
