-- ============================================================
-- GPPL Enterprise Asset Management System
-- PostgreSQL Database Schema
-- Version: 1.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Roles & Permissions ────────────────────────────────────

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    employee_id VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    avatar VARCHAR(500),
    phone VARCHAR(20),
    last_login TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_jti VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ─── Organization Structure ─────────────────────────────────

CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    floor VARCHAR(50),
    room VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    manager_id INTEGER,  -- FK to employees added after
    parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    photo VARCHAR(500),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(150),
    manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    joining_date DATE,
    exit_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    address TEXT,
    emergency_contact VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add manager FK to departments
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ─── Vendors ────────────────────────────────────────────────

CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    website VARCHAR(255),
    category VARCHAR(50),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    bank_name VARCHAR(150),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Purchase Orders ────────────────────────────────────────

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'draft',
    order_date DATE,
    expected_delivery DATE,
    actual_delivery DATE,
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    discount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    currency VARCHAR(5) DEFAULT 'INR',
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_file VARCHAR(500),
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    shipping_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Asset Categories ───────────────────────────────────────

CREATE TABLE asset_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT 'package',
    description TEXT,
    depreciation_rate NUMERIC(5,2) DEFAULT 20,
    useful_life_years INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_subcategories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE CASCADE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Assets ─────────────────────────────────────────────────

CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    asset_tag VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE RESTRICT,
    subcategory_id INTEGER REFERENCES asset_subcategories(id) ON DELETE SET NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(200) UNIQUE,
    description TEXT,
    specifications JSONB DEFAULT '{}',
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost NUMERIC(12,2),
    currency VARCHAR(5) DEFAULT 'INR',
    warranty_start DATE,
    warranty_end DATE,
    warranty_details TEXT,
    amc_start DATE,
    amc_end DATE,
    amc_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'available',
    condition VARCHAR(20) DEFAULT 'good',
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    current_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    qr_code TEXT,
    barcode TEXT,
    primary_image VARCHAR(500),
    images JSONB DEFAULT '[]',
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    quantity_received INTEGER DEFAULT 0,
    unit_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) DEFAULT 18,
    total_price NUMERIC(12,2),
    hsn_code VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Allocations ────────────────────────────────────────────

CREATE TABLE asset_allocations (
    id SERIAL PRIMARY KEY,
    allocation_number VARCHAR(30) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
    employee_id INTEGER REFERENCES employees(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pending',
    request_date TIMESTAMPTZ DEFAULT NOW(),
    allocation_date TIMESTAMPTZ,
    expected_return_date DATE,
    actual_return_date DATE,
    purpose TEXT,
    accessories JSONB DEFAULT '[]',
    handover_condition VARCHAR(20) DEFAULT 'good',
    acknowledged_at TIMESTAMPTZ,
    acknowledgement_signature TEXT,
    certificate_path VARCHAR(500),
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE allocation_approvals (
    id SERIAL PRIMARY KEY,
    allocation_id INTEGER REFERENCES asset_allocations(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approval_level VARCHAR(30),
    status VARCHAR(20) DEFAULT 'pending',
    comments TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Returns & Transfers ────────────────────────────────────

CREATE TABLE asset_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(30) UNIQUE NOT NULL,
    allocation_id INTEGER REFERENCES asset_allocations(id) ON DELETE RESTRICT,
    asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
    employee_id INTEGER REFERENCES employees(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'pending',
    return_date TIMESTAMPTZ DEFAULT NOW(),
    condition_on_return VARCHAR(20) DEFAULT 'good',
    accessories_returned JSONB DEFAULT '[]',
    accessories_missing JSONB DEFAULT '[]',
    damage_description TEXT,
    damage_photos JSONB DEFAULT '[]',
    damage_cost NUMERIC(10,2) DEFAULT 0,
    it_verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    it_verified_at TIMESTAMPTZ,
    it_remarks TEXT,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(30) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
    transfer_type VARCHAR(20),
    from_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    to_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    from_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    to_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    from_branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    to_branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    transfer_date TIMESTAMPTZ,
    reason TEXT,
    condition_at_transfer VARCHAR(20) DEFAULT 'good',
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── History ────────────────────────────────────────────────

CREATE TABLE asset_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMPTZ DEFAULT NOW(),
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Maintenance & AMC ──────────────────────────────────────

CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    maintenance_number VARCHAR(30) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    maintenance_type VARCHAR(30),
    status VARCHAR(20) DEFAULT 'open',
    reported_date TIMESTAMPTZ DEFAULT NOW(),
    scheduled_date DATE,
    completion_date DATE,
    next_service_date DATE,
    problem_description TEXT NOT NULL,
    work_done TEXT,
    parts_replaced JSONB DEFAULT '[]',
    technician_name VARCHAR(150),
    technician_phone VARCHAR(20),
    cost NUMERIC(10,2) DEFAULT 0,
    invoice_number VARCHAR(100),
    invoice_file VARCHAR(500),
    condition_before VARCHAR(20),
    condition_after VARCHAR(20),
    is_under_warranty BOOLEAN DEFAULT FALSE,
    is_under_amc BOOLEAN DEFAULT FALSE,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE amc_contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE RESTRICT,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC(12,2),
    coverage TEXT,
    terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Complaints ─────────────────────────────────────────────

CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    complaint_number VARCHAR(30) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE RESTRICT,
    employee_id INTEGER REFERENCES employees(id) ON DELETE RESTRICT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    category VARCHAR(50),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    due_date DATE,
    attachments JSONB DEFAULT '[]',
    sla_breach BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaint_updates (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status_from VARCHAR(20),
    status_to VARCHAR(20),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications & Audit ──────────────────────────────────

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info',
    module VARCHAR(50),
    reference_id INTEGER,
    reference_type VARCHAR(50),
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    entity_type VARCHAR(50),
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(10) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_type VARCHAR(20),
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    module VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_employee ON assets(current_employee_id);
CREATE INDEX idx_assets_serial ON assets(serial_number);
CREATE INDEX idx_assets_warranty ON assets(warranty_end);

CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_emp_id ON employees(employee_id);

CREATE INDEX idx_allocations_asset ON asset_allocations(asset_id);
CREATE INDEX idx_allocations_employee ON asset_allocations(employee_id);
CREATE INDEX idx_allocations_status ON asset_allocations(status);

CREATE INDEX idx_history_asset ON asset_history(asset_id);
CREATE INDEX idx_history_created ON asset_history(created_at DESC);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_module ON audit_logs(module);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

CREATE INDEX idx_maintenance_asset ON maintenance(asset_id);
CREATE INDEX idx_maintenance_status ON maintenance(status);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_employee ON complaints(employee_id);
