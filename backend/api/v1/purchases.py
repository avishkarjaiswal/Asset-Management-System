"""Purchases API"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.purchase import PurchaseOrder, PurchaseItem
from middleware.audit_middleware import log_action
from utils import parse_date

purchases_bp = Blueprint('purchases', __name__)


@purchases_bp.route('', methods=['GET'])
@jwt_required()
def list_pos():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    query = PurchaseOrder.query
    if status:
        query = query.filter_by(status=status)
    query = query.order_by(PurchaseOrder.created_at.desc())
    paginated = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [p.to_dict() for p in paginated.items], 'total': paginated.total, 'pages': paginated.pages}), 200


@purchases_bp.route('/<int:po_id>', methods=['GET'])
@jwt_required()
def get_po(po_id):
    return jsonify(PurchaseOrder.query.get_or_404(po_id).to_dict()), 200


@purchases_bp.route('', methods=['POST'])
@jwt_required()
def create_po():
    user_id = get_jwt_identity()
    data = request.get_json()
    po_number = f'PO-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}'
    department_id = None
    department_name = data.get('department_name')
    if department_name:
        from models.employee import Department
        dept = Department.query.filter(db.func.lower(Department.name) == department_name.lower()).first()
        if not dept:
            dept = Department(name=department_name, code=department_name[:4].upper() + str(len(department_name)))
            db.session.add(dept)
            db.session.flush()
        department_id = dept.id

    po = PurchaseOrder(
        po_number=po_number,
        vendor_id=data['vendor_id'],
        department_id=department_id,
        status='draft',
        order_date=parse_date(data.get('order_date')),
        expected_delivery=parse_date(data.get('expected_delivery')),
        notes=data.get('notes'),
        shipping_address=data.get('shipping_address'),
        created_by=user_id,
    )
    db.session.add(po)
    db.session.flush()

    subtotal = 0
    for item_data in data.get('items', []):
        qty = item_data.get('quantity', 1)
        unit = float(item_data.get('unit_price', 0))
        gst = float(item_data.get('gst_rate', 18))
        total = qty * unit * (1 + gst / 100)
        subtotal += qty * unit
        item = PurchaseItem(
            purchase_order_id=po.id,
            description=item_data['description'],
            quantity=qty,
            unit_price=unit,
            gst_rate=gst,
            total_price=round(total, 2),
            hsn_code=item_data.get('hsn_code'),
            category_id=item_data.get('category_id'),
        )
        db.session.add(item)

    gst_total = sum(
        float(i.get('unit_price', 0)) * i.get('quantity', 1) * float(i.get('gst_rate', 18)) / 100
        for i in data.get('items', [])
    )
    po.subtotal = round(subtotal, 2)
    po.gst_amount = round(gst_total, 2)
    po.total_amount = round(subtotal + gst_total, 2)
    db.session.commit()
    log_action('create', 'purchases', f'Created PO {po_number}', entity_id=po.id, user_id=user_id)
    return jsonify(po.to_dict()), 201


@purchases_bp.route('/<int:po_id>/approve', methods=['POST'])
@jwt_required()
def approve_po(po_id):
    user_id = get_jwt_identity()
    po = PurchaseOrder.query.get_or_404(po_id)
    po.status = 'approved'
    po.approved_by = user_id
    po.approved_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(po.to_dict()), 200


@purchases_bp.route('/<int:po_id>/receive', methods=['POST'])
@jwt_required()
def mark_received(po_id):
    data = request.get_json()
    po = PurchaseOrder.query.get_or_404(po_id)
    po.status = 'received'
    po.actual_delivery = datetime.now(timezone.utc).date()
    po.invoice_number = data.get('invoice_number')
    po.invoice_date = parse_date(data.get('invoice_date'))
    db.session.commit()
    return jsonify(po.to_dict()), 200
