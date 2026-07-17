"""
Audit logging service — call log_action() anywhere to record an audit trail.
"""
from flask import request
from flask_jwt_extended import get_jwt_identity
from extensions import db
from models.audit_log import AuditLog


def log_action(
    action: str,
    module: str,
    description: str = '',
    entity_id: int = None,
    entity_type: str = None,
    old_values: dict = None,
    new_values: dict = None,
    user_id: int = None,
    status: str = 'success',
    error_message: str = None,
):
    """Write an audit log entry."""
    try:
        if user_id is None:
            try:
                user_id = get_jwt_identity()
            except Exception:
                user_id = None

        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        ua = request.headers.get('User-Agent', '')

        entry = AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            entity_id=entity_id,
            entity_type=entity_type,
            description=description,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip,
            user_agent=ua,
            status=status,
            error_message=error_message,
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as e:
        # Never let audit logging break the main flow
        db.session.rollback()
        print(f'Audit log error: {e}')
