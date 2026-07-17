"""
Asset, AssetCategory, AssetSubcategory models
"""
import uuid
from datetime import datetime, timezone, date
from extensions import db


class AssetCategory(db.Model):
    __tablename__ = 'asset_categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    icon = db.Column(db.String(50), default='package')
    description = db.Column(db.Text)
    depreciation_rate = db.Column(db.Numeric(5, 2), default=0)  # % per year
    useful_life_years = db.Column(db.Integer, default=5)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    subcategories = db.relationship('AssetSubcategory', back_populates='category', lazy='dynamic')
    assets = db.relationship('Asset', back_populates='category', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'icon': self.icon,
            'description': self.description,
            'depreciation_rate': float(self.depreciation_rate) if self.depreciation_rate else 0,
            'useful_life_years': self.useful_life_years,
            'is_active': self.is_active,
            'asset_count': self.assets.count(),
        }


class AssetSubcategory(db.Model):
    __tablename__ = 'asset_subcategories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('asset_categories.id', ondelete='CASCADE'), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    category = db.relationship('AssetCategory', back_populates='subcategories')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'category_id': self.category_id,
            'description': self.description,
            'is_active': self.is_active,
        }


class Asset(db.Model):
    __tablename__ = 'assets'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()), nullable=False)

    # Identification
    asset_tag = db.Column(db.String(50), unique=True, nullable=False)
    asset_name = db.Column(db.String(255), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('asset_categories.id', ondelete='RESTRICT'), nullable=False)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('asset_subcategories.id', ondelete='SET NULL'), nullable=True)

    # Details
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    serial_number = db.Column(db.String(200), unique=True, nullable=True)
    description = db.Column(db.Text)
    specifications = db.Column(db.JSON, default=dict)

    # Purchase
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id', ondelete='SET NULL'), nullable=True)
    invoice_number = db.Column(db.String(100))
    purchase_date = db.Column(db.Date)
    purchase_cost = db.Column(db.Numeric(12, 2))
    currency = db.Column(db.String(5), default='INR')

    # Warranty & AMC
    warranty_start = db.Column(db.Date)
    warranty_end = db.Column(db.Date)
    warranty_details = db.Column(db.Text)
    amc_start = db.Column(db.Date)
    amc_end = db.Column(db.Date)
    amc_vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True)

    # Status & Condition
    status = db.Column(db.String(30), default='available')
    # available, allocated, in_maintenance, in_repair, lost, scrapped, disposed, reserved
    condition = db.Column(db.String(20), default='good')
    # new, good, fair, poor, damaged

    # Location / Assignment
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True)
    current_employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)

    # QR / Barcode
    qr_code = db.Column(db.Text)  # base64 encoded QR image
    barcode = db.Column(db.Text)  # base64 encoded barcode

    # Images & Docs
    primary_image = db.Column(db.String(500))
    images = db.Column(db.JSON, default=list)

    # Misc
    remarks = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    category = db.relationship('AssetCategory', back_populates='assets')
    subcategory = db.relationship('AssetSubcategory')
    vendor = db.relationship('Vendor', foreign_keys=[vendor_id])
    amc_vendor = db.relationship('Vendor', foreign_keys=[amc_vendor_id])
    department = db.relationship('Department', back_populates='assets')
    location = db.relationship('Location')
    current_employee = db.relationship('Employee', foreign_keys=[current_employee_id])
    allocations = db.relationship('AssetAllocation', back_populates='asset', lazy='dynamic')
    history = db.relationship('AssetHistory', back_populates='asset', lazy='dynamic', order_by='AssetHistory.created_at.desc()')
    maintenance_records = db.relationship('Maintenance', back_populates='asset', lazy='dynamic')
    complaints = db.relationship('Complaint', back_populates='asset', lazy='dynamic')
    attachments = db.relationship('Attachment', primaryjoin="and_(Attachment.entity_type=='asset', foreign(Attachment.entity_id)==Asset.id)", lazy='dynamic')

    @property
    def is_under_warranty(self):
        if self.warranty_end:
            return self.warranty_end >= date.today()
        return False

    @property
    def is_under_amc(self):
        if self.amc_end:
            return self.amc_end >= date.today()
        return False

    @property
    def depreciated_value(self):
        """Simple straight-line depreciation."""
        if not self.purchase_cost or not self.purchase_date:
            return None
        if not self.category or not self.category.useful_life_years:
            return float(self.purchase_cost)
        years_used = (date.today() - self.purchase_date).days / 365.25
        rate = float(self.category.depreciation_rate or 20) / 100
        value = float(self.purchase_cost) * (1 - rate) ** years_used
        return max(round(value, 2), 0)

    def to_dict(self, include_history=False):
        data = {
            'id': self.id,
            'uuid': self.uuid,
            'asset_tag': self.asset_tag,
            'asset_name': self.asset_name,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'subcategory_id': self.subcategory_id,
            'subcategory': self.subcategory.to_dict() if self.subcategory else None,
            'brand': self.brand,
            'model': self.model,
            'serial_number': self.serial_number,
            'description': self.description,
            'specifications': self.specifications or {},
            'vendor_id': self.vendor_id,
            'vendor': {'id': self.vendor.id, 'name': self.vendor.name} if self.vendor else None,
            'invoice_number': self.invoice_number,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'purchase_cost': float(self.purchase_cost) if self.purchase_cost else None,
            'currency': self.currency,
            'warranty_start': self.warranty_start.isoformat() if self.warranty_start else None,
            'warranty_end': self.warranty_end.isoformat() if self.warranty_end else None,
            'is_under_warranty': self.is_under_warranty,
            'amc_start': self.amc_start.isoformat() if self.amc_start else None,
            'amc_end': self.amc_end.isoformat() if self.amc_end else None,
            'is_under_amc': self.is_under_amc,
            'status': self.status,
            'condition': self.condition,
            'department_id': self.department_id,
            'department': {'id': self.department.id, 'name': self.department.name} if self.department else None,
            'location': self.location.to_dict() if self.location else None,
            'current_employee_id': self.current_employee_id,
            'current_employee': {
                'id': self.current_employee.id,
                'full_name': self.current_employee.full_name,
                'employee_id': self.current_employee.employee_id,
                'department_name': self.current_employee.department.name if self.current_employee.department else None
            } if self.current_employee else None,
            'primary_image': self.primary_image,
            'images': self.images or [],
            'remarks': self.remarks,
            'depreciated_value': self.depreciated_value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_history:
            data['history'] = [h.to_dict() for h in self.history.limit(10)]
        return data
