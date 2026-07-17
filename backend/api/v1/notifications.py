"""Notifications API"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.notification import Notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'
    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)
    query = query.order_by(Notification.created_at.desc())
    paginated = query.paginate(page=page, per_page=30, error_out=False)
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        'items': [n.to_dict() for n in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'unread_count': unread_count,
    }), 200


@notifications_bp.route('/mark-read', methods=['POST'])
@jwt_required()
def mark_read():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    notif_ids = data.get('ids')  # list of IDs, or None = mark all
    query = Notification.query.filter_by(user_id=user_id, is_read=False)
    if notif_ids:
        query = query.filter(Notification.id.in_(notif_ids))
    now = datetime.now(timezone.utc)
    for n in query.all():
        n.is_read = True
        n.read_at = now
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'count': count}), 200
