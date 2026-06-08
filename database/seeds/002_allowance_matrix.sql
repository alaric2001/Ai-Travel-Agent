-- =============================================================
-- Seed 002: Matriks Pagu Per Golongan Karyawan
-- Nilai dalam IDR (Rupiah). Disesuaikan berdasarkan kebijakan perusahaan.
-- =============================================================

INSERT INTO allowance_matrix (grade, grade_label, max_flight_price, max_hotel_price_per_night, max_daily_allowance, notes) VALUES
(
    'I',
    'Staff / Pelaksana',
    1500000,    -- Max tiket pesawat: Rp 1.500.000 (economy class)
    450000,     -- Max hotel/malam:   Rp 450.000 (bintang 2-3)
    250000,     -- Uang harian:       Rp 250.000
    'Kelas economy, hotel bintang 2-3, transportasi umum'
),
(
    'II',
    'Officer / Staf Senior',
    2000000,    -- Max tiket pesawat: Rp 2.000.000 (economy flex)
    650000,     -- Max hotel/malam:   Rp 650.000 (bintang 3)
    350000,     -- Uang harian:       Rp 350.000
    'Kelas economy flex, hotel bintang 3, taksi/rideshare'
),
(
    'III',
    'Manager / Supervisor',
    3500000,    -- Max tiket pesawat: Rp 3.500.000 (economy/business)
    1000000,    -- Max hotel/malam:   Rp 1.000.000 (bintang 4)
    500000,     -- Uang harian:       Rp 500.000
    'Kelas business, hotel bintang 4, transportasi bebas'
),
(
    'IV',
    'Direktur / Eksekutif',
    5000000,    -- Max tiket pesawat: Rp 5.000.000 (business class)
    2000000,    -- Max hotel/malam:   Rp 2.000.000 (bintang 4-5)
    750000,     -- Uang harian:       Rp 750.000
    'Kelas business, hotel bintang 5, transportasi khusus'
)
ON CONFLICT (grade) DO UPDATE SET
    grade_label                 = EXCLUDED.grade_label,
    max_flight_price            = EXCLUDED.max_flight_price,
    max_hotel_price_per_night   = EXCLUDED.max_hotel_price_per_night,
    max_daily_allowance         = EXCLUDED.max_daily_allowance,
    notes                       = EXCLUDED.notes,
    updated_at                  = NOW();
