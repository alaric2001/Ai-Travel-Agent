-- =============================================================
-- Migration 005: Immutable Audit Log & Submission Tables
--
-- PRINSIP DESAIN:
--   - immutable_audit_log: APPEND-ONLY, tidak pernah UPDATE/DELETE
--   - Trigger memblokir semua modifikasi data historis
--   - Submission tables menggunakan pola "lock" setelah diproses
-- =============================================================

-- -----------------------------------------------
-- IMMUTABLE AUDIT LOG (Anti-manipulasi)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS immutable_audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    event_id        UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    actor_id        INTEGER         REFERENCES employees(id) ON DELETE SET NULL,
    actor_email     VARCHAR(255),
    actor_ip        INET,
    action          VARCHAR(100)    NOT NULL,    -- BOOKING_CREATED | EXPENSE_APPROVED | FUEL_LOCKED | dll.
    module          VARCHAR(50)     NOT NULL,    -- BOOKING | AUDIT | FUEL | ADMIN | AUTH
    resource_type   VARCHAR(100),               -- booking_submissions | expense_submissions | fuel_claims
    resource_id     VARCHAR(100),               -- ID record yang terpengaruh
    before_state    JSONB,                      -- Snapshot status SEBELUM aksi
    after_state     JSONB,                      -- Snapshot status SETELAH aksi
    metadata        JSONB,                      -- Data konteks tambahan (IP, user agent, dll.)
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    -- !! TIDAK ADA updated_at, deleted_at, atau is_deleted !!
);

CREATE INDEX idx_audit_actor        ON immutable_audit_log(actor_id);
CREATE INDEX idx_audit_module       ON immutable_audit_log(module);
CREATE INDEX idx_audit_action       ON immutable_audit_log(action);
CREATE INDEX idx_audit_resource     ON immutable_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created_at   ON immutable_audit_log(created_at DESC);

COMMENT ON TABLE immutable_audit_log IS
    'Log audit IMMUTABLE (append-only). Setiap aksi sistem dicatat di sini. '
    'Diproteksi trigger agar tidak bisa diubah atau dihapus — menjamin integritas untuk audit keuangan.';

-- ============================================================
-- PERLINDUNGAN IMMUTABILITY
-- Fungsi dan trigger yang memblokir UPDATE dan DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION fn_protect_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        '[SECURITY] Immutable audit log tidak dapat dimodifikasi. '
        'Operasi "%" pada event_id "%" diblokir oleh sistem.',
        TG_OP,
        COALESCE(OLD.event_id::TEXT, 'N/A');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_block_update
    BEFORE UPDATE ON immutable_audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_protect_audit_log();

CREATE TRIGGER trg_audit_block_delete
    BEFORE DELETE ON immutable_audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_protect_audit_log();

-- -----------------------------------------------
-- Tabel Pengajuan Booking (Modul 1)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS booking_submissions (
    id              BIGSERIAL       PRIMARY KEY,
    submission_id   UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employee_id     INTEGER         NOT NULL REFERENCES employees(id),
    raw_input       TEXT            NOT NULL,       -- Input teks kasual asli dari user
    parsed_payload  JSONB           NOT NULL,       -- Output JSON dari Gemini (origin, dest, dates, dll.)
    allowance_check JSONB,                          -- Hasil validasi pagu: {passed, grade, limit, requested}
    status          VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    -- Status: PENDING | WITHIN_POLICY | EXCEEDS_POLICY | DISPENSATION_REQUESTED | APPROVED | REJECTED
    approved_by     INTEGER         REFERENCES employees(id) ON DELETE SET NULL,
    approval_note   TEXT,
    locked_at       TIMESTAMPTZ,                    -- Timestamp saat record dikunci (tidak bisa diubah lagi)
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_booking_status CHECK (
        status IN ('PENDING','WITHIN_POLICY','EXCEEDS_POLICY','DISPENSATION_REQUESTED','APPROVED','REJECTED')
    )
);

CREATE INDEX idx_booking_employee   ON booking_submissions(employee_id);
CREATE INDEX idx_booking_status     ON booking_submissions(status);
CREATE INDEX idx_booking_created_at ON booking_submissions(created_at DESC);

COMMENT ON TABLE booking_submissions IS
    'Pengajuan perjalanan dari Booking Agent. Setelah locked_at diisi, record tidak boleh diubah.';

