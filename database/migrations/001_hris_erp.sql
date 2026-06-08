-- =============================================================
-- Migration 001: HRIS & ERP Database
-- Menyimpan data Karyawan dan Matriks Pagu per Golongan
-- =============================================================

-- Enable pgcrypto untuk gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility trigger: auto-update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- Tabel Karyawan (HRIS)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL          PRIMARY KEY,
    employee_code   VARCHAR(20)     NOT NULL UNIQUE,
    full_name       VARCHAR(255)    NOT NULL,
    position        VARCHAR(255)    NOT NULL,
    department      VARCHAR(255),
    grade           VARCHAR(10)     NOT NULL,  -- Golongan: I, II, III, IV
    email           VARCHAR(255)    NOT NULL UNIQUE,
    phone           VARCHAR(20),
    join_date       DATE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_grade    ON employees(grade);
CREATE INDEX idx_employees_email    ON employees(email);
CREATE INDEX idx_employees_active   ON employees(is_active);

COMMENT ON TABLE  employees         IS 'Data karyawan dari sistem HRIS perusahaan';
COMMENT ON COLUMN employees.grade   IS 'Golongan karyawan: I (Staff), II (Officer), III (Manager), IV (Direksi/Eksekutif)';

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- Matriks Pagu per Golongan (ERP)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS allowance_matrix (
    id                          SERIAL      PRIMARY KEY,
    grade                       VARCHAR(10) NOT NULL UNIQUE,
    grade_label                 VARCHAR(100) NOT NULL,
    max_flight_price            INTEGER     NOT NULL,  -- IDR, batas max harga tiket pesawat (one-way)
    max_hotel_price_per_night   INTEGER     NOT NULL,  -- IDR, batas max harga hotel per malam
    max_daily_allowance         INTEGER     NOT NULL DEFAULT 0,  -- IDR, uang harian
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pagu_flight  CHECK (max_flight_price > 0),
    CONSTRAINT chk_pagu_hotel   CHECK (max_hotel_price_per_night > 0),
    CONSTRAINT chk_pagu_daily   CHECK (max_daily_allowance >= 0)
);

COMMENT ON TABLE  allowance_matrix                              IS 'Matriks pagu (batas maksimal pengeluaran perjalanan dinas) per golongan karyawan';
COMMENT ON COLUMN allowance_matrix.max_flight_price            IS 'Harga tiket pesawat (sekali jalan) maksimal yang disetujui, dalam IDR';
COMMENT ON COLUMN allowance_matrix.max_hotel_price_per_night   IS 'Harga kamar hotel per malam maksimal yang disetujui, dalam IDR';

CREATE TRIGGER trg_allowance_matrix_updated_at
    BEFORE UPDATE ON allowance_matrix
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
