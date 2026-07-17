"""Reports API — PDF, Excel, CSV generation"""
import io
import csv
from datetime import date
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from extensions import db
from models.asset import Asset, AssetCategory
from models.employee import Employee, Department
from models.allocation import AssetAllocation
from models.maintenance import Maintenance
from models.vendor import Vendor
from models.purchase import PurchaseOrder

reports_bp = Blueprint('reports', __name__)


def _assets_data(filters=None):
    q = Asset.query.filter_by(is_active=True)
    if filters:
        if filters.get('department_id'):
            q = q.filter_by(department_id=filters['department_id'])
        if filters.get('category_id'):
            q = q.filter_by(category_id=filters['category_id'])
        if filters.get('status'):
            q = q.filter_by(status=filters['status'])
    return q.order_by(Asset.asset_tag).all()


@reports_bp.route('/assets/csv', methods=['GET'])
@jwt_required()
def asset_report_csv():
    assets = _assets_data(request.args)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Asset Tag', 'Asset Name', 'Category', 'Subcategory', 'Brand', 'Model',
        'Serial Number', 'Status', 'Condition', 'Department', 'Current Employee',
        'Location', 'Purchase Date', 'Purchase Cost (₹)', 'Depreciated Value (₹)',
        'Warranty End', 'Under Warranty', 'Vendor', 'Invoice Number', 'Remarks'
    ])
    for a in assets:
        writer.writerow([
            a.asset_tag, a.asset_name,
            a.category.name if a.category else '',
            a.subcategory.name if a.subcategory else '',
            a.brand or '', a.model or '',
            a.serial_number or '',
            a.status, a.condition,
            a.department.name if a.department else '',
            a.current_employee.full_name if a.current_employee else '',
            a.location.name if a.location else '',
            a.purchase_date or '',
            float(a.purchase_cost) if a.purchase_cost else '',
            a.depreciated_value or '',
            a.warranty_end or '',
            'Yes' if a.is_under_warranty else 'No',
            a.vendor.name if a.vendor else '',
            a.invoice_number or '',
            a.remarks or '',
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'asset_report_{date.today()}.csv'
    )


@reports_bp.route('/allocations/csv', methods=['GET'])
@jwt_required()
def allocation_report_csv():
    allocs = AssetAllocation.query.order_by(AssetAllocation.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Allocation #', 'Asset Tag', 'Asset Name', 'Employee ID', 'Employee Name',
        'Department', 'Status', 'Request Date', 'Allocation Date', 'Expected Return',
        'Actual Return', 'Purpose'
    ])
    for a in allocs:
        writer.writerow([
            a.allocation_number,
            a.asset.asset_tag if a.asset else '',
            a.asset.asset_name if a.asset else '',
            a.employee.employee_id if a.employee else '',
            a.employee.full_name if a.employee else '',
            a.employee.department.name if a.employee and a.employee.department else '',
            a.status,
            a.request_date.strftime('%Y-%m-%d') if a.request_date else '',
            a.allocation_date.strftime('%Y-%m-%d') if a.allocation_date else '',
            a.expected_return_date or '',
            a.actual_return_date or '',
            a.purpose or '',
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'allocation_report_{date.today()}.csv'
    )


@reports_bp.route('/maintenance/csv', methods=['GET'])
@jwt_required()
def maintenance_report_csv():
    records = Maintenance.query.order_by(Maintenance.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Maintenance #', 'Asset Tag', 'Asset Name', 'Type', 'Status',
        'Problem', 'Scheduled Date', 'Completion Date', 'Cost (₹)',
        'Vendor', 'Technician', 'Under Warranty', 'Under AMC'
    ])
    for m in records:
        writer.writerow([
            m.maintenance_number,
            m.asset.asset_tag if m.asset else '',
            m.asset.asset_name if m.asset else '',
            m.maintenance_type, m.status,
            m.problem_description[:100] if m.problem_description else '',
            m.scheduled_date or '',
            m.completion_date or '',
            float(m.cost) if m.cost else 0,
            m.vendor.name if m.vendor else '',
            m.technician_name or '',
            'Yes' if m.is_under_warranty else 'No',
            'Yes' if m.is_under_amc else 'No',
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'maintenance_report_{date.today()}.csv'
    )


@reports_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary_report():
    """JSON summary for report dashboard."""
    from sqlalchemy import func
    total_cost = db.session.query(func.sum(Asset.purchase_cost)).filter(Asset.is_active == True).scalar() or 0
    total_maint_cost = db.session.query(func.sum(Maintenance.cost)).filter(Maintenance.status == 'completed').scalar() or 0
    return jsonify({
        'total_assets': Asset.query.filter_by(is_active=True).count(),
        'total_purchase_cost': float(total_cost),
        'total_maintenance_cost': float(total_maint_cost),
        'total_allocations': AssetAllocation.query.count(),
        'active_allocations': AssetAllocation.query.filter_by(status='allocated').count(),
        'total_employees': Employee.query.filter_by(status='active').count(),
        'total_vendors': Vendor.query.filter_by(is_active=True).count(),
        'total_purchase_orders': PurchaseOrder.query.count(),
        'warranty_expired': Asset.query.filter(
            Asset.warranty_end < date.today(), Asset.is_active == True
        ).count(),
    }), 200
