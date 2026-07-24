"""
Authentication API — Login, Logout, Refresh, Forgot/Reset Password
"""
from datetime import datetime, timezone, timedelta
import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from extensions import db
from models.user import User, UserSession
from models.employee import Employee
from middleware.audit_middleware import log_action

auth_bp = Blueprint('auth', __name__)

# In-memory revoked token store (use Redis in production)
revoked_tokens = set()


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    password = data.get('password')

    if not all([first_name, last_name, email, password]):
        return jsonify({'error': 'All fields are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already registered'}), 409

    from models.user import Role
    super_admin_role = Role.query.filter_by(name='super_admin').first()
    if not super_admin_role:
        return jsonify({'error': 'Super admin role not found in the system'}), 500

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        role_id=super_admin_role.id,
        is_active=True,
        is_email_verified=True
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    log_action('register', 'auth', f'User {user.email} registered', user_id=user.id)

    return jsonify({
        'user': user.to_dict(),
        'message': 'Registration successful. Account pending admin approval.'
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    login_field = data.get('email') or data.get('employee_id')
    password = data.get('password')

    if not login_field or not password:
        return jsonify({'error': 'Email/Employee ID and password are required'}), 400

    import os
    # Strip whitespace, carriage returns, and quotes which often cause issues in production deployments
    super_admin_login = os.getenv('SUPER_ADMIN_LOGIN_ID', '').strip().strip('\'"')
    super_admin_pass = os.getenv('SUPER_ADMIN_PASSWORD', '').strip().strip('\'"')

    is_super_admin_email = bool(super_admin_login and login_field.strip().lower() == super_admin_login.lower())

    if is_super_admin_email:
        if password.strip() != super_admin_pass:
            log_action('login', 'auth', f'Failed super admin login attempt for {login_field}', status='failed')
            return jsonify({'error': 'Invalid credentials'}), 401
            
        from models.user import Role
        super_admin_role = Role.query.filter_by(name='super_admin').first()
        if not super_admin_role:
            super_admin_role = Role(
                name='super_admin',
                display_name='Super Admin',
                description='Full system access',
                is_active=True
            )
            db.session.add(super_admin_role)
            db.session.flush()
            
        user = User.query.filter_by(email=super_admin_login).first()
        
        if not user:
            user = User(
                first_name='Super',
                last_name='Admin',
                email=super_admin_login,
                role_id=super_admin_role.id,
                is_active=True,
                is_approved=True,
                is_email_verified=True
            )
            user.set_password(super_admin_pass)
            db.session.add(user)
            db.session.commit()
        else:
            needs_commit = False
            if user.role_id != super_admin_role.id:
                user.role = super_admin_role
                user.role_id = super_admin_role.id
                needs_commit = True
            if not user.is_active:
                user.is_active = True
                needs_commit = True
            if not user.is_approved:
                user.is_approved = True
                needs_commit = True
            if needs_commit:
                db.session.commit()
    else:
        # Find user by email or employee_id
        user = User.query.filter(
            (User.email == login_field) | (User.employee_id == login_field)
        ).first()

        if not user or not user.check_password(password):
            log_action('login', 'auth', f'Failed login attempt for {login_field}', status='failed')
            return jsonify({'error': 'Invalid credentials'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is inactive. Contact your administrator.'}), 403

        if not user.is_approved:
            return jsonify({'error': 'Account pending admin approval.'}), 403

    # Create tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    # Save session
    jti = get_jwt()['jti'] if False else secrets.token_hex(32)
    session = UserSession(
        user_id=user.id,
        refresh_token_jti=jti,
        ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent', ''),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    user.last_login = datetime.now(timezone.utc)
    db.session.add(session)
    db.session.commit()

    log_action('login', 'auth', f'User {user.email} logged in', user_id=user.id)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
        'message': 'Login successful'
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'User not found'}), 401
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = get_jwt_identity()
    jti = get_jwt().get('jti')
    if jti:
        revoked_tokens.add(jti)
    log_action('logout', 'auth', 'User logged out', user_id=user_id)
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user.set_password(new_password)
    db.session.commit()
    log_action('update', 'auth', 'Password changed', user_id=user_id)
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    # Always return 200 to prevent email enumeration
    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=2)
        db.session.commit()
        # TODO: send email with reset link
    return jsonify({'message': 'If that email exists, a reset link has been sent.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    user = User.query.filter_by(password_reset_token=token).first()
    if not user or not user.password_reset_expires:
        return jsonify({'error': 'Invalid or expired token'}), 400
    if user.password_reset_expires < datetime.now(timezone.utc):
        return jsonify({'error': 'Token has expired'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.session.commit()
    return jsonify({'message': 'Password reset successfully'}), 200


@auth_bp.route('/update-preferences', methods=['PATCH'])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    prefs = user.preferences or {}
    prefs.update(data)
    user.preferences = prefs
    db.session.commit()
    return jsonify({'preferences': user.preferences}), 200
