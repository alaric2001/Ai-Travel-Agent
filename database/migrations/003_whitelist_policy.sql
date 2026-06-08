-- =============================================================
-- Migration 003: Whitelist Policy Database
-- Daftar item pengeluaran yang DIIZINKAN dan DILARANG oleh Finance
-- Digunakan oleh Audit Agent untuk memvalidasi setiap line-item struk
-- =============================================================

-- -----------------------------------------------
-- Tabel Kategori Pengeluaran
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS expense_categories (
    id                  SERIAL      PRIMARY KEY,
    category_name       VARCHAR(100) NOT NULL UNIQUE,
    is_allowed          BOOLEAN     NOT NULL DEFAULT TRUE,
    rejection_reason    TEXT,                       -- Wajib diisi jika is_allowed = FALSE
    match_priority      INTEGER     NOT NULL DEFAULT 5,  -- Prioritas 1-10 saat keyword matching
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rejection_reason CHECK (
        is_allowed = TRUE OR rejection_reason IS NOT NULL
    )
);

COMMENT ON TABLE  expense_categories                    IS 'Kategori pengeluaran perjalanan dinas: diizinkan atau dilarang sesuai kebijakan Finance';
COMMENT ON COLUMN expense_categories.is_allowed         IS 'TRUE = diizinkan untuk reimbursement, FALSE = ditolak oleh sistem';
COMMENT ON COLUMN expense_categories.rejection_reason   IS 'Alasan penolakan yang akan ditampilkan ke karyawan (wajib jika is_allowed=FALSE)';
COMMENT ON COLUMN expense_categories.match_priority     IS 'Prioritas saat keyword OCR cocok ke beberapa kategori. Nilai lebih tinggi = lebih prioritas.';

CREATE TRIGGER trg_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- Tabel Keywords untuk Matching OCR
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS whitelist_keywords (
    id              SERIAL      PRIMARY KEY,
    keyword         VARCHAR(255) NOT NULL,
    category_id     INTEGER     NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    language        VARCHAR(10) NOT NULL DEFAULT 'id',   -- 'id' = Indonesia, 'en' = English
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (keyword, category_id)
);

-- Index LOWER() untuk case-insensitive matching saat OCR
CREATE INDEX idx_whitelist_keywords_lower    ON whitelist_keywords(LOWER(keyword));
CREATE INDEX idx_whitelist_keywords_category ON whitelist_keywords(category_id);

COMMENT ON TABLE  whitelist_keywords            IS 'Kata kunci yang digunakan Audit Agent untuk mencocokkan nama item pada hasil OCR struk belanja';
COMMENT ON COLUMN whitelist_keywords.keyword    IS 'Kata kunci case-insensitive, contoh: rokok, beer, parking, makan siang';
