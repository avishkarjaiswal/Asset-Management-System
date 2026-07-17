-- ============================================================
-- GPPL EAMS — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- Roles
INSERT INTO roles (name, display_name, description) VALUES
('super_admin',      'Super Administrator', 'Full system access'),
('it_admin',         'IT Administrator',    'Manage assets, allocations, maintenance'),
('hr',               'HR Manager',          'Manage employees, onboarding/offboarding'),
('department_manager','Department Manager', 'View and request assets for department'),
('store_manager',    'Store Manager',       'Manage inventory, receive assets'),
('employee',         'Employee',            'View own assets, raise requests'),
('approval_member',  'Approval Member',     'Review and approve requests'),
('auditor',          'Auditor',             'Read-only access to all data and audit logs');

-- Branches
INSERT INTO branches (name, code, address, city, state, pincode, phone, email) VALUES
('GPPL Head Office', 'HO', '14 Industrial Area, Modinagar', 'Ghaziabad', 'Uttar Pradesh', '201204', '0120-4567890', 'info@gppl.in'),
('GPPL Plant 1',     'P1', 'Plot 7, Industrial Estate, Sahibabad', 'Ghaziabad', 'Uttar Pradesh', '201010', '0120-2345678', 'plant1@gppl.in'),
('GPPL Warehouse',   'WH', 'Sector 63, NOIDA', 'Noida', 'Uttar Pradesh', '201307', '0120-3456789', 'warehouse@gppl.in');

-- Locations
INSERT INTO locations (name, code, branch_id, floor, room) VALUES
('Server Room',       'SR-HO',   1, 'Ground', 'G-01'),
('IT Department',     'IT-HO',   1, '1st',    '101'),
('HR Department',     'HR-HO',   1, '1st',    '102'),
('MD Office',         'MD-HO',   1, '2nd',    '201'),
('Conference Room A', 'CR-A-HO', 1, '2nd',    '202'),
('Production Floor',  'PF-P1',   2, 'Ground', 'G-F'),
('Quality Control',   'QC-P1',   2, 'Ground', 'G-QC'),
('Warehouse Floor',   'WH-FL',   3, 'Ground', 'G-WH');

-- Departments
INSERT INTO departments (name, code, branch_id, description) VALUES
('Information Technology', 'IT',   1, 'IT infrastructure and support'),
('Human Resources',        'HR',   1, 'HR and personnel management'),
('Finance & Accounts',     'FA',   1, 'Finance, accounts and audit'),
('Production',             'PROD', 2, 'Manufacturing and production'),
('Quality Control',        'QC',   2, 'Quality assurance and testing'),
('Stores & Purchase',      'SP',   3, 'Procurement and inventory'),
('Administration',         'ADM',  1, 'General administration'),
('Sales & Marketing',      'SM',   1, 'Sales and customer relations');

-- Default Super Admin User (password: Admin@1234)
INSERT INTO users (uuid, employee_id, email, password_hash, first_name, last_name, role_id, is_active, is_approved, is_email_verified) VALUES
(
    uuid_generate_v4()::TEXT,
    'GPPL-001',
    'admin@gppl.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCb3dNLhf2NHkDN2Fd4RJwMV1xq',
    'System',
    'Administrator',
    1, TRUE, TRUE, TRUE
);

-- IT Admin User (password: ITAdmin@1234)
INSERT INTO users (uuid, employee_id, email, password_hash, first_name, last_name, role_id, is_active, is_approved, is_email_verified) VALUES
(
    uuid_generate_v4()::TEXT,
    'GPPL-002',
    'it.admin@gppl.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCb3dNLhf2NHkDN2Fd4RJwMV1xq',
    'Rajesh',
    'Kumar',
    2, TRUE, TRUE, TRUE
);

-- HR User (password: HR@1234)
INSERT INTO users (uuid, employee_id, email, password_hash, first_name, last_name, role_id, is_active, is_approved, is_email_verified) VALUES
(
    uuid_generate_v4()::TEXT,
    'GPPL-003',
    'hr@gppl.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCb3dNLhf2NHkDN2Fd4RJwMV1xq',
    'Priya',
    'Sharma',
    3, TRUE, TRUE, TRUE
);

