-- =============================================================
-- Seed 004: Whitelist Policy Items
-- Kategori dan keyword untuk Audit Agent (OCR matching)
-- Dikelola oleh Admin Finance
-- =============================================================

-- -----------------------------------------------
-- Kategori DIIZINKAN untuk reimbursement
-- -----------------------------------------------
INSERT INTO expense_categories (category_name, is_allowed, match_priority) VALUES
('Makanan & Minuman Non-Alkohol',   TRUE, 10),
('Transportasi Umum',               TRUE, 10),
('BBM & Bahan Bakar',               TRUE, 10),
('Tol & Parkir',                    TRUE, 10),
('Akomodasi',                       TRUE, 10),
('Kebutuhan Kerja / ATK',           TRUE, 8),
('Komunikasi (Pulsa/Data)',         TRUE, 7),
('Obat-obatan / Apotek',           TRUE, 7)
ON CONFLICT (category_name) DO NOTHING;

-- -----------------------------------------------
-- Kategori DILARANG untuk reimbursement
-- -----------------------------------------------
INSERT INTO expense_categories (category_name, is_allowed, rejection_reason, match_priority) VALUES
('Rokok & Produk Tembakau',
 FALSE,
 'Pengeluaran untuk produk tembakau tidak termasuk dalam kebijakan reimbursement perjalanan dinas',
 10),
('Minuman Beralkohol',
 FALSE,
 'Minuman beralkohol dilarang diklaim sebagai pengeluaran dinas berdasarkan kebijakan perusahaan',
 10),
('Hiburan & Entertainment',
 FALSE,
 'Biaya hiburan (bioskop, karaoke, nightclub) bukan bagian dari anggaran perjalanan dinas',
 9),
('Barang Pribadi / Fashion',
 FALSE,
 'Pembelian barang pribadi seperti pakaian, aksesori, dan elektronik tidak dapat diklaim',
 9),
('Spa, Pijat & Perawatan Tubuh',
 FALSE,
 'Layanan spa, pijat, dan perawatan tubuh bukan kebutuhan perjalanan dinas',
 8),
('Perjudian & Lotre',
 FALSE,
 'Segala bentuk aktivitas perjudian dilarang keras dan tidak dapat diklaim',
 10)
ON CONFLICT (category_name) DO NOTHING;

-- -----------------------------------------------
-- Keywords ALLOWED
-- -----------------------------------------------
INSERT INTO whitelist_keywords (keyword, category_id, language) VALUES
-- Makanan & Minuman
('nasi',        (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('makan',       (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('minum',       (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('restoran',    (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('warung',      (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('rumah makan', (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('cafe',        (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('kopi',        (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('teh',         (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('air mineral', (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('jus',         (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('snack',       (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'id'),
('food',        (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'en'),
('meal',        (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'en'),
('lunch',       (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'en'),
('dinner',      (SELECT id FROM expense_categories WHERE category_name = 'Makanan & Minuman Non-Alkohol'), 'en'),
-- Transportasi
('taksi',       (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('ojek',        (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('grab',        (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('gojek',       (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('bus',         (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('kereta',      (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('angkot',      (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'id'),
('taxi',        (SELECT id FROM expense_categories WHERE category_name = 'Transportasi Umum'), 'en'),
-- BBM
('pertalite',   (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('pertamax',    (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('solar',       (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('bbm',         (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('bensin',      (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('spbu',        (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
('pertamina',   (SELECT id FROM expense_categories WHERE category_name = 'BBM & Bahan Bakar'), 'id'),
-- Tol & Parkir
('tol',         (SELECT id FROM expense_categories WHERE category_name = 'Tol & Parkir'), 'id'),
('parkir',      (SELECT id FROM expense_categories WHERE category_name = 'Tol & Parkir'), 'id'),
('parking',     (SELECT id FROM expense_categories WHERE category_name = 'Tol & Parkir'), 'en')
ON CONFLICT (keyword, category_id) DO NOTHING;

-- -----------------------------------------------
-- Keywords REJECTED
-- -----------------------------------------------
INSERT INTO whitelist_keywords (keyword, category_id, language) VALUES
-- Rokok
('rokok',       (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('gudang garam',(SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('dji sam soe', (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('sampoerna',   (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('marlboro',    (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'en'),
('cigarette',   (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'en'),
('tembakau',    (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('vape',        (SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
('rokok kretek',(SELECT id FROM expense_categories WHERE category_name = 'Rokok & Produk Tembakau'), 'id'),
-- Alkohol
('bir',         (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'id'),
('bintang',     (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'id'),
('wine',        (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'en'),
('whiskey',     (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'en'),
('alkohol',     (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'id'),
('beer',        (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'en'),
('vodka',       (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'en'),
('whisky',      (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'en'),
('tuak',        (SELECT id FROM expense_categories WHERE category_name = 'Minuman Beralkohol'), 'id'),
-- Entertainment
('bioskop',     (SELECT id FROM expense_categories WHERE category_name = 'Hiburan & Entertainment'), 'id'),
('karaoke',     (SELECT id FROM expense_categories WHERE category_name = 'Hiburan & Entertainment'), 'id'),
('cinema',      (SELECT id FROM expense_categories WHERE category_name = 'Hiburan & Entertainment'), 'en'),
('nightclub',   (SELECT id FROM expense_categories WHERE category_name = 'Hiburan & Entertainment'), 'en'),
('club malam',  (SELECT id FROM expense_categories WHERE category_name = 'Hiburan & Entertainment'), 'id'),
-- Spa
('spa',         (SELECT id FROM expense_categories WHERE category_name = 'Spa, Pijat & Perawatan Tubuh'), 'id'),
('pijat',       (SELECT id FROM expense_categories WHERE category_name = 'Spa, Pijat & Perawatan Tubuh'), 'id'),
('massage',     (SELECT id FROM expense_categories WHERE category_name = 'Spa, Pijat & Perawatan Tubuh'), 'en'),
('refleksi',    (SELECT id FROM expense_categories WHERE category_name = 'Spa, Pijat & Perawatan Tubuh'), 'id')
ON CONFLICT (keyword, category_id) DO NOTHING;
