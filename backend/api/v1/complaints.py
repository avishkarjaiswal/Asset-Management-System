"""Complaints API"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.complaint import Complaint, ComplaintUpdate
from middleware.audit_middleware import log_action

complaints_bp = Blueprint('complaints', __name__)


@complaints_bp.route('', methods=['GET'])
@jwt_required()
def list_complaints():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    query = Complaint.query
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    query = query.order_by(Complaint.created_at.desc())
    paginated = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [c.to_dict() for c in paginated.items], 'total': paginated.total, 'pages': paginated.pages}), 200


@complaints_bp.route('/<int:c_id>', methods=['GET'])
@jwt_required()
def get_complaint(c_id):
    return jsonify(Complaint.query.get_or_404(c_id).to_dict()), 200


@complaints_bp.route('', methods=['POST'])
@jwt_required()
def create_complaint():
    user_id = get_jwt_identity()
    data = request.get_json()
    c = Complaint(
        complaint_number=f'COMP-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
        asset_id=data['asset_id'],
        employee_id=data['employee_id'],
        title=data['title'],
        description=data['description'],
        priority=data.get('priority', 'medium'),
        category=data.get('category'),
        status='open',
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@complaints_bp.route('/<int:c_id>/update', methods=['POST'])
@jwt_required()
def add_update(c_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    complaint = Complaint.query.get_or_404(c_id)
    old_status = complaint.status
    new_status = data.get('status', old_status)
    complaint.status = new_status

    if new_status == 'resolved':
        complaint.resolved_at = datetime.now(timezone.utc)
        complaint.resolution = data.get('message', '')
    if new_status == 'closed':
        complaint.closed_at = datetime.now(timezone.utc)

    update = ComplaintUpdate(
        complaint_id=c_id,
        updated_by=user_id,
        status_from=old_status,
        status_to=new_status,
        message=data.get('message', ''),
        is_internal=data.get('is_internal', False),
    )
    db.session.add(update)
    db.session.commit()
    return jsonify(complaint.to_dict()), 200


@complaints_bp.route('/<int:c_id>/rate', methods=['POST'])
@jwt_required()
def rate_complaint(c_id):
    data = request.get_json()
    complaint = Complaint.query.get_or_404(c_id)
    complaint.rating = data.get('rating')
    complaint.feedback = data.get('feedback')
    db.session.commit()
    return jsonify(complaint.to_dict()), 200
