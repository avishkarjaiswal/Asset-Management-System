"""
GPPL Enterprise Asset Management System
Flask Application Factory
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

from config import get_config
from extensions import db, migrate, jwt, cors, limiter, mail


def create_app(config_class=None):
    """Application factory pattern."""
    app = Flask(__name__)
    
    # Load config
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        }
    })
    limiter.init_app(app)
    mail.init_app(app)
    
    # Ensure upload directories exist
    upload_folder = app.config['UPLOAD_FOLDER']
    for sub in ['assets', 'invoices', 'employees', 'attachments', 'temp']:
        os.makedirs(os.path.join(upload_folder, sub), exist_ok=True)
    
    # Register blueprints
    _register_blueprints(app)
    
    # JWT error handlers
    _register_jwt_handlers(app)
    
    # Global error handlers
    _register_error_handlers(app)
    
    # Setup logging
    _setup_logging(app)
    
    # Auto-initialize database if it doesn't exist or is empty
    with app.app_context():
        try:
            from models.user import Role
            db.session.query(Role).first()
        except Exception as e:
            db.session.rollback()
            try:
                from init_db import seed_db
                app.logger.info("Database schemas not found. Creating schemas and seeding data...")
                seed_db(app)
            except Exception as seed_err:
                app.logger.error(f"Failed to auto-initialize database: {seed_err}")
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'app': app.config['APP_NAME'],
            'version': '1.0.0'
        })
    
    return app


def _register_blueprints(app):
    """Register all API blueprints."""
    from api.v1.auth import auth_bp
    from api.v1.dashboard import dashboard_bp
    from api.v1.assets import assets_bp
    from api.v1.employees import employees_bp
    from api.v1.allocations import allocations_bp
    from api.v1.returns import returns_bp
    from api.v1.transfers import transfers_bp
    from api.v1.maintenance import maintenance_bp
    from api.v1.complaints import complaints_bp
    from api.v1.vendors import vendors_bp
    from api.v1.purchases import purchases_bp
    from api.v1.notifications import notifications_bp
    from api.v1.reports import reports_bp
    from api.v1.search import search_bp
    from api.v1.audit import audit_bp
    from api.v1.uploads import uploads_bp
    from api.v1.settings import settings_bp
    from api.v1.departments import departments_bp
    from api.v1.capital_sanctions import capital_sanctions_bp
    from api.v1.approval_members import approval_members_bp

    from api.v1.admin import admin_bp

    prefix = '/api/v1'
    app.register_blueprint(admin_bp,         url_prefix=f'{prefix}/admin')
    app.register_blueprint(auth_bp,          url_prefix=f'{prefix}/auth')
    app.register_blueprint(dashboard_bp,     url_prefix=f'{prefix}/dashboard')
    app.register_blueprint(assets_bp,        url_prefix=f'{prefix}/assets')
    app.register_blueprint(employees_bp,     url_prefix=f'{prefix}/employees')
    app.register_blueprint(allocations_bp,   url_prefix=f'{prefix}/allocations')
    app.register_blueprint(returns_bp,       url_prefix=f'{prefix}/returns')
    app.register_blueprint(transfers_bp,     url_prefix=f'{prefix}/transfers')
    app.register_blueprint(maintenance_bp,   url_prefix=f'{prefix}/maintenance')
    app.register_blueprint(complaints_bp,    url_prefix=f'{prefix}/complaints')
    app.register_blueprint(vendors_bp,       url_prefix=f'{prefix}/vendors')
    app.register_blueprint(purchases_bp,     url_prefix=f'{prefix}/purchases')
    app.register_blueprint(notifications_bp, url_prefix=f'{prefix}/notifications')
    app.register_blueprint(reports_bp,       url_prefix=f'{prefix}/reports')
    app.register_blueprint(search_bp,        url_prefix=f'{prefix}/search')
    app.register_blueprint(audit_bp,         url_prefix=f'{prefix}/audit')
    app.register_blueprint(uploads_bp,       url_prefix=f'{prefix}/uploads')
    app.register_blueprint(settings_bp,      url_prefix=f'{prefix}/settings')
    app.register_blueprint(departments_bp,   url_prefix=f'{prefix}/departments')
    app.register_blueprint(capital_sanctions_bp, url_prefix=f'{prefix}/capital-sanctions')
    app.register_blueprint(approval_members_bp,  url_prefix=f'{prefix}/approval-members')


def _register_jwt_handlers(app):
    """Custom JWT error responses."""
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'code': 'INVALID_TOKEN'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token required', 'code': 'TOKEN_MISSING'}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked', 'code': 'TOKEN_REVOKED'}), 401


def _register_error_handlers(app):
    """Global HTTP error handlers."""
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'message': str(e)}), 400

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden', 'message': 'You do not have permission'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found', 'message': str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({'error': 'Rate limit exceeded', 'retry_after': str(e.retry_after)}), 429

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        app.logger.error(f'Internal error: {e}')
        return jsonify({'error': 'Internal server error'}), 500


def _setup_logging(app):
    """Configure rotating file logger."""
    if not app.debug:
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        handler = RotatingFileHandler(
            os.path.join(log_dir, 'gppl_eams.log'),
            maxBytes=10_485_760,  # 10MB
            backupCount=10
        )
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        ))
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)
        app.logger.setLevel(logging.INFO)


if __name__ == '__main__':
    import subprocess
    import threading
    import time
    import webbrowser

    # WERKZEUG_RUN_MAIN is set by Flask's reloader on every reload.
    # We only want to spawn the frontend ONCE — on the very first start.
    # Also skip if NO_FRONTEND=1 is set (e.g. when called from run.ps1
    # which already manages the frontend in its own window).
    is_reloader_child = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
    skip_frontend     = os.environ.get('NO_FRONTEND') == '1'

    frontend_proc = None

    if not is_reloader_child and not skip_frontend:
        frontend_dir = os.path.normpath(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
        )
        print("[*] Starting frontend (npm run dev) ...")
        try:
            frontend_proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                shell=True,   # required on Windows to find npm on PATH
            )
            print(f"[OK] Frontend started (PID {frontend_proc.pid})")
        except Exception as e:
            print(f"[WARN] Could not start frontend: {e}")
            frontend_proc = None

        # Open browser once Vite is ready
        def open_browser():
            time.sleep(3)
            webbrowser.open("http://localhost:5173")
        threading.Thread(target=open_browser, daemon=True).start()

    # ── Start Flask ───────────────────────────────────────────────────────────
    print("[*] Starting backend on http://localhost:5001 ...")
    app = create_app()
    try:
        app.run(debug=True, host='0.0.0.0', port=5001)
    finally:
        if frontend_proc and frontend_proc.poll() is None:
            print("\n[*] Stopping frontend...")
            frontend_proc.terminate()
