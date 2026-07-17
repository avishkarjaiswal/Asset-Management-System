"""Audit Logs API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.audit_log import AuditLog

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('', methods=['GET'])
@jwt_required()
def list_audit_logs():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role.name not in ('super_admin', 'it_admin', 'auditor'):
        return jsonify({'error': 'Permission denied'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 30, type=int), 100)
    module = request.args.get('module')
    action = request.args.get('action')
    actor_id = request.args.get('user_id', type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = AuditLog.query
    if module:
        query = query.filter_by(module=module)
    if action:
        query = query.filter_by(action=action)
    if actor_id:
        query = query.filter_by(user_id=actor_id)

    query = query.order_by(AuditLog.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [log.to_dict() for log in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
    }), 200
