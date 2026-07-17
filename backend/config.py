"""
GPPL Enterprise Asset Management System
Configuration Module
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Detect whether the configured DB is SQLite
_db_url = os.environ.get('DATABASE_URL', 'sqlite:///gppl_eams.db')
_is_sqlite = _db_url.startswith('sqlite')


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'gppl-eams-secret-key-change-in-production')

    # Database
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SQLite does NOT support connection pooling — use NullPool instead.
    # For other databases (PostgreSQL etc.) use a proper pool.
    SQLALCHEMY_ENGINE_OPTIONS = (
        {
            # SQLite: disable pool entirely to avoid "pool_size" errors
            'connect_args': {'check_same_thread': False},
        }
        if _is_sqlite else
        {
            'pool_size': 10,
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }
    )

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'gppl-jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False

    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')

    # File Upload
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ALLOWED_DOC_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'}

    # Mail (leave MAIL_USERNAME/MAIL_PASSWORD empty to disable)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@gppl.in')

    # Rate Limiting
    RATELIMIT_DEFAULT = "10000 per day;5000 per hour"
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'memory://')

    # App Settings
    APP_NAME = "GPPL Asset Management System"
    COMPANY_NAME = "Ghaziabad Precision Product Private Limited"
    COMPANY_SHORT = "GPPL"

    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100


class DevelopmentConfig(Config):
    """Development configuration — uses SQLite by default."""
    DEBUG = True
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    # Only apply pool settings if NOT using SQLite in production
    SQLALCHEMY_ENGINE_OPTIONS = (
        {'connect_args': {'check_same_thread': False}}
        if _is_sqlite else
        {
            'pool_size': 20,
            'pool_recycle': 300,
            'pool_pre_ping': True,
            'max_overflow': 10,
        }
    )


class TestingConfig(Config):
    """Testing configuration — also uses SQLite (in-memory)."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///gppl_eams_test.db'
    SQLALCHEMY_ENGINE_OPTIONS = {'connect_args': {'check_same_thread': False}}
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)
