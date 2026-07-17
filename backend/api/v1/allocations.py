"""
Allocations API — Request → Manager Approve → IT Approve → Allocate → Acknowledge
"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.allocation import AssetAllocation, AllocationApproval
from models.asset import Asset
from models.employee import Employee
from models.history import AssetHistory
from services.notification_service import send_notification
from middleware.audit_middleware import log_action
from utils import parse_date

allocations_bp = Blueprint('allocations', __name__)


def _gen_number():
    return f'ALLOC-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}'


@allocations_bp.route('', methods=['GET'])
@jwt_required()
def list_allocations():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    status = request.args.get('status')
    employee_id = request.args.get('employee_id', type=int)
    asset_id = request.args.get('asset_id', type=int)

    query = AssetAllocation.query
    if status:
        query = query.filter_by(status=status)
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if asset_id:
        query = query.filter_by(asset_id=asset_id)
    query = query.order_by(AssetAllocation.created_at.desc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [a.to_dict() for a in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
    }), 200


@allocations_bp.route('/<int:alloc_id>', methods=['GET'])
@jwt_required()
def get_allocation(alloc_id):
    alloc = AssetAllocation.query.get_or_404(alloc_id)
    return jsonify(alloc.to_dict()), 200


@allocations_bp.route('', methods=['POST'])
@jwt_required()
def create_allocation_request():
    """Step 1 — Create allocation request."""
    user_id = get_jwt_identity()
    data = request.get_json()

    asset_id = data.get('asset_id')
    employee_id = data.get('employee_id')
    if not asset_id or not employee_id:
        return jsonify({'error': 'asset_id and employee_id are required'}), 400

    asset = Asset.query.get_or_404(asset_id)
    employee = Employee.query.get_or_404(employee_id)

    if asset.status != 'available':
        return jsonify({'error': f'Asset is not available (current status: {asset.status})'}), 400

    alloc = AssetAllocation(
        allocation_number=_gen_number(),
        asset_id=asset_id,
        employee_id=employee_id,
        department_id=employee.department_id,
        status='pending',
        purpose=data.get('purpose'),
        accessories=data.get('accessories', []),
        allocation_date=parse_date(data.get('allocation_date')),
        expected_return_date=parse_date(data.get('expected_return_date')),
        requested_by=user_id,
        notes=data.get('notes'),
    )
    db.session.add(alloc)

    # Reserve asset
    asset.status = 'reserved'
    
    db.session.commit()

    log_action('create', 'allocations', f'Allocation request {alloc.allocation_number}', entity_id=alloc.id, entity_type='allocation', user_id=user_id)
    return jsonify(alloc.to_dict()), 201


@allocations_bp.route('/<int:alloc_id>/approve', methods=['POST'])
@jwt_required()
def approve_allocation(alloc_id):
    """Approve and instantly allocate the asset to the employee."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    comments = data.get('comments', '')

    alloc = AssetAllocation.query.get_or_404(alloc_id)

    if alloc.status != 'pending':
        return jsonify({'error': 'Only pending allocations can be approved'}), 400

    # Advance workflow directly to 'allocated'
    alloc.status = 'allocated'
    alloc.allocation_date = datetime.now(timezone.utc)
    alloc.handover_condition = 'good'

    # Update asset
    asset = Asset.query.get(alloc.asset_id)
    if asset:
        asset.status = 'allocated'
        asset.current_employee_id = alloc.employee_id
        asset.department_id = alloc.department_id

        # Record history
        db.session.add(AssetHistory(
            asset_id=asset.id,
            event_type='allocated',
            description=f'Allocated to {alloc.employee.full_name}. Comments: {comments}',
            performed_by=user_id,
            reference_id=alloc.id,
            reference_type='allocation',
        ))

    db.session.commit()
    log_action('approve_and_allocate', 'allocations', f'Asset {asset.asset_tag} allocated to employee {alloc.employee_id}', entity_id=alloc.id, entity_type='allocation', user_id=user_id)
    return jsonify(alloc.to_dict()), 200


@allocations_bp.route('/<int:alloc_id>/reject', methods=['POST'])
@jwt_required()
def reject_allocation(alloc_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    alloc = AssetAllocation.query.get_or_404(alloc_id)

    alloc.status = 'rejected'
    comments = data.get('comments', '')
    if comments:
        alloc.notes = (alloc.notes or '') + f'\nRejected Reason: {comments}'

    # Release asset
    asset = Asset.query.get(alloc.asset_id)
    if asset:
        asset.status = 'available'

    db.session.commit()
    return jsonify(alloc.to_dict()), 200


@allocations_bp.route('/<int:alloc_id>/allocate', methods=['POST'])
@jwt_required()
def complete_allocation(alloc_id):
    """Step: IT/Store Manager physically hands over the asset."""
    user_id = get_jwt_identity()
    data = request.get_json()
    alloc = AssetAllocation.query.get_or_404(alloc_id)

    if alloc.status not in ('it_approved', 'manager_approved'):
        return jsonify({'error': 'Allocation must be approved before completing'}), 400

    alloc.status = 'allocated'
    alloc.allocation_date = datetime.now(timezone.utc)
    alloc.handover_condition = data.get('condition', 'good')
    alloc.accessories = data.get('accessories', alloc.accessories)

    # Update asset
    asset = Asset.query.get(alloc.asset_id)
    asset.status = 'allocated'
    asset.current_employee_id = alloc.employee_id
    asset.department_id = alloc.department_id

    # Record history
    db.session.add(AssetHistory(
        asset_id=asset.id,
        event_type='allocated',
        description=f'Allocated to {alloc.employee.full_name}',
        performed_by=user_id,
        reference_id=alloc.id,
        reference_type='allocation',
    ))
    db.session.commit()

    log_action('allocate', 'allocations', f'Asset {asset.asset_tag} allocated to employee {alloc.employee_id}', entity_id=alloc.id, entity_type='allocation', user_id=user_id)
    return jsonify(alloc.to_dict()), 200


@allocations_bp.route('/<int:alloc_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_allocation(alloc_id):
    """Employee digitally acknowledges receipt."""
    user_id = get_jwt_identity()
    data = request.get_json()
    alloc = AssetAllocation.query.get_or_404(alloc_id)

    alloc.status = 'acknowledged'
    alloc.acknowledged_at = datetime.now(timezone.utc)
    alloc.acknowledgement_signature = data.get('signature')
    db.session.commit()
    return jsonify(alloc.to_dict()), 200


@allocations_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    import io, csv
    from flask import send_file
    time_range = request.args.get('time_range', 'lifetime')
    query = AssetAllocation.query
    
    if time_range != 'lifetime':
        from datetime import datetime, timedelta, timezone
        days = int(time_range)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(AssetAllocation.created_at >= cutoff)
        
    allocations = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Select Asset (Name & Tag)', 'Assign To Employee',
        'Expected Return Date', 'Purpose / Justification'
    ])
    for alloc in allocations:
        asset_str = f"{alloc.asset.asset_name} ({alloc.asset.asset_tag})" if alloc.asset else ''
        emp_str = f"{alloc.employee.full_name} ({alloc.employee.employee_id})" if alloc.employee else ''
        writer.writerow([
            asset_str,
            emp_str,
            alloc.expected_return_date.isoformat() if alloc.expected_return_date else '',
            alloc.purpose
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='gppl_allocations.csv'
    )
