"""
Assets API — Full CRUD, QR generation, bulk import/export, filtering
"""
import os
import csv
import io
import pandas as pd
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from sqlalchemy.exc import IntegrityError
from extensions import db
from models.asset import Asset, AssetCategory, AssetSubcategory
from models.employee import Department
from models.history import AssetHistory
from models.user import User
from models.vendor import Vendor
from services.qr_service import generate_qr_base64, generate_barcode_base64
from middleware.audit_middleware import log_action
from utils import parse_date
from openpyxl.worksheet.datavalidation import DataValidation

assets_bp = Blueprint('assets', __name__)


def _generate_asset_tag():
    """Auto-generate unique asset tag: GPPL-YYYYMMDD-XXXX"""
    from sqlalchemy import func
    today = datetime.now().strftime('%Y%m%d')
    count = Asset.query.filter(
        Asset.asset_tag.like(f'GPPL-{today}-%')
    ).count()
    return f'GPPL-{today}-{count + 1:04d}'


def _paginate(query, page, per_page):
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': paginated.items,
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
        'per_page': per_page,
        'has_next': paginated.has_next,
        'has_prev': paginated.has_prev,
    }


# ── Asset CRUD ─────────────────────────────────────────────────────────────

@assets_bp.route('', methods=['GET'])
@jwt_required()
def list_assets():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '')
    status = request.args.get('status')
    category_name = request.args.get('category_name')
    department_id = request.args.get('department_id', type=int)
    condition = request.args.get('condition')
    vendor_id = request.args.get('vendor_id', type=int)
    sort_by = request.args.get('sort_by', 'created_at')
    sort_dir = request.args.get('sort_dir', 'desc')

    query = Asset.query.filter_by(is_active=True)

    if search:
        query = query.filter(or_(
            Asset.asset_tag.ilike(f'%{search}%'),
            Asset.asset_name.ilike(f'%{search}%'),
            Asset.serial_number.ilike(f'%{search}%'),
            Asset.brand.ilike(f'%{search}%'),
            Asset.model.ilike(f'%{search}%'),
            Asset.invoice_number.ilike(f'%{search}%'),
        ))
    if status:
        query = query.filter_by(status=status)
    if category_name:
        from models.asset import AssetCategory
        query = query.join(AssetCategory, Asset.category_id == AssetCategory.id).filter(db.func.lower(AssetCategory.name) == category_name.lower())
    if department_id:
        query = query.filter_by(department_id=department_id)
    if condition:
        query = query.filter_by(condition=condition)
    if vendor_id:
        query = query.filter_by(vendor_id=vendor_id)

    sort_col = getattr(Asset, sort_by, Asset.created_at)
    if sort_dir == 'desc':
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    result = _paginate(query, page, per_page)
    result['items'] = [a.to_dict() for a in result['items']]
    return jsonify(result), 200


@assets_bp.route('/<int:asset_id>', methods=['GET'])
@jwt_required()
def get_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    return jsonify(asset.to_dict(include_history=True)), 200


@assets_bp.route('', methods=['POST'])
@jwt_required()
def create_asset():
    user_id = get_jwt_identity()
    data = request.get_json()

    category_id = data.get('category_id')
    category_name = data.get('category_name')
    if category_name:
        cat = AssetCategory.query.filter(db.func.lower(AssetCategory.name) == category_name.lower()).first()
        if not cat:
            cat = AssetCategory(name=category_name, code=category_name[:4].upper() + str(len(category_name)))
            db.session.add(cat)
            db.session.flush()
        category_id = cat.id

    if not data.get('asset_name') or not category_id:
        return jsonify({'error': 'asset_name and category_name are required'}), 400

    department_id = data.get('department_id')

    tag = data.get('asset_tag') or _generate_asset_tag()

    # Generate QR content pointing to asset profile
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    qr_data = f"{frontend_url}/assets/{tag}"

    asset = Asset(
        asset_tag=tag,
        asset_name=data['asset_name'],
        category_id=category_id,
        subcategory_id=data.get('subcategory_id'),
        brand=data.get('brand'),
        model=data.get('model'),
        serial_number=data.get('serial_number') or None,
        description=data.get('description'),
        specifications=data.get('specifications', {}),
        vendor_id=data.get('vendor_id'),
        purchase_order_id=data.get('purchase_order_id'),
        invoice_number=data.get('invoice_number'),
        purchase_date=parse_date(data.get('purchase_date')),
        purchase_cost=data.get('purchase_cost'),
        warranty_start=parse_date(data.get('warranty_start')),
        warranty_end=parse_date(data.get('warranty_end')),
        warranty_details=data.get('warranty_details'),
        amc_start=parse_date(data.get('amc_start')),
        amc_end=parse_date(data.get('amc_end')),
        amc_vendor_id=data.get('amc_vendor_id'),
        status=data.get('status', 'available'),
        condition=data.get('condition', 'new'),
        department_id=department_id,
        location_id=data.get('location_id'),
        remarks=data.get('remarks'),
        qr_code=generate_qr_base64(qr_data),
        barcode=generate_barcode_base64(tag),
        created_by=user_id,
    )

    db.session.add(asset)
    
    try:
        db.session.flush()
    except IntegrityError as e:
        db.session.rollback()
        if 'serial_number' in str(e):
            return jsonify({'error': 'An asset with this serial number already exists'}), 400
        return jsonify({'error': 'A unique constraint failed (possibly asset tag or serial number)'}), 400

    # Record history
    history = AssetHistory(
        asset_id=asset.id,
        event_type='created',
        description=f'Asset {tag} created',
        performed_by=user_id,
    )
    db.session.add(history)
    db.session.commit()

    log_action('create', 'assets', f'Created asset {tag}', entity_id=asset.id, entity_type='asset')
    return jsonify(asset.to_dict()), 201


