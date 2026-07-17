"""Departments API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.employee import Department, Branch, Location, Employee

departments_bp = Blueprint('departments', __name__)


@departments_bp.route('', methods=['GET'])
@jwt_required()
def list_departments():
    depts = Department.query.filter_by(is_active=True).order_by(Department.name).all()
    return jsonify([d.to_dict() for d in depts]), 200


@departments_bp.route('', methods=['POST'])
@jwt_required()
def create_department():
    data = request.get_json()
    dept = Department(
        name=data['name'],
        code=data['code'],
        branch_id=data.get('branch_id'),
        parent_id=data.get('parent_id'),
        description=data.get('description'),
    )
    db.session.add(dept)
    db.session.commit()
    return jsonify(dept.to_dict()), 201


@departments_bp.route('/<int:dept_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_department(dept_id):
    dept = Department.query.get_or_404(dept_id)
    data = request.get_json()
    for field in ['name', 'description', 'manager_id', 'branch_id', 'is_active']:
        if field in data:
            setattr(dept, field, data[field])
    db.session.commit()
    return jsonify(dept.to_dict()), 200


@departments_bp.route('/<int:dept_id>', methods=['DELETE'])
@jwt_required()
def delete_department(dept_id):
    # Check permissions, etc, or just let any admin delete.
    # In this app, only admins have access to the frontend department list anyway, 
    # but we can enforce role if needed.
    dept = Department.query.get_or_404(dept_id)
    
    if dept.employees.filter(Employee.status != 'terminated').count() > 0:
        return jsonify({'error': 'Cannot delete department with active employees'}), 400
    
    if dept.assets.count() > 0:
        return jsonify({'error': 'Cannot delete department that currently owns assets'}), 400
        
    db.session.delete(dept)
    db.session.commit()
    return jsonify({'message': 'Department deleted successfully'}), 200


@departments_bp.route('/branches', methods=['GET'])
@jwt_required()
def list_branches():
    branches = Branch.query.filter_by(is_active=True).all()
    return jsonify([b.to_dict() for b in branches]), 200


@departments_bp.route('/branches', methods=['POST'])
@jwt_required()
def create_branch():
    data = request.get_json()
    branch = Branch(
        name=data['name'],
        code=data['code'],
        address=data.get('address'),
        city=data.get('city'),
        state=data.get('state'),
        pincode=data.get('pincode'),
        phone=data.get('phone'),
        email=data.get('email'),
    )
    db.session.add(branch)
    db.session.commit()
    return jsonify(branch.to_dict()), 201


@departments_bp.route('/locations', methods=['GET'])
@jwt_required()
def list_locations():
    locs = Location.query.filter_by(is_active=True).all()
    return jsonify([l.to_dict() for l in locs]), 200


@departments_bp.route('/locations', methods=['POST'])
@jwt_required()
def create_location():
    data = request.get_json()
    loc = Location(
        name=data['name'],
        code=data['code'],
        branch_id=data.get('branch_id'),
        floor=data.get('floor'),
        room=data.get('room'),
        description=data.get('description'),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify(loc.to_dict()), 201
