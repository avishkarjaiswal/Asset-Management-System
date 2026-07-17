"""Search API — global enterprise search"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from models.asset import Asset
from models.employee import Employee
from models.vendor import Vendor
from models.allocation import AssetAllocation
from models.complaint import Complaint
from models.purchase import PurchaseOrder

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
@jwt_required()
def global_search():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'results': [], 'total': 0}), 200

    results = []
    like = f'%{q}%'

    # Assets
    assets = Asset.query.filter(
        Asset.is_active == True,
        or_(
            Asset.asset_tag.ilike(like),
            Asset.asset_name.ilike(like),
            Asset.serial_number.ilike(like),
            Asset.brand.ilike(like),
            Asset.model.ilike(like),
            Asset.invoice_number.ilike(like),
        )
    ).limit(10).all()
    for a in assets:
        results.append({
            'type': 'asset',
            'id': a.id,
            'title': a.asset_name,
            'subtitle': f'{a.asset_tag} • {a.brand or ""} {a.model or ""}',
            'status': a.status,
            'url': f'/assets/{a.id}',
        })

    # Employees
    employees = Employee.query.filter(
        or_(
            Employee.first_name.ilike(like),
            Employee.last_name.ilike(like),
            Employee.employee_id.ilike(like),
            Employee.email.ilike(like),
            Employee.designation.ilike(like),
        )
    ).limit(10).all()
    for e in employees:
        results.append({
            'type': 'employee',
            'id': e.id,
            'title': e.full_name,
            'subtitle': f'{e.employee_id} • {e.designation or ""}',
            'status': e.status,
            'url': f'/employees/{e.id}',
        })

    # Vendors
    vendors = Vendor.query.filter(
        Vendor.is_active == True,
        or_(
            Vendor.name.ilike(like),
            Vendor.code.ilike(like),
            Vendor.gst_number.ilike(like),
        )
    ).limit(5).all()
    for v in vendors:
        results.append({
            'type': 'vendor',
            'id': v.id,
            'title': v.name,
            'subtitle': f'{v.code} • {v.city or ""}',
            'url': f'/vendors/{v.id}',
        })

    # POs
    pos = PurchaseOrder.query.filter(
        PurchaseOrder.po_number.ilike(like)
    ).limit(5).all()
    for p in pos:
        results.append({
            'type': 'purchase_order',
            'id': p.id,
            'title': p.po_number,
            'subtitle': f'Vendor: {p.vendor.name if p.vendor else ""} • ₹{p.total_amount}',
            'status': p.status,
            'url': f'/purchases/{p.id}',
        })

    # Complaints
    complaints = Complaint.query.filter(
        or_(
            Complaint.complaint_number.ilike(like),
            Complaint.title.ilike(like),
        )
    ).limit(5).all()
    for c in complaints:
        results.append({
            'type': 'complaint',
            'id': c.id,
            'title': c.title,
            'subtitle': f'{c.complaint_number} • {c.status}',
            'status': c.status,
            'url': f'/complaints/{c.id}',
        })

    return jsonify({'results': results, 'total': len(results), 'query': q}), 200
