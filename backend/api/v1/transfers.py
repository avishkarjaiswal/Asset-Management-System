"""Transfers API"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.transfer import AssetTransfer
from models.asset import Asset
from models.history import AssetHistory
from middleware.audit_middleware import log_action

transfers_bp = Blueprint('transfers', __name__)


@transfers_bp.route('', methods=['GET'])
@jwt_required()
def list_transfers():
    page = request.args.get('page', 1, type=int)
    query = AssetTransfer.query.order_by(AssetTransfer.created_at.desc())
    paginated = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [t.to_dict() for t in paginated.items], 'total': paginated.total, 'pages': paginated.pages}), 200


@transfers_bp.route('', methods=['POST'])
@jwt_required()
def create_transfer():
    user_id = get_jwt_identity()
    data = request.get_json()
    asset = Asset.query.get_or_404(data['asset_id'])

    transfer = AssetTransfer(
        transfer_number=f'TRF-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
        asset_id=data['asset_id'],
        transfer_type=data.get('transfer_type', 'employee'),
        from_employee_id=data.get('from_employee_id') or asset.current_employee_id,
        to_employee_id=data.get('to_employee_id'),
        from_department_id=data.get('from_department_id') or asset.department_id,
        to_department_id=data.get('to_department_id'),
        from_location_id=data.get('from_location_id') or asset.location_id,
        to_location_id=data.get('to_location_id'),
        from_branch_id=data.get('from_branch_id'),
        to_branch_id=data.get('to_branch_id'),
        status='pending',
        reason=data.get('reason'),
        condition_at_transfer=data.get('condition', 'good'),
        initiated_by=user_id,
        notes=data.get('notes'),
    )
    db.session.add(transfer)
    db.session.commit()
    return jsonify(transfer.to_dict()), 201


@transfers_bp.route('/<int:transfer_id>/complete', methods=['POST'])
@jwt_required()
def complete_transfer(transfer_id):
    user_id = get_jwt_identity()
    transfer = AssetTransfer.query.get_or_404(transfer_id)
    asset = Asset.query.get(transfer.asset_id)

    transfer.status = 'completed'
    transfer.transfer_date = datetime.now(timezone.utc)
    transfer.approved_by = user_id
    transfer.approved_at = datetime.now(timezone.utc)

    # Close any active allocations for this asset to prevent them from showing as overdue
    from models.allocation import AssetAllocation
    from models.return_model import AssetReturn
    from datetime import date
    import secrets
    
    active_allocs = AssetAllocation.query.filter_by(asset_id=asset.id).filter(
        AssetAllocation.status.in_(['allocated', 'acknowledged'])
    ).all()
    for alloc in active_allocs:
        alloc.status = 'returned'
        alloc.actual_return_date = date.today()
        
        # Automatically generate a completed return record
        auto_return = AssetReturn(
            return_number=f'RET-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
            allocation_id=alloc.id,
            asset_id=alloc.asset_id,
            employee_id=alloc.employee_id,
            status='completed',
            condition_on_return=transfer.condition_at_transfer or 'good',
            initiated_by=user_id,
            it_verified_by=user_id,
            it_verified_at=datetime.now(timezone.utc),
            approved_by=user_id,
            approved_at=datetime.now(timezone.utc),
            notes='Auto-generated from transfer completion'
        )
        db.session.add(auto_return)

    # Update asset
    if transfer.to_employee_id:
        asset.current_employee_id = transfer.to_employee_id
        asset.status = 'allocated'
        
        # Create a new allocation for the new employee
        new_alloc = AssetAllocation(
            allocation_number=f'ALLOC-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
            asset_id=asset.id,
            employee_id=transfer.to_employee_id,
            department_id=transfer.to_department_id or asset.department_id,
            status='allocated',
            allocation_date=datetime.now(timezone.utc),
            purpose=transfer.reason,
            requested_by=user_id,
            notes='Auto-generated from transfer'
        )
        db.session.add(new_alloc)
    else:
        # If transferred to IT Store / No employee, mark as available and clear employee
        asset.current_employee_id = None
        asset.status = 'available'
        
    if transfer.to_department_id:
        asset.department_id = transfer.to_department_id
    if transfer.to_location_id:
        asset.location_id = transfer.to_location_id

    db.session.add(AssetHistory(
        asset_id=asset.id,
        event_type='transferred',
        description=f'Asset transferred ({transfer.transfer_type})',
        performed_by=user_id,
        reference_id=transfer.id,
        reference_type='transfer',
    ))
    db.session.commit()
    return jsonify(transfer.to_dict()), 200


@transfers_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    import io, csv
    from flask import send_file
    time_range = request.args.get('time_range', 'lifetime')
    query = AssetTransfer.query
    
    if time_range != 'lifetime':
        from datetime import datetime, timedelta, timezone
        days = int(time_range)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(AssetTransfer.created_at >= cutoff)
        
    transfers = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Select Asset (Name & Tag)', 'Transfer From(Employee)', 'Transfer To (Employee)', 'Reason for Transfer'
    ])
    for trf in transfers:
        asset_str = f"{trf.asset.asset_name if trf.asset else ''} ({trf.asset.asset_tag if trf.asset else ''})"
        writer.writerow([
            asset_str,
            trf.from_employee.full_name if trf.from_employee else 'IT Store',
            trf.to_employee.full_name if trf.to_employee else '',
            trf.reason or ''
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='gppl_transfers.csv'
    )