-- Sample Employees
INSERT INTO employees (employee_id, first_name, last_name, email, phone, department_id, designation, joining_date, status, location_id) VALUES
('GPPL-001', 'System',    'Administrator', 'admin@gppl.in',     '9999999999', 1, 'System Admin',        '2020-01-01', 'active', 2),
('GPPL-002', 'Rajesh',    'Kumar',         'it.admin@gppl.in',  '9876543210', 1, 'IT Manager',          '2020-03-15', 'active', 2),
('GPPL-003', 'Priya',     'Sharma',        'hr@gppl.in',        '9876543211', 2, 'HR Manager',          '2020-06-01', 'active', 3),
('GPPL-004', 'Amit',      'Singh',         'amit.singh@gppl.in','9876543212', 4, 'Production Engineer', '2021-01-10', 'active', 6),
('GPPL-005', 'Sunita',    'Verma',         'sunita.v@gppl.in',  '9876543213', 3, 'Finance Executive',   '2021-04-01', 'active', 4),
('GPPL-006', 'Rohit',     'Gupta',         'rohit.g@gppl.in',   '9876543214', 5, 'QC Inspector',        '2022-02-15', 'active', 7),
('GPPL-007', 'Meena',     'Patel',         'meena.p@gppl.in',   '9876543215', 6, 'Store Keeper',        '2021-11-20', 'active', 8),
('GPPL-008', 'Vikram',    'Yadav',         'vikram.y@gppl.in',  '9876543216', 8, 'Sales Executive',     '2022-07-01', 'active', 2),
('GPPL-009', 'Anita',     'Mishra',        'anita.m@gppl.in',   '9876543217', 7, 'Admin Executive',     '2023-01-15', 'active', 2),
('GPPL-010', 'Suresh',    'Tiwari',        'suresh.t@gppl.in',  '9876543218', 4, 'Machine Operator',    '2023-03-20', 'active', 6);

-- Asset Categories
INSERT INTO asset_categories (name, code, icon, description, depreciation_rate, useful_life_years) VALUES
('Computing',          'COMP',  'monitor',      'Computers, laptops, desktops',     33.33, 3),
('Networking',         'NET',   'wifi',         'Network equipment',                 20,    5),
('Peripherals',        'PERI',  'keyboard',     'Keyboards, mice, monitors',         20,    5),
('Printing',           'PRINT', 'printer',      'Printers, scanners, copiers',       20,    5),
('Power',              'PWR',   'zap',          'UPS, batteries, generators',        10,   10),
('Mobile Devices',     'MOB',   'smartphone',   'Phones, tablets',                   33.33, 3),
('Production Equipment','PROD', 'settings',     'Manufacturing machines',             5,   20),
('Furniture',          'FURN',  'layout',       'Desks, chairs, cabinets',            5,   20),
('Security',           'SEC',   'shield',       'Cameras, biometrics, access control',10,  10),
('Software Licenses',  'SW',    'code',         'Software and licenses',             100,   1),
('Server & Storage',   'SRV',   'server',       'Servers, NAS, storage arrays',      20,    5),
('Audio Visual',       'AV',    'projector',    'Projectors, TVs, conferencing',     20,    5);

-- Asset Subcategories
INSERT INTO asset_subcategories (name, code, category_id) VALUES
('Laptop',    'LAPTOP',  1), ('Desktop',   'DESKTOP', 1), ('Workstation','WS',    1),
('Monitor',   'MON',     3), ('Keyboard',  'KB',      3), ('Mouse',      'MOUSE', 3),
('Printer',   'PTR',     4), ('Scanner',   'SCAN',    4), ('Copier',     'COP',   4),
('Switch',    'SW',      2), ('Router',    'RTR',     2), ('Firewall',   'FW',    2), ('Access Point','AP',  2),
('UPS',       'UPS',     5), ('Generator', 'GEN',     5),
('Smartphone','PHONE',   6), ('Tablet',    'TAB',     6),
('Projector', 'PROJ',    12),('TV',        'TV',      12),
('Server',    'SRV',     11),('NAS',       'NAS',     11),
('Biometric', 'BIO',     9), ('CCTV Camera','CCTV',  9);

-- Vendors
INSERT INTO vendors (name, code, contact_person, email, phone, address, city, state, gst_number, category) VALUES
('Dell India Pvt Ltd',          'DELL',  'Ramesh Nair',   'dell.sales@dell.com',     '1800-102-5675', 'Building 2, Raheja Mindspace, HITEC City', 'Hyderabad', 'Telangana',    '36AAACE5602M1ZM', 'hardware'),
('Lenovo India Pvt Ltd',        'LEN',   'Sunil Mehta',   'sunil@lenovo.in',         '1800-419-7555', '7th Floor, 10 Chandivali Farm Road', 'Mumbai', 'Maharashtra',         '27AADCL8484N1ZZ', 'hardware'),
('HP India Sales Pvt Ltd',      'HP',    'Anand Krishnan','anand.k@hp.com',           '1800-108-4747', 'Infinity Tower C, Golf Course Ext. Road', 'Gurugram', 'Haryana',     '06AAACH4245J1ZY', 'hardware'),
('Cisco Systems India Pvt Ltd', 'CISCO', 'Kiran Nambiar', 'kiran.n@cisco.com',       '1800-103-7723', 'Embassy Tech Square, Outer Ring Road', 'Bengaluru', 'Karnataka',     '29AADCC0718R1ZX', 'networking'),
('Acer India Pvt Ltd',          'ACER',  'Pankaj Arora',  'pankaj.a@acer-india.com', '1800-11-1700',  'Regus Business Centre, One Indiabulls Centre', 'Mumbai', 'Maharashtra','27AAACA8764H1ZX', 'hardware'),
('Epson India Pvt Ltd',         'EPSON', 'Vinod Kumar',   'vinod.k@epson.co.in',     '1800-123-001',  '12th Floor, The Millenia, Murphy Road', 'Bengaluru', 'Karnataka',   '29AADCE0999N1ZF', 'hardware'),
('APC by Schneider Electric',   'APC',   'Ramya Iyer',    'ramya.i@apc.com',         '1800-180-1064', 'DLF Cyber City Phase II', 'Gurugram', 'Haryana',                    '06AABCS1682G1ZD', 'power'),
('Quickheal Technologies',      'QH',    'Sachin Waghmare','sachin.w@quickheal.com', '1800-212-7377', 'Akruti IT Park, Road 30, MIDC', 'Pune', 'Maharashtra',              '27AABCQ0540R1ZI', 'software');

