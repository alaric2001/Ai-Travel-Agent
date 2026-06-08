-- =============================================================
-- Migration 002: Role-Based Access Control (RBAC)
-- Sistem izin akses berbasis peran untuk seluruh modul
-- =============================================================

-- -----------------------------------------------
-- Tabel Roles (Peran)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL      PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Daftar peran dalam sistem: super_admin, hr_admin, finance_admin, ops_admin, employee, approver';

-- -----------------------------------------------
-- Tabel Permissions (Izin spesifik)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id              SERIAL      PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,   -- Format: resource:action (e.g. booking:create)
    resource        VARCHAR(50) NOT NULL,            -- booking | expense | fuel | admin
    action          VARCHAR(50) NOT NULL,            -- create | read | approve | manage
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Daftar izin spesifik per resource dan aksi dalam sistem';

-- -----------------------------------------------
-- Junction: Role <-> Permission
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role  ON role_permissions(role_id);

-- -----------------------------------------------
-- Junction: Employee <-> Role
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by     INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    PRIMARY KEY (employee_id, role_id)
);

CREATE INDEX idx_user_roles_employee    ON user_roles(employee_id);
CREATE INDEX idx_user_roles_role        ON user_roles(role_id);

COMMENT ON TABLE user_roles IS 'Pemetaan karyawan ke peran. Satu karyawan dapat memiliki beberapa peran.';

-- -----------------------------------------------
-- Tabel sesi autentikasi (JWT token store)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
    id              BIGSERIAL   PRIMARY KEY,
    session_id      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employee_id     INTEGER     NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    refresh_token   TEXT        NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    is_revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_employee     ON auth_sessions(employee_id);
CREATE INDEX idx_auth_sessions_token        ON auth_sessions(refresh_token);
CREATE INDEX idx_auth_sessions_expires      ON auth_sessions(expires_at);
