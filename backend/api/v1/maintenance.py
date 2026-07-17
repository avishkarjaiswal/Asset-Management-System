"""Maintenance API"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.maintenance import Maintenance
from models.asset import Asset
from models.history import AssetHistory
from middleware.audit_middleware import log_action
from utils import parse_date

maintenance_bp = Blueprint('maintenance', __name__)


@maintenance_bp.route('', methods=['GET'])
@jwt_required()
def list_maintenance():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    asset_id = request.args.get('asset_id', type=int)
    query = Maintenance.query
    if status:
        query = query.filter_by(status=status)
    if asset_id:
        query = query.filter_by(asset_id=asset_id)
    query = query.order_by(Maintenance.created_at.desc())
    paginated = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [m.to_dict() for m in paginated.items], 'total': paginated.total, 'pages': paginated.pages}), 200


@maintenance_bp.route('', methods=['POST'])
@jwt_required()
def create_maintenance():
    user_id = get_jwt_identity()
    data = request.get_json()
    asset = Asset.query.get_or_404(data['asset_id'])

    m = Maintenance(
        maintenance_number=f'MAINT-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
        asset_id=data['asset_id'],
        vendor_id=data.get('vendor_id'),
        maintenance_type=data.get('maintenance_type', 'repair'),
        status='open',
        problem_description=data['problem_description'],
        scheduled_date=parse_date(data.get('scheduled_date')),
        technician_name=data.get('technician_name'),
        technician_phone=data.get('technician_phone'),
        cost=data.get('cost', 0),
        is_under_warranty=data.get('is_under_warranty', asset.is_under_warranty),
        is_under_amc=data.get('is_under_amc', asset.is_under_amc),
        reported_by=user_id,
        notes=data.get('notes'),
    )
    db.session.add(m)
    asset.status = 'in_maintenance'
    db.session.add(AssetHistory(
        asset_id=asset.id,
        event_type='maintenance',
        description=f'Maintenance request created: {data["problem_description"][:100]}',
        performed_by=user_id,
        reference_type='maintenance',
    ))
    db.session.commit()
    return jsonify(m.to_dict()), 201


@maintenance_bp.route('/<int:m_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_maintenance(m_id):
    user_id = get_jwt_identity()
    m = Maintenance.query.get_or_404(m_id)
    data = request.get_json()
    updatable = ['status', 'work_done', 'parts_replaced', 'cost', 'invoice_number',
                 'completion_date', 'next_service_date', 'condition_after',
                 'technician_name', 'vendor_id', 'scheduled_date', 'notes']
    for field in updatable:
        if field in data:
            if field in ['scheduled_date', 'completion_date', 'next_service_date']:
                setattr(m, field, parse_date(data[field]))
            else:
                setattr(m, field, data[field])

    if data.get('status') == 'completed':
        asset = Asset.query.get(m.asset_id)
        if asset:
            asset.status = 'available'
            asset.condition = data.get('condition_after', asset.condition)
            db.session.add(AssetHistory(
                asset_id=asset.id,
                event_type='repaired',
                description=f'Maintenance completed. Work: {data.get("work_done", "")[:100]}',
                performed_by=user_id,
                reference_id=m.id,
                reference_type='maintenance',
            ))

    db.session.commit()
    return jsonify(m.to_dict()), 200


@maintenance_bp.route('/<int:m_id>', methods=['GET'])
@jwt_required()
def get_maintenance(m_id):
    m = Maintenance.query.get_or_404(m_id)
    return jsonify(m.to_dict()), 200