-- Sample Assets
INSERT INTO assets (asset_tag, asset_name, category_id, subcategory_id, brand, model, serial_number, purchase_date, purchase_cost, warranty_end, status, condition, department_id, location_id) VALUES
('GPPL-20230101-0001', 'Dell Laptop Core i7',       1, 1, 'Dell',   'Latitude 5530',    'SN-DELL-001', '2023-01-15', 85000,  '2026-01-15', 'allocated',  'good',   1, 2),
('GPPL-20230101-0002', 'Dell Laptop Core i5',       1, 1, 'Dell',   'Latitude 3520',    'SN-DELL-002', '2023-01-15', 65000,  '2026-01-15', 'available',  'good',   1, 2),
('GPPL-20230102-0001', 'HP Desktop i7',             1, 2, 'HP',     'EliteDesk 800 G6', 'SN-HP-001',   '2023-02-10', 72000,  '2026-02-10', 'allocated',  'good',   2, 3),
('GPPL-20230102-0002', 'Lenovo ThinkPad',           1, 1, 'Lenovo', 'ThinkPad E15 G4',  'SN-LEN-001',  '2023-02-10', 78000,  '2026-02-10', 'available',  'good',   3, 4),
('GPPL-20230103-0001', 'Cisco Switch 24 Port',      2,10, 'Cisco',  'Catalyst 2960',    'SN-CISCO-001','2022-11-01', 45000,  '2025-11-01', 'allocated',  'good',   1, 1),
('GPPL-20230103-0002', 'Dell Monitor 24"',          3, 4, 'Dell',   'P2422H',           'SN-MON-001',  '2023-01-15', 18000,  '2026-01-15', 'allocated',  'good',   1, 2),
('GPPL-20230104-0001', 'Epson Printer Laser',       4, 7, 'Epson',  'M2140',            'SN-EPS-001',  '2023-03-20', 22000,  '2025-03-20', 'available',  'good',   2, 3),
('GPPL-20230104-0002', 'APC UPS 1500VA',            5,14, 'APC',    'Smart-UPS 1500',   'SN-APC-001',  '2022-12-01', 35000,  '2025-12-01', 'allocated',  'good',   1, 1),
('GPPL-20230105-0001', 'HP Laptop Core i5',         1, 1, 'HP',     'ProBook 440 G9',   'SN-HP-002',   '2023-04-05', 68000,  '2026-04-05', 'in_maintenance','fair',4, 6),
('GPPL-20230105-0002', 'Acer Desktop i5',           1, 2, 'Acer',   'Veriton X4690G',   'SN-ACER-001', '2023-05-10', 55000,  '2026-05-10', 'available',  'good',   5, 7),
('GPPL-20230106-0001', 'Cisco Router',              2,11, 'Cisco',  'ISR 4331',         'SN-CISCO-002','2022-08-15', 120000, '2025-08-15', 'allocated',  'good',   1, 1),
('GPPL-20230106-0002', 'Epson Scanner',             4, 8, 'Epson',  'DS-530',           'SN-EPS-002',  '2023-06-20', 28000,  '2025-06-20', 'available',  'good',   3, 3);

