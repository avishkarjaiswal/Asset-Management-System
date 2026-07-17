from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, Role
from extensions import db
from middleware.audit_middleware import log_action

from datetime import datetime, timezone

admin_bp = Blueprint('admin', __name__)

def is_super_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user and user.role and user.role.name == 'super_admin'

@admin_bp.route('/pending-users', methods=['GET'])
@jwt_required()
def get_pending_users():
    if not is_super_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.filter_by(is_approved=False).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200

@admin_bp.route('/approved-users', methods=['GET'])
@jwt_required()
def get_approved_users():
    if not is_super_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.filter_by(is_approved=True).order_by(User.approved_at.desc()).all()
    # Filter out super_admin from history if needed, but for now just return approved.
    return jsonify({'users': [u.to_dict() for u in users if u.role and u.role.name != 'super_admin']}), 200

@admin_bp.route('/approve-user/<int:user_id>', methods=['POST'])
@jwt_required()
def approve_user(user_id):
    if not is_super_admin():
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    if not data or 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400
        
    role_name = data.get('role')
    if role_name not in ['employee', 'approval_member']:
        return jsonify({'error': 'Invalid role. Must be employee or approval_member'}), 400
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify({'error': 'Role not found in DB'}), 500
        
    user.is_approved = True
    user.approved_at = datetime.now(timezone.utc)
    user.role_id = role.id
    db.session.commit()
    
    log_action('approve', 'admin', f'User {user.email} approved as {role_name}', user_id=get_jwt_identity())
    
    return jsonify({'message': f'User {user.email} approved successfully'}), 200

@admin_bp.route('/user/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if not is_super_admin():
        return jsonify({'error': 'Unauthorized'}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.role and user.role.name == 'super_admin':
        return jsonify({'error': 'Cannot delete super admin account'}), 403
        
    email = user.email
    db.session.delete(user)
    db.session.commit()
    
    log_action('delete', 'admin', f'User {email} deleted', user_id=get_jwt_identity())
    
    return jsonify({'message': 'User deleted successfully'}), 200
