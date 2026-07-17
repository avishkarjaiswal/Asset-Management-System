"""Returns API"""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.return_model import AssetReturn
from models.allocation import AssetAllocation
from models.asset import Asset
from models.history import AssetHistory
from middleware.audit_middleware import log_action

returns_bp = Blueprint('returns', __name__)


@returns_bp.route('', methods=['GET'])
@jwt_required()
def list_returns():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    query = AssetReturn.query
    if status:
        query = query.filter_by(status=status)
    query = query.order_by(AssetReturn.created_at.desc())
    paginated = query.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [r.to_dict() for r in paginated.items], 'total': paginated.total, 'pages': paginated.pages}), 200


@returns_bp.route('', methods=['POST'])
@jwt_required()
def initiate_return():
    user_id = get_jwt_identity()
    data = request.get_json()
    allocation_id = data.get('allocation_id')
    alloc = AssetAllocation.query.get_or_404(allocation_id)

    if alloc.status not in ('allocated', 'acknowledged'):
        return jsonify({'error': 'Asset not in allocated state'}), 400

    ret = AssetReturn(
        return_number=f'RET-{datetime.now().strftime("%Y%m%d")}-{secrets.randbelow(9000)+1000}',
        allocation_id=allocation_id,
        asset_id=alloc.asset_id,
        employee_id=alloc.employee_id,
        status='pending',
        condition_on_return=data.get('condition', 'good'),
        accessories_returned=data.get('accessories_returned', []),
        accessories_missing=data.get('accessories_missing', []),
        damage_description=data.get('damage_description'),
        damage_cost=data.get('damage_cost', 0),
        initiated_by=user_id,
        notes=data.get('notes'),
    )
    db.session.add(ret)
    db.session.commit()
    return jsonify(ret.to_dict()), 201


@returns_bp.route('/<int:ret_id>/verify', methods=['POST'])
@jwt_required()
def verify_return(ret_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    ret = AssetReturn.query.get_or_404(ret_id)
    ret.status = 'it_verified'
    ret.it_verified_by = user_id
    ret.it_verified_at = datetime.now(timezone.utc)
    ret.it_remarks = data.get('remarks', '')
    db.session.commit()
    return jsonify(ret.to_dict()), 200


@returns_bp.route('/<int:ret_id>/complete', methods=['POST'])
@jwt_required()
def complete_return(ret_id):
    user_id = get_jwt_identity()
    ret = AssetReturn.query.get_or_404(ret_id)

    ret.status = 'completed'
    ret.approved_by = user_id
    ret.approved_at = datetime.now(timezone.utc)

    # Update allocation & asset
    alloc = AssetAllocation.query.get(ret.allocation_id)
    if alloc:
        alloc.status = 'returned'
        alloc.actual_return_date = datetime.now(timezone.utc).date()
        alloc.is_active = False

    asset = Asset.query.get(ret.asset_id)
    if asset:
        asset.status = 'available'
        asset.current_employee_id = None
        asset.condition = ret.condition_on_return
        db.session.add(AssetHistory(
            asset_id=asset.id,
            event_type='returned',
            description=f'Asset returned by employee {ret.employee_id}',
            performed_by=user_id,
            reference_id=ret.id,
            reference_type='return',
        ))

    db.session.commit()
    log_action('return', 'returns', f'Asset return {ret.return_number} completed', entity_id=ret.id, user_id=user_id)
    return jsonify(ret.to_dict()), 200


@returns_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    import io, csv
    from flask import send_file
    time_range = request.args.get('time_range', 'lifetime')
    query = AssetReturn.query
    
    if time_range != 'lifetime':
        from datetime import datetime, timedelta, timezone
        days = int(time_range)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(AssetReturn.created_at >= cutoff)
        
    returns = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Active Allocation (Asset & Employee)', 'Condition upon Return',
        'Damage Description (If any)', 'Additional Notes'
    ])
    for ret in returns:
        alloc_str = f"{ret.asset.asset_name if ret.asset else ''} ({ret.asset.asset_tag if ret.asset else ''}) - Assigned to {ret.employee.full_name if ret.employee else ''}"
        writer.writerow([
            alloc_str,
            ret.condition_on_return,
            ret.damage_description or '',
            ret.notes or ''
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='gppl_returns.csv'
    )
