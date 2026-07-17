"""Settings API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.settings import SystemSettings
from models.user import User

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    settings = SystemSettings.query.all()
    return jsonify({s.key: s.value for s in settings}), 200


@settings_bp.route('', methods=['PUT'])
@jwt_required()
def update_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role.name not in ('super_admin',):
        return jsonify({'error': 'Permission denied'}), 403
    data = request.get_json()
    for key, value in data.items():
        setting = SystemSettings.query.filter_by(key=key).first()
        if setting:
            setting.value = str(value)
            setting.updated_by = user_id
        else:
            db.session.add(SystemSettings(key=key, value=str(value), updated_by=user_id))
    db.session.commit()
    return jsonify({'message': 'Settings updated'}), 200
