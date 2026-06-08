-- =============================================================
-- Seed 003: Contoh Data Karyawan (SAMPLE / DEMO DATA)
-- Untuk keperluan pengembangan dan testing
-- =============================================================

INSERT INTO employees (employee_code, full_name, position, department, grade, email, phone, join_date) VALUES
('EMP001', 'Budi Santoso',           'Staf Administrasi',        'Umum',           'I',    'budi.santoso@company.id',      '081200000001', '2022-03-15'),
('EMP002', 'Siti Rahmadhani',        'Senior Financial Analyst', 'Keuangan',       'II',   'siti.rahmadhani@company.id',   '081200000002', '2020-07-01'),
('EMP003', 'Agus Dermawan',          'Manager Operasional',      'Operasional',    'III',  'agus.dermawan@company.id',     '081200000003', '2018-01-10'),
('EMP004', 'Rina Wulandari',         'HR Manager',               'SDM',            'III',  'rina.wulandari@company.id',    '081200000004', '2019-05-20'),
('EMP005', 'Dr. Hendra Kusuma',      'Direktur Operasional',     'Direksi',        'IV',   'hendra.kusuma@company.id',     '081200000005', '2015-08-01'),
('ADM001', 'Administrator Sistem',   'Super Administrator',      'Teknologi Info', 'IV',   'admin@company.id',             '081200000099', '2015-01-01')
ON CONFLICT (employee_code) DO NOTHING;

-- -----------------------------------------------
-- Assign roles ke masing-masing karyawan
-- -----------------------------------------------

-- EMP001: Staf biasa
INSERT INTO user_roles (employee_id, role_id, assigned_by)
SELECT e.id, r.id, (SELECT id FROM employees WHERE employee_code = 'ADM001')
FROM employees e, roles r
WHERE e.employee_code = 'EMP001' AND r.role_name = 'employee'
ON CONFLICT DO NOTHING;

-- EMP002: Staf senior dengan akses finance
INSERT INTO user_roles (employee_id, role_id, assigned_by)
SELECT e.id, r.id, (SELECT id FROM employees WHERE employee_code = 'ADM001')
FROM employees e, roles r
WHERE e.employee_code = 'EMP002' AND r.role_name IN ('employee', 'finance_admin')
ON CONFLICT DO NOTHING;

-- EMP003: Manager dengan hak approve
INSERT INTO user_roles (employee_id, role_id, assigned_by)
SELECT e.id, r.id, (SELECT id FROM employees WHERE employee_code = 'ADM001')
FROM employees e, roles r
WHERE e.employee_code = 'EMP003' AND r.role_name IN ('employee', 'approver', 'ops_admin')
ON CONFLICT DO NOTHING;

-- EMP004: HR Admin
INSERT INTO user_roles (employee_id, role_id, assigned_by)
SELECT e.id, r.id, (SELECT id FROM employees WHERE employee_code = 'ADM001')
FROM employees e, roles r
WHERE e.employee_code = 'EMP004' AND r.role_name IN ('employee', 'hr_admin')
ON CONFLICT DO NOTHING;

-- EMP005: Direktur dengan hak approve tertinggi
INSERT INTO user_roles (employee_id, role_id, assigned_by)
SELECT e.id, r.id, (SELECT id FROM employees WHERE employee_code = 'ADM001')
FROM employees e, roles r
WHERE e.employee_code = 'EMP005' AND r.role_name IN ('employee', 'approver')
ON CONFLICT DO NOTHING;

-- ADM001: Super Admin
INSERT INTO user_roles (employee_id, role_id)
SELECT e.id, r.id
FROM employees e, roles r
WHERE e.employee_code = 'ADM001' AND r.role_name = 'super_admin'
ON CONFLICT DO NOTHING;