@assets_bp.route('/<int:asset_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_asset(asset_id):
    user_id = get_jwt_identity()
    asset = Asset.query.get_or_404(asset_id)
    data = request.get_json()
    old = asset.to_dict()

    if 'category_name' in data:
        category_name = data['category_name']
        if category_name:
            cat = AssetCategory.query.filter(db.func.lower(AssetCategory.name) == category_name.lower()).first()
            if not cat:
                cat = AssetCategory(name=category_name, code=category_name[:4].upper() + str(len(category_name)))
                db.session.add(cat)
                db.session.flush()
            data['category_id'] = cat.id
        else:
            data['category_id'] = None

    updatable = [
        'asset_name', 'category_id', 'subcategory_id', 'brand', 'model',
        'serial_number', 'description', 'specifications', 'vendor_id',
        'invoice_number', 'purchase_date', 'purchase_cost', 'warranty_start',
        'warranty_end', 'warranty_details', 'amc_start', 'amc_end',
        'amc_vendor_id', 'status', 'condition', 'department_id', 'location_id',
        'remarks', 'primary_image', 'images'
    ]
    changed = {}
    for field in updatable:
        if field in data:
            old_val = getattr(asset, field)
            new_val = data[field]
            if field in ['purchase_date', 'warranty_start', 'warranty_end', 'amc_start', 'amc_end']:
                new_val = parse_date(new_val)
            if field == 'serial_number' and not new_val:
                new_val = None
            if old_val != new_val:
                changed[field] = {'from': old_val, 'to': new_val}
            setattr(asset, field, new_val)

    if changed:
        history = AssetHistory(
            asset_id=asset.id,
            event_type='updated',
            description=f'Asset {asset.asset_tag} updated',
            old_value=old,
            new_value=asset.to_dict(),
            performed_by=user_id,
        )
        db.session.add(history)

    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        if 'serial_number' in str(e):
            return jsonify({'error': 'An asset with this serial number already exists'}), 400
        return jsonify({'error': 'A unique constraint failed'}), 400

    log_action('update', 'assets', f'Updated asset {asset.asset_tag}', entity_id=asset.id, entity_type='asset', old_values=old, new_values=asset.to_dict())
    return jsonify(asset.to_dict()), 200


@assets_bp.route('/<int:asset_id>', methods=['DELETE'])
@jwt_required()
def delete_asset(asset_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role.name not in ('super_admin', 'it_admin'):
        return jsonify({'error': 'Insufficient permissions'}), 403

    asset = Asset.query.get_or_404(asset_id)
    if asset.status == 'allocated':
        return jsonify({'error': 'Cannot delete an allocated asset. Return it first.'}), 400

    import time
    asset.is_active = False
    asset.status = 'disposed'
    suffix = f"_deleted_{int(time.time())}_{asset.id}"
    if asset.serial_number:
        asset.serial_number = f"{asset.serial_number}{suffix}"
    if asset.asset_tag:
        asset.asset_tag = f"{asset.asset_tag}{suffix}"
    db.session.commit()
    log_action('delete', 'assets', f'Soft-deleted asset {asset.asset_tag}', entity_id=asset.id, entity_type='asset')
    return jsonify({'message': 'Asset deleted successfully'}), 200


# ── Categories ─────────────────────────────────────────────────────────────

@assets_bp.route('/categories', methods=['GET'])
@jwt_required()
def list_categories():
    cats = AssetCategory.query.filter_by(is_active=True).order_by(AssetCategory.name).all()
    return jsonify([c.to_dict() for c in cats]), 200


@assets_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    data = request.get_json()
    cat = AssetCategory(
        name=data['name'],
        code=data['code'],
        icon=data.get('icon', 'package'),
        description=data.get('description'),
        depreciation_rate=data.get('depreciation_rate', 20),
        useful_life_years=data.get('useful_life_years', 5),
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@assets_bp.route('/categories/<int:cat_id>', methods=['DELETE'])
@jwt_required()
def delete_category(cat_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role.name not in ('super_admin', 'it_admin'):
        return jsonify({'error': 'Insufficient permissions'}), 403

    cat = AssetCategory.query.get_or_404(cat_id)
    if cat.assets.count() > 0:
        return jsonify({'error': 'Cannot delete category that is assigned to assets'}), 400

    db.session.delete(cat)
    db.session.commit()
    return jsonify({'message': 'Category deleted successfully'}), 200


@assets_bp.route('/categories/<int:cat_id>/subcategories', methods=['GET'])
@jwt_required()
def list_subcategories(cat_id):
    subs = AssetSubcategory.query.filter_by(category_id=cat_id, is_active=True).all()
    return jsonify([s.to_dict() for s in subs]), 200


# ── QR / Barcode ───────────────────────────────────────────────────────────

@assets_bp.route('/<int:asset_id>/qr', methods=['GET'])
@jwt_required()
def get_qr(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    if not asset.qr_code:
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        asset.qr_code = generate_qr_base64(f"{frontend_url}/assets/{asset.asset_tag}")
        db.session.commit()
    return jsonify({'qr_code': asset.qr_code, 'asset_tag': asset.asset_tag}), 200


@assets_bp.route('/<int:asset_id>/barcode', methods=['GET'])
@jwt_required()
def get_barcode(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    if not asset.barcode:
        asset.barcode = generate_barcode_base64(asset.asset_tag)
        db.session.commit()
    return jsonify({'barcode': asset.barcode, 'asset_tag': asset.asset_tag}), 200


# ── Export ─────────────────────────────────────────────────────────────────

@assets_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    time_range = request.args.get('time_range', 'lifetime')
    query = Asset.query.filter_by(is_active=True)
    
    if time_range != 'lifetime':
        from datetime import datetime, timedelta, timezone
        days = int(time_range)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Asset.created_at >= cutoff)
        
    assets = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Asset Name', 'Asset Tag', 'Category', 'Brand', 'Model',
        'Serial Number', 'Status', 'Condition', 'Vendor',
        'Purchase Cost', 'Purchase Date', 'Warranty End Date',
        'Description / Remarks'
    ])
    for a in assets:
        writer.writerow([
            a.asset_name, a.asset_tag,
            a.category.name if a.category else '',
            a.brand, a.model, a.serial_number,
            a.status, a.condition,
            a.vendor.name if a.vendor else '',
            a.purchase_cost, a.purchase_date,
            a.warranty_end, a.description
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='gppl_assets.csv'
    )


@assets_bp.route('/import/excel', methods=['POST'])
@jwt_required()
def import_excel():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        return jsonify({'error': 'Only Excel or CSV files are supported'}), 400

    try:
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        # Clean dataframe: replace NaNs with None
        df = df.where(pd.notnull(df), None)

        required_cols = ['Asset Name', 'Category']
        for col in required_cols:
            if col not in df.columns:
                return jsonify({'error': f'Missing required column: {col}'}), 400

        imported_count = 0
        skipped_count = 0
        seen_serials = set()

        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

        for index, row in df.iterrows():
            asset_name = row.get('Asset Name')
            category_name = row.get('Category')
            asset_tag = row.get('Asset Tag')
            serial = row.get('Serial Number')

            # Skip duplicates within the excel file
            if serial and pd.notna(serial):
                serial_str = str(serial).strip()
                if serial_str and serial_str.lower() not in ('na', 'n/a', 'none', 'null'):
                    if serial_str in seen_serials:
                        skipped_count += 1
                        continue
                    seen_serials.add(serial_str)

            if not asset_name:
                asset_name = "NA"
            if not category_name:
                category_name = "NA"

            # Look up or create category
            cat = AssetCategory.query.filter(AssetCategory.name.ilike(category_name)).first()
            if not cat:
                # Create a default category code
                code = str(category_name).upper()[:4].strip()
                cat = AssetCategory(name=str(category_name), code=code)
                db.session.add(cat)
                db.session.flush() # flush to get cat.id

            tag = None
            if asset_tag and pd.notna(asset_tag):
                tag = str(asset_tag).strip()
                # Check if asset tag already exists to avoid integrity error
                if Asset.query.filter_by(asset_tag=tag).first():
                    skipped_count += 1
                    continue
            else:
                tag = _generate_asset_tag()
                
            qr_data = f"{frontend_url}/assets/{tag}"
            
            serial_val = None
            if serial and pd.notna(serial):
                temp_serial = str(serial).strip()
                if temp_serial and temp_serial.lower() not in ('na', 'n/a', 'none', 'null'):
                    serial_val = temp_serial
                    # Check for existing serial in DB to avoid integrity errors
                    if Asset.query.filter_by(serial_number=serial_val).first():
                        skipped_count += 1
                        continue

            cost = row.get('Purchase Cost')
            try:
                cost = float(cost) if cost else None
            except:
                cost = None
                
            vendor_name = row.get('Vendor')
            vendor_id = None
            if vendor_name:
                v = Vendor.query.filter(Vendor.name.ilike(str(vendor_name))).first()
                if not v:
                    code = str(vendor_name).upper()[:4].strip() + str(db.session.query(Vendor).count())
                    v = Vendor(name=str(vendor_name), code=code, is_active=True)
                    db.session.add(v)
                    db.session.flush()
                vendor_id = v.id

            p_date_obj = None
            purch_date = row.get('Purchase Date')
            if purch_date:
                try:
                    p_date_obj = pd.to_datetime(purch_date, format='%d-%m-%Y').date()
                except:
                    try:
                        p_date_obj = pd.to_datetime(purch_date).date()
                    except:
                        pass
                        
            w_date_obj = None
            warr_end = row.get('Warranty End Date')
            if warr_end:
                try:
                    w_date_obj = pd.to_datetime(warr_end, format='%d-%m-%Y').date()
                except:
                    try:
                        w_date_obj = pd.to_datetime(warr_end).date()
                    except:
                        pass

            asset = Asset(
                asset_tag=tag,
                asset_name=str(asset_name),
                category_id=cat.id,
                brand=str(row.get('Brand')) if row.get('Brand') else None,
                model=str(row.get('Model')) if row.get('Model') else None,
                serial_number=serial_val,
                status=str(row.get('Status')).lower() if row.get('Status') else 'available',
                condition=str(row.get('Condition')).lower() if row.get('Condition') else 'good',
                purchase_cost=cost,
                vendor_id=vendor_id,
                purchase_date=p_date_obj,
                warranty_end=w_date_obj,
                description=str(row.get('Description / Remarks')) if row.get('Description / Remarks') else None,
                qr_code=generate_qr_base64(qr_data),
                barcode=generate_barcode_base64(tag),
                created_by=user_id,
                is_active=True
            )
            db.session.add(asset)
            db.session.flush()

            history = AssetHistory(
                asset_id=asset.id,
                event_type='created',
                description=f'Asset {tag} imported from file',
                performed_by=user_id,
            )
            db.session.add(history)
            imported_count += 1

        db.session.commit()
        log_action('import', 'assets', f'Imported {imported_count} assets from file', user_id=user_id)
        
        return jsonify({
            'message': 'Import completed successfully',
            'imported': imported_count,
            'skipped': skipped_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


@assets_bp.route('/import/template', methods=['GET'])
@jwt_required()
def import_template():
    columns = [
        'Asset Name', 'Asset Tag', 'Category', 'Brand', 'Model',
        'Serial Number', 'Condition', 'Vendor',
        'Purchase Cost', 'Purchase Date', 'Warranty End Date',
        'Description / Remarks'
    ]
    df = pd.DataFrame(columns=columns)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
        worksheet = writer.sheets['Sheet1']
        
        # Condition is col 7 (G)
        dv_condition = DataValidation(type="list", formula1='"new,good,fair,poor,damaged"', allow_blank=True)
        worksheet.add_data_validation(dv_condition)
        dv_condition.add('G2:G1000')
        
        # Vendor is col 8 (H)
        vendors = [v.name for v in Vendor.query.filter_by(is_active=True).all()]
        if vendors:
            vendor_str = ",".join(vendors)
            if len(vendor_str) < 250:
                dv_vendor = DataValidation(type="list", formula1=f'"{vendor_str}"', allow_blank=True)
                worksheet.add_data_validation(dv_vendor)
                dv_vendor.add('H2:H1000')
    
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='asset_import_schema.xlsx'
    )


# ── History ────────────────────────────────────────────────────────────────

@assets_bp.route('/<int:asset_id>/history', methods=['GET'])
@jwt_required()
def get_history(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    page = request.args.get('page', 1, type=int)
    history = asset.history.paginate(page=page, per_page=20, error_out=False)
    return jsonify({
        'items': [h.to_dict() for h in history.items],
        'total': history.total,
        'pages': history.pages,
        'page': page,
    }), 200
