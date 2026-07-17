"""
Dashboard API — stats, charts, recent activities, widgets
"""
from datetime import datetime, timezone, timedelta, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, extract
from extensions import db
from models.asset import Asset, AssetCategory
from models.employee import Employee, Department
from models.allocation import AssetAllocation
from models.maintenance import Maintenance
from models.complaint import Complaint
from models.vendor import Vendor
from models.purchase import PurchaseOrder
from models.history import AssetHistory
from models.notification import Notification

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Return all KPI stat cards for the dashboard."""
    today = date.today()
    thirty_days = today + timedelta(days=30)

    total_assets = Asset.query.filter_by(is_active=True).count()
    available = Asset.query.filter_by(status='available', is_active=True).count()
    allocated = Asset.query.filter_by(status='allocated', is_active=True).count()
    in_maintenance = Asset.query.filter_by(status='in_maintenance', is_active=True).count()
    lost = Asset.query.filter_by(status='lost', is_active=True).count()
    scrapped = Asset.query.filter_by(status='scrapped', is_active=True).count()

    warranty_expiring = Asset.query.filter(
        Asset.warranty_end.isnot(None),
        Asset.warranty_end <= thirty_days,
        Asset.warranty_end >= today,
        Asset.is_active == True
    ).count()

    pending_requests = AssetAllocation.query.filter_by(status='pending').count()
    today_requests = AssetAllocation.query.filter(
        func.date(AssetAllocation.created_at) == today
    ).count()

    total_employees = Employee.query.filter_by(status='active').count()
    total_departments = Department.query.filter_by(is_active=True).count()
    total_vendors = Vendor.query.filter_by(is_active=True).count()

    total_cost_result = db.session.query(func.sum(Asset.purchase_cost)).filter(
        Asset.is_active == True
    ).scalar()
    total_cost = float(total_cost_result) if total_cost_result else 0

    open_complaints = Complaint.query.filter(
        Complaint.status.in_(['open', 'assigned', 'in_progress'])
    ).count()

    upcoming_maintenance = Maintenance.query.filter(
        Maintenance.scheduled_date.isnot(None),
        Maintenance.scheduled_date <= thirty_days,
        Maintenance.scheduled_date >= today,
        Maintenance.status.in_(['open', 'assigned'])
    ).count()

    overdue_returns = AssetAllocation.query.filter(
        AssetAllocation.expected_return_date.isnot(None),
        AssetAllocation.expected_return_date < today,
        AssetAllocation.status.in_(['allocated', 'acknowledged'])
    ).count()

    asset_utilization = round((allocated / total_assets * 100), 1) if total_assets > 0 else 0

    return jsonify({
        'total_assets': total_assets,
        'available': available,
        'allocated': allocated,
        'in_maintenance': in_maintenance,
        'lost': lost,
        'scrapped': scrapped,
        'warranty_expiring': warranty_expiring,
        'pending_requests': pending_requests,
        'today_requests': today_requests,
        'total_employees': total_employees,
        'total_departments': total_departments,
        'total_vendors': total_vendors,
        'total_purchase_cost': total_cost,
        'asset_utilization': asset_utilization,
        'open_complaints': open_complaints,
        'upcoming_maintenance': upcoming_maintenance,
        'overdue_returns': overdue_returns,
    }), 200


@dashboard_bp.route('/charts/department-assets', methods=['GET'])
@jwt_required()
def dept_asset_chart():
    """Assets distributed by department."""
    results = db.session.query(
        Department.name,
        func.count(Asset.id).label('count')
    ).join(Asset, Asset.department_id == Department.id)\
     .filter(Asset.is_active == True)\
     .group_by(Department.name)\
     .order_by(func.count(Asset.id).desc())\
     .limit(10).all()

    return jsonify([{'department': r[0], 'count': r[1]} for r in results]), 200


@dashboard_bp.route('/charts/category-assets', methods=['GET'])
@jwt_required()
def category_asset_chart():
    """Asset count by category."""
    results = db.session.query(
        AssetCategory.name,
        func.count(Asset.id).label('count')
    ).join(Asset, Asset.category_id == AssetCategory.id)\
     .filter(Asset.is_active == True)\
     .group_by(AssetCategory.name)\
     .order_by(func.count(Asset.id).desc())\
     .all()

    return jsonify([{'category': r[0], 'count': r[1]} for r in results]), 200


@dashboard_bp.route('/charts/status-distribution', methods=['GET'])
@jwt_required()
def status_distribution():
    """Pie chart: asset status breakdown."""
    results = db.session.query(
        Asset.status,
        func.count(Asset.id).label('count')
    ).filter(Asset.is_active == True)\
     .group_by(Asset.status).all()

    return jsonify([{'status': r[0], 'count': r[1]} for r in results]), 200


@dashboard_bp.route('/charts/monthly-purchases', methods=['GET'])
@jwt_required()
def monthly_purchases():
    """Bar chart: monthly purchase count & cost for last 12 months."""
    results = db.session.query(
        extract('year', Asset.purchase_date).label('year'),
        extract('month', Asset.purchase_date).label('month'),
        func.count(Asset.id).label('count'),
        func.sum(Asset.purchase_cost).label('cost')
    ).filter(
        Asset.purchase_date.isnot(None),
        Asset.purchase_date >= (date.today() - timedelta(days=365))
    ).group_by('year', 'month').order_by('year', 'month').all()

    return jsonify([{
        'year': int(r[0]),
        'month': int(r[1]),
        'count': r[2],
        'cost': float(r[3]) if r[3] else 0
    } for r in results]), 200


@dashboard_bp.route('/charts/maintenance-cost', methods=['GET'])
@jwt_required()
def maintenance_cost():
    """Monthly maintenance cost for last 12 months."""
    results = db.session.query(
        extract('year', Maintenance.completion_date).label('year'),
        extract('month', Maintenance.completion_date).label('month'),
        func.sum(Maintenance.cost).label('total')
    ).filter(
        Maintenance.completion_date.isnot(None),
        Maintenance.status == 'completed',
        Maintenance.completion_date >= (date.today() - timedelta(days=365))
    ).group_by('year', 'month').order_by('year', 'month').all()

    return jsonify([{
        'year': int(r[0]),
        'month': int(r[1]),
        'total': float(r[2]) if r[2] else 0
    } for r in results]), 200


@dashboard_bp.route('/recent-activities', methods=['GET'])
@jwt_required()
def recent_activities():
    """Last 20 asset history events."""
    history = AssetHistory.query.order_by(
        AssetHistory.created_at.desc()
    ).limit(20).all()
    return jsonify([h.to_dict() for h in history]), 200


@dashboard_bp.route('/upcoming-warranty', methods=['GET'])
@jwt_required()
def upcoming_warranty():
    """Assets with warranty expiring in next 60 days."""
    cutoff = date.today() + timedelta(days=60)
    assets = Asset.query.filter(
        Asset.warranty_end.isnot(None),
        Asset.warranty_end >= date.today(),
        Asset.warranty_end <= cutoff,
        Asset.is_active == True
    ).order_by(Asset.warranty_end).limit(10).all()
    return jsonify([{
        'id': a.id,
        'asset_tag': a.asset_tag,
        'asset_name': a.asset_name,
        'brand': a.brand,
        'model': a.model,
        'warranty_end': a.warranty_end.isoformat(),
        'department': a.department.name if a.department else None,
    } for a in assets]), 200


@dashboard_bp.route('/upcoming-maintenance', methods=['GET'])
@jwt_required()
def upcoming_maintenance():
    """Maintenance scheduled in next 30 days."""
    cutoff = date.today() + timedelta(days=30)
    records = Maintenance.query.filter(
        Maintenance.scheduled_date.isnot(None),
        Maintenance.scheduled_date >= date.today(),
        Maintenance.scheduled_date <= cutoff,
        Maintenance.status.in_(['open', 'assigned'])
    ).order_by(Maintenance.scheduled_date).limit(10).all()
    return jsonify([m.to_dict() for m in records]), 200


@dashboard_bp.route('/recent-allocations', methods=['GET'])
@jwt_required()
def recent_allocations():
    """Last 10 allocations."""
    allocs = AssetAllocation.query.order_by(
        AssetAllocation.created_at.desc()
    ).limit(10).all()
    return jsonify([a.to_dict() for a in allocs]), 200


@dashboard_bp.route('/overdue-returns', methods=['GET'])
@jwt_required()
def overdue_returns():
    """Allocations that are past their expected return date."""
    today = date.today()
    allocs = AssetAllocation.query.filter(
        AssetAllocation.expected_return_date.isnot(None),
        AssetAllocation.expected_return_date < today,
        AssetAllocation.status.in_(['allocated', 'acknowledged'])
    ).order_by(AssetAllocation.expected_return_date).limit(10).all()
    
    return jsonify([{
        'id': a.id,
        'allocation_number': a.allocation_number,
        'asset_name': a.asset.asset_name if a.asset else 'Unknown Asset',
        'asset_tag': a.asset.asset_tag if a.asset else '',
        'employee_name': a.employee.full_name if a.employee else 'Unknown Employee',
        'expected_return_date': a.expected_return_date.isoformat(),
        'status': a.status
    } for a in allocs]), 200
