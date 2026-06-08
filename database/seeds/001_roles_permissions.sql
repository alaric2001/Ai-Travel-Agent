-- =============================================================
-- Seed 001: Roles & Permissions (RBAC)
-- =============================================================

INSERT INTO roles (role_name, description) VALUES
('super_admin',     'Administrator penuh — akses ke seluruh sistem'),
('hr_admin',        'Admin HR — kelola data karyawan dan pagu golongan'),
('finance_admin',   'Admin Finance — kelola whitelist policy dan approve klaim expense'),
('ops_admin',       'Admin Operasional — kelola data kendaraan dan klaim BBM'),
('employee',        'Karyawan umum — submit booking, expense, dan klaim BBM'),
('approver',        'Atasan/Manager — approve/reject pengajuan dari bawahan')
ON CONFLICT (role_name) DO NOTHING;

-- -----------------------------------------------
-- Permissions per modul
-- -----------------------------------------------
INSERT INTO permissions (permission_name, resource, action, description) VALUES
-- Booking Module
('booking:create',      'booking',  'create',   'Membuat pengajuan perjalanan dinas baru'),
('booking:read_own',    'booking',  'read',     'Melihat pengajuan booking milik sendiri'),
('booking:read_all',    'booking',  'read',     'Melihat semua pengajuan booking (admin/approver)'),
('booking:approve',     'booking',  'approve',  'Menyetujui booking yang melebihi pagu (dispensasi)'),
('booking:manage',      'booking',  'manage',   'Kelola penuh semua data booking'),
-- Audit/Expense Module
('expense:submit',      'expense',  'submit',   'Mengunggah dan submit nota reimbursement'),
('expense:read_own',    'expense',  'read',     'Melihat pengajuan expense milik sendiri'),
('expense:read_all',    'expense',  'read',     'Melihat semua pengajuan expense'),
('expense:approve',     'expense',  'approve',  'Menyetujui atau menolak klaim expense'),
('expense:manage',      'expense',  'manage',   'Kelola penuh semua data expense'),
-- Fuel Module
('fuel:create',         'fuel',     'create',   'Membuat klaim BBM baru dengan kalkulasi rute'),
('fuel:read_own',       'fuel',     'read',     'Melihat klaim BBM milik sendiri'),
('fuel:read_all',       'fuel',     'read',     'Melihat semua klaim BBM'),
('fuel:approve',        'fuel',     'approve',  'Menyetujui klaim BBM'),
('fuel:manage',         'fuel',     'manage',   'Kelola penuh semua data klaim BBM'),
-- Admin Module
('employee:manage',     'admin',    'manage',   'Kelola data karyawan (CRUD)'),
('allowance:manage',    'admin',    'manage',   'Kelola matriks pagu per golongan'),
('policy:manage',       'admin',    'manage',   'Kelola whitelist policy pengeluaran'),
('vehicle:manage',      'admin',    'manage',   'Kelola data kendaraan dinas'),
('fuel_price:manage',   'admin',    'manage',   'Kelola harga BBM aktif'),
('audit_log:read',      'admin',    'read',     'Melihat immutable audit log system'),
('report:read',         'report',   'read',     'Melihat laporan dan analitik dashboard')
ON CONFLICT (permission_name) DO NOTHING;

-- -----------------------------------------------
-- Role-Permission Mapping
-- -----------------------------------------------

-- super_admin: SEMUA permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.role_name = 'super_admin'
ON CONFLICT DO NOTHING;

-- hr_admin: kelola karyawan, pagu, lihat laporan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.permission_name IN (
    'employee:manage', 'allowance:manage',
    'booking:read_all', 'audit_log:read', 'report:read'
)
WHERE r.role_name = 'hr_admin'
ON CONFLICT DO NOTHING;

-- finance_admin: kelola policy, approve expense, lihat semua
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.permission_name IN (
    'policy:manage', 'expense:manage', 'expense:approve',
    'fuel:approve', 'fuel:read_all', 'booking:read_all',
    'fuel_price:manage', 'audit_log:read', 'report:read'
)
WHERE r.role_name = 'finance_admin'
ON CONFLICT DO NOTHING;

-- ops_admin: kelola kendaraan dan BBM
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.permission_name IN (
    'vehicle:manage', 'fuel_price:manage',
    'fuel:manage', 'audit_log:read', 'report:read'
)
WHERE r.role_name = 'ops_admin'
ON CONFLICT DO NOTHING;

-- employee: submit dan baca milik sendiri
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.permission_name IN (
    'booking:create', 'booking:read_own',
    'expense:submit', 'expense:read_own',
    'fuel:create', 'fuel:read_own'
)
WHERE r.role_name = 'employee'
ON CONFLICT DO NOTHING;

-- approver: baca semua, approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.permission_name IN (
    'booking:approve', 'booking:read_all',
    'expense:approve', 'expense:read_all',
    'fuel:approve', 'fuel:read_all',
    'report:read'
)
WHERE r.role_name = 'approver'
ON CONFLICT DO NOTHING;