-- System Settings
INSERT INTO system_settings (key, value, value_type, description, module, is_public) VALUES
('company_name',      'Ghaziabad Precision Product Private Limited', 'string', 'Full company name',            'general', TRUE),
('company_short',     'GPPL',                                        'string', 'Company abbreviation',         'general', TRUE),
('company_email',     'info@gppl.in',                                'string', 'Company contact email',        'general', TRUE),
('company_phone',     '0120-4567890',                                'string', 'Company contact phone',        'general', TRUE),
('company_address',   '14 Industrial Area, Modinagar, Ghaziabad, UP - 201204', 'string', 'Company address',  'general', TRUE),
('company_gst',       '09AABCG1234H1ZX',                             'string', 'GST Number',                  'general', FALSE),
('warranty_alert_days','30',                                          'integer','Days before warranty to alert','notifications', FALSE),
('maintenance_alert_days','7',                                        'integer','Days before maintenance to alert','notifications', FALSE),
('default_currency',  'INR',                                          'string', 'Default currency',            'finance', TRUE),
('fiscal_year_start', '04-01',                                        'string', 'Fiscal year start (MM-DD)',   'finance', FALSE),
('enable_email_notifications','false',                                'boolean','Enable email notifications',  'notifications', FALSE),
('max_upload_size_mb','50',                                           'integer','Max file upload size in MB',  'uploads', FALSE);

-- Permissions
INSERT INTO permissions (name, module, action, description) VALUES
-- Assets
('assets.view',     'assets', 'view',   'View asset list and details'),
('assets.create',   'assets', 'create', 'Create new assets'),
('assets.update',   'assets', 'update', 'Update asset details'),
('assets.delete',   'assets', 'delete', 'Delete/deactivate assets'),
('assets.export',   'assets', 'export', 'Export asset data'),
-- Employees
('employees.view',  'employees','view',  'View employees'),
('employees.create','employees','create','Add new employees'),
('employees.update','employees','update','Update employee details'),
('employees.delete','employees','delete','Deactivate employees'),
-- Allocations
('allocations.view',   'allocations','view',   'View allocations'),
('allocations.create', 'allocations','create', 'Create allocation requests'),
('allocations.approve','allocations','approve','Approve allocations'),
-- Reports
('reports.view',  'reports','view',  'View reports'),
('reports.export','reports','export','Export reports'),
-- Audit
('audit.view','audit','view','View audit logs'),
-- Settings
('settings.manage','settings','manage','Manage system settings');

-- Grant all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Grant asset/allocation permissions to IT Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
    'assets.view','assets.create','assets.update','assets.export',
    'employees.view','allocations.view','allocations.create','allocations.approve',
    'reports.view','reports.export'
);

-- Grant HR permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
    'employees.view','employees.create','employees.update',
    'assets.view','allocations.view','reports.view'
);

-- Grant employee permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE name IN (
    'assets.view','allocations.view','allocations.create'
);

-- Grant auditor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE name IN (
    'assets.view','employees.view','allocations.view',
    'reports.view','reports.export','audit.view'
);

-- Allocate some sample assets
INSERT INTO asset_allocations (allocation_number, asset_id, employee_id, department_id, status, allocation_date, purpose, acknowledged_at, created_at) VALUES
('ALLOC-20230115-0001', 1, 2, 1, 'acknowledged', '2023-01-20 10:00:00+05:30', 'IT work', '2023-01-20 11:00:00+05:30', '2023-01-15 09:00:00+05:30'),
('ALLOC-20230215-0001', 3, 3, 2, 'acknowledged', '2023-02-15 10:00:00+05:30', 'HR work', '2023-02-15 11:00:00+05:30', '2023-02-10 09:00:00+05:30'),
('ALLOC-20230320-0001', 6, 2, 1, 'acknowledged', '2023-03-22 10:00:00+05:30', 'IT work', '2023-03-22 11:30:00+05:30', '2023-03-20 09:00:00+05:30');

-- Update assets for allocated ones
UPDATE assets SET current_employee_id = 2 WHERE id = 1;
UPDATE assets SET current_employee_id = 3 WHERE id = 3;
UPDATE assets SET current_employee_id = 2 WHERE id = 6;

-- Sample maintenance record
INSERT INTO maintenance (maintenance_number, asset_id, maintenance_type, status, problem_description, scheduled_date, technician_name, cost, is_under_warranty, created_at) VALUES
('MAINT-20230601-0001', 9, 'repair', 'in_progress', 'Laptop screen flickering and battery not charging properly', '2026-07-10', 'Tech Support Team', 3500, TRUE, '2023-06-01 09:00:00+05:30');

-- Sample complaint
INSERT INTO complaints (complaint_number, asset_id, employee_id, title, description, priority, status, category, created_at) VALUES
('COMP-20230701-0001', 4, 4, 'Laptop running slow', 'The laptop has been running very slow for the past week. Applications take too long to open.', 'high', 'open', 'hardware', '2023-07-01 10:00:00+05:30');

-- Sample notification for admin
INSERT INTO notifications (user_id, title, message, type, module, is_read) VALUES
(1, 'System Initialized', 'GPPL Asset Management System has been successfully set up!', 'success', 'system', FALSE),
(1, 'Warranty Alert',     '3 assets have warranties expiring in the next 30 days.', 'warning', 'assets', FALSE);
