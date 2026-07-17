"""
RBAC permission decorator and helpers
"""
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.user import User


def permission_required(*permissions):
    """Decorator: require one or more permission strings."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            for perm in permissions:
                if not user.has_permission(perm):
                    return jsonify({'error': f'Permission denied: {perm} required'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def role_required(*roles):
    """Decorator: require specific role(s)."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            if user.role and user.role.name not in roles:
                return jsonify({'error': 'Insufficient role privileges'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """Get current user from JWT."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)
