"""
Approval Members API Blueprint
CRUD endpoints for managing approval members used in Capital Sanction forms.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.approval_member import ApprovalMember

approval_members_bp = Blueprint('approval_members', __name__)


@approval_members_bp.route('', methods=['GET'])
@jwt_required()
def list_approval_members():
    """Return all approval members, optionally filtered by department."""
    department = request.args.get('department')
    query = ApprovalMember.query.order_by(ApprovalMember.department, ApprovalMember.designation, ApprovalMember.name)
    if department:
        query = query.filter(ApprovalMember.department.ilike(department))
    members = query.all()
    return jsonify([m.to_dict() for m in members]), 200


@approval_members_bp.route('/<int:member_id>', methods=['GET'])
@jwt_required()
def get_approval_member(member_id):
    member = ApprovalMember.query.get_or_404(member_id)
    return jsonify(member.to_dict()), 200


@approval_members_bp.route('', methods=['POST'])
@jwt_required()
def create_approval_member():
    data = request.get_json()
    department  = (data.get('department') or '').strip()
    designation = (data.get('designation') or '').strip()
    name        = (data.get('name') or '').strip()

    if not department or not designation or not name:
        return jsonify({'error': 'Department, Designation, and Name are all required'}), 400

    member = ApprovalMember(
        department=department,
        designation=designation,
        name=name,
        gppl_id=(data.get('gppl_id') or '').strip() or None
    )
    db.session.add(member)
    db.session.commit()
    return jsonify(member.to_dict()), 201


@approval_members_bp.route('/<int:member_id>', methods=['PUT'])
@jwt_required()
def update_approval_member(member_id):
    member = ApprovalMember.query.get_or_404(member_id)
    data = request.get_json()

    member.department  = (data.get('department') or member.department).strip()
    member.designation = (data.get('designation') or member.designation).strip()
    member.name        = (data.get('name') or member.name).strip()
    if 'gppl_id' in data:
        member.gppl_id = (data.get('gppl_id') or '').strip() or None

    db.session.commit()
    return jsonify(member.to_dict()), 200


@approval_members_bp.route('/<int:member_id>', methods=['DELETE'])
@jwt_required()
def delete_approval_member(member_id):
    member = ApprovalMember.query.get_or_404(member_id)
    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Approval member deleted'}), 200