CREATE TRIGGER trg_booking_updated_at
    BEFORE UPDATE ON booking_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- Tabel Pengajuan Expense/Reimbursement (Modul 2)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS expense_submissions (
    id                  BIGSERIAL       PRIMARY KEY,
    submission_id       UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employee_id         INTEGER         NOT NULL REFERENCES employees(id),
    receipt_image_url   TEXT            NOT NULL,   -- URL foto struk (S3, local storage, dll.)
    ocr_raw_output      JSONB,                      -- Raw output Gemini Vision (teks penuh)
    extracted_items     JSONB,                      -- Line-items hasil ekstraksi: [{name, qty, price, category}]
    total_claimed       INTEGER,                    -- Total nominal yang diklaim karyawan (IDR)
    total_approved      INTEGER,                    -- Total nominal yang DISETUJUI setelah audit (IDR)
    -- Rumus: total_approved = total_claimed - SUM(rejected_items[].price)
    rejected_items      JSONB,                      -- Item ditolak: [{name, price, category, reason}]
    audit_summary       JSONB,                      -- Ringkasan hasil audit AI
    status              VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    -- Status: PENDING | OCR_PROCESSING | AUDITED | APPROVED | REJECTED | PARTIAL_APPROVED
    approved_by         INTEGER         REFERENCES employees(id) ON DELETE SET NULL,
    locked_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_expense_status CHECK (
        status IN ('PENDING','OCR_PROCESSING','AUDITED','APPROVED','REJECTED','PARTIAL_APPROVED')
    )
);

CREATE INDEX idx_expense_employee   ON expense_submissions(employee_id);
CREATE INDEX idx_expense_status     ON expense_submissions(status);

COMMENT ON TABLE expense_submissions IS
    'Pengajuan reimbursement nota/struk dari Audit Agent. '
    'total_approved dihitung ulang oleh AI: total_approved = total_claimed - SUM(rejected_items[].price)';

CREATE TRIGGER trg_expense_updated_at
    BEFORE UPDATE ON expense_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- Tabel Klaim BBM (Modul 3)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_claims (
    id                      BIGSERIAL       PRIMARY KEY,
    claim_id                UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employee_id             INTEGER         NOT NULL REFERENCES employees(id),
    vehicle_id              INTEGER         NOT NULL REFERENCES vehicles(id),
    -- Input rute
    origin_address          TEXT            NOT NULL,
    destination_address     TEXT            NOT NULL,
    origin_lat              DECIMAL(10,8),
    origin_lng              DECIMAL(11,8),
    destination_lat         DECIMAL(10,8),
    destination_lng         DECIMAL(11,8),
    -- Kalkulasi AI (dikunci saat dibuat)
    distance_km             DECIMAL(10,2),           -- D_aktual dari Google Maps Distance Matrix API (KM)
    fuel_efficiency_snapshot DECIMAL(5,2),           -- Snapshot E (KM/Liter) dari tabel vehicles saat klaim
    fuel_price_snapshot     INTEGER,                 -- Snapshot C (IDR/Liter) dari tabel fuel_prices saat klaim
    fuel_volume_liters      DECIMAL(8,2),            -- V_BBM = D_aktual / E (Liter)
    max_cost_approved       INTEGER,                 -- KUNCI KLAIM: Cost_BBM = V_BBM * C (IDR)
    -- Struk aktual (upload setelah perjalanan)
    actual_receipt_url      TEXT,
    actual_cost_claimed     INTEGER,                 -- Nominal riil yang diklaim karyawan (IDR)
    -- Status
    status                  VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    -- Status: PENDING | CALCULATED | LOCKED | SUBMITTED | APPROVED | REJECTED
    approved_by             INTEGER         REFERENCES employees(id) ON DELETE SET NULL,
    locked_at               TIMESTAMPTZ,             -- Dikunci = max_cost_approved tidak bisa berubah
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fuel_status CHECK (
        status IN ('PENDING','CALCULATED','LOCKED','SUBMITTED','APPROVED','REJECTED')
    )
);

CREATE INDEX idx_fuel_employee      ON fuel_claims(employee_id);
CREATE INDEX idx_fuel_vehicle       ON fuel_claims(vehicle_id);
CREATE INDEX idx_fuel_status        ON fuel_claims(status);

COMMENT ON TABLE fuel_claims IS
    'Klaim BBM dari Fuel Agent. max_cost_approved dikunci berdasarkan kalkulasi AI: '
    'V_BBM = D_aktual / E, Cost_BBM = V_BBM * C. Karyawan tidak bisa klaim melebihi nilai ini.';

CREATE TRIGGER trg_fuel_updated_at
    BEFORE UPDATE ON fuel_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
