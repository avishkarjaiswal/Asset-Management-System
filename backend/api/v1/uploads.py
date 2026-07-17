"""File Uploads API"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from extensions import db
from models.attachment import Attachment

uploads_bp = Blueprint('uploads', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_type(mime_type):
    if mime_type and 'image' in mime_type:
        return 'image'
    if mime_type and 'pdf' in mime_type:
        return 'pdf'
    if mime_type and ('sheet' in mime_type or 'excel' in mime_type or 'csv' in mime_type):
        return 'spreadsheet'
    return 'document'


@uploads_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    entity_type = request.form.get('entity_type', 'general')
    entity_id = request.form.get('entity_id', type=int)
    description = request.form.get('description', '')

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[1].lower()
    unique_name = f'{uuid.uuid4().hex}.{ext}'

    # Save to appropriate subfolder
    folder_map = {'asset': 'assets', 'employee': 'employees', 'invoice': 'invoices'}
    subfolder = folder_map.get(entity_type, 'attachments')
    save_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, unique_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)
    mime_type = file.content_type or ''

    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=unique_name,
        original_name=original_name,
        file_path=f'/api/v1/uploads/files/{subfolder}/{unique_name}',
        file_size=file_size,
        mime_type=mime_type,
        file_type=get_file_type(mime_type),
        description=description,
        uploaded_by=user_id,
    )
    db.session.add(attachment)
    db.session.commit()

    return jsonify({
        'id': attachment.id,
        'url': attachment.file_path,
        'original_name': original_name,
        'file_type': attachment.file_type,
        'file_size': file_size,
    }), 201


@uploads_bp.route('/files/<subfolder>/<filename>', methods=['GET'])
def serve_file(subfolder, filename):
    directory = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    return send_from_directory(directory, filename)
