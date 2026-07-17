"""Vendors API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from extensions import db
from models.vendor import Vendor
from middleware.audit_middleware import log_action

vendors_bp = Blueprint('vendors', __name__)


@vendors_bp.route('', methods=['GET'])
@jwt_required()
def list_vendors():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '')
    query = Vendor.query.filter_by(is_active=True)
    if search:
        query = query.filter(or_(
            Vendor.name.ilike(f'%{search}%'),
            Vendor.code.ilike(f'%{search}%'),
            Vendor.contact_person.ilike(f'%{search}%'),
            Vendor.gst_number.ilike(f'%{search}%'),
        ))
    query = query.order_by(Vendor.name)
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [v.to_dict() for v in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
    }), 200


@vendors_bp.route('/<int:v_id>', methods=['GET'])
@jwt_required()
def get_vendor(v_id):
    return jsonify(Vendor.query.get_or_404(v_id).to_dict()), 200


@vendors_bp.route('', methods=['POST'])
@jwt_required()
def create_vendor():
    user_id = get_jwt_identity()
    data = request.get_json()
    if Vendor.query.filter_by(code=data.get('code')).first():
        return jsonify({'error': 'Vendor code already exists'}), 409
    v = Vendor(
        name=data['name'],
        code=data['code'],
        contact_person=data.get('contact_person'),
        email=data.get('email'),
        phone=data.get('phone'),
        alternate_phone=data.get('alternate_phone'),
        address=data.get('address'),
        city=data.get('city'),
        state=data.get('state'),
        pincode=data.get('pincode'),
        gst_number=data.get('gst_number'),
        pan_number=data.get('pan_number'),
        website=data.get('website'),
        category=data.get('category'),
        bank_name=data.get('bank_name'),
        bank_account=data.get('bank_account'),
        bank_ifsc=data.get('bank_ifsc'),
        notes=data.get('notes'),
    )
    db.session.add(v)
    db.session.commit()
    log_action('create', 'vendors', f'Created vendor {v.name}', entity_id=v.id, entity_type='vendor', user_id=user_id)
    return jsonify(v.to_dict()), 201


@vendors_bp.route('/<int:v_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_vendor(v_id):
    v = Vendor.query.get_or_404(v_id)
    data = request.get_json()
    for field in ['name', 'contact_person', 'email', 'phone', 'address', 'city',
                  'state', 'pincode', 'gst_number', 'pan_number', 'website',
                  'category', 'rating', 'bank_name', 'bank_account', 'bank_ifsc', 'notes']:
        if field in data:
            setattr(v, field, data[field])
    db.session.commit()
    return jsonify(v.to_dict()), 200


@vendors_bp.route('/<int:v_id>', methods=['DELETE'])
@jwt_required()
def delete_vendor(v_id):
    v = Vendor.query.get_or_404(v_id)
    v.is_active = False
    db.session.commit()
    return jsonify({'message': 'Vendor deactivated'}), 200
