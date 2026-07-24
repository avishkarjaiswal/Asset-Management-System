"""
User, Role, Permission models — RBAC core
"""
import uuid
from datetime import datetime, timezone
from extensions import db
import bcrypt


class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = db.relationship('User', back_populates='role', lazy='dynamic')
    permissions = db.relationship('RolePermission', back_populates='role', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'is_active': self.is_active,
            'permissions': [rp.permission.name for rp in self.permissions if rp.permission]
        }


class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    module = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)

    role_permissions = db.relationship('RolePermission', back_populates='permission')


class RolePermission(db.Model):
    __tablename__ = 'role_permissions'

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False)
    granted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    role = db.relationship('Role', back_populates='permissions')
    permission = db.relationship('Permission', back_populates='role_permissions')

    __table_args__ = (db.UniqueConstraint('role_id', 'permission_id'),)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()), nullable=False)
    employee_id = db.Column(db.String(20), unique=True, nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_approved = db.Column(db.Boolean, default=False)
    approved_at = db.Column(db.DateTime(timezone=True))
    is_email_verified = db.Column(db.Boolean, default=False)
    avatar = db.Column(db.String(500))
    phone = db.Column(db.String(20))
    last_login = db.Column(db.DateTime(timezone=True))
    password_reset_token = db.Column(db.String(255))
    password_reset_expires = db.Column(db.DateTime(timezone=True))
    two_fa_enabled = db.Column(db.Boolean, default=False)
    two_fa_secret = db.Column(db.String(100))
    preferences = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    role = db.relationship('Role', back_populates='users')
    sessions = db.relationship('UserSession', back_populates='user', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', back_populates='user', cascade='all, delete-orphan')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def has_permission(self, permission_name: str) -> bool:
        import os
        super_admin_login = os.getenv('SUPER_ADMIN_LOGIN_ID', '').strip().strip('\'"')
        if super_admin_login and self.email.strip().lower() == super_admin_login.lower():
            return True
            
        if self.role and self.role.name == 'super_admin':
            return True
        if self.role:
            return any(
                rp.permission.name == permission_name
                for rp in self.role.permissions
                if rp.permission
            )
        return False

    def to_dict(self, include_sensitive=False):
        import os
        super_admin_login = os.getenv('SUPER_ADMIN_LOGIN_ID', '').strip().strip('\'"')
        is_env_admin = bool(super_admin_login and self.email.strip().lower() == super_admin_login.lower())
        
        role_dict = self.role.to_dict() if self.role else None
        
        if is_env_admin:
            from models.user import Role
            sa_role = Role.query.filter_by(name='super_admin').first()
            if sa_role:
                role_dict = sa_role.to_dict()

        data = {
            'id': self.id,
            'uuid': self.uuid,
            'employee_id': self.employee_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': role_dict,
            'is_active': True if is_env_admin else self.is_active,
            'is_approved': True if is_env_admin else self.is_approved,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'avatar': self.avatar,
            'phone': self.phone,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'two_fa_enabled': self.two_fa_enabled,
            'preferences': self.preferences or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        return data


class UserSession(db.Model):
    __tablename__ = 'user_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    refresh_token_jti = db.Column(db.String(255), unique=True, nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True))

    user = db.relationship('User', back_populates='sessions')
