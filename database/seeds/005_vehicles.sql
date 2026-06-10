-- =============================================================
-- Seed 005: Data Kendaraan Dinas & Harga BBM Aktif
-- =============================================================

-- -----------------------------------------------
-- Kendaraan Dinas
-- fuel_efficiency = E (KM/Liter) untuk rumus V_BBM = D_aktual / E
-- -----------------------------------------------
INSERT INTO vehicles (vehicle_code, brand, model, vehicle_type, year, license_plate, fuel_efficiency, fuel_type, notes) VALUES
('VH-001', 'Toyota',     'Avanza 1.3 G',      'MPV',       2022, 'B 1234 ABC', 11.0, 'Pertalite',  'Kendaraan operasional umum'),
('VH-002', 'Toyota',     'Innova Reborn 2.0', 'MPV',       2021, 'B 5678 DEF', 10.5, 'Pertamax',   'Kendaraan manager ke atas'),
('VH-003', 'Honda',      'Brio RS 1.2',       'Hatchback', 2023, 'B 9012 GHI', 14.0, 'Pertalite',  'Kendaraan operasional ringan'),
('VH-004', 'Suzuki',     'Ertiga GL 1.5',     'MPV',       2022, 'B 3456 JKL', 12.0, 'Pertalite',  'Kendaraan operasional'),
('VH-005', 'Mitsubishi', 'Pajero Sport 2.4',  'SUV',       2020, 'B 7890 MNO',  8.5, 'Solar',   'Kendaraan dinas eksekutif'),
('VH-006', 'Toyota',     'Rush 1.5 TRD',      'SUV',       2023, 'B 2468 PQR', 12.5, 'Pertalite',  'Kendaraan operasional lapangan'),
('VH-007', 'Daihatsu',   'Xenia X 1.3',       'MPV',       2021, 'B 1357 STU', 11.5, 'Pertalite',  'Kendaraan pool kantor'),
('VH-008', 'Honda',      'HR-V 1.5 E CVT',    'SUV',       2022, 'B 8642 VWX', 13.0, 'Pertamax',   'Kendaraan supervisor'),
('VH-009', 'Toyota',     'Fortuner 2.7 SRZ',  'SUV',       2020, 'B 9753 YZA',  9.0, 'Pertamax',   'Kendaraan direktur'),
('VH-010', 'Isuzu',      'D-Max 1.9 Hi-Lander','Pickup',   2021, 'B 6428 BCD',  9.5, 'Solar',      'Kendaraan operasional logistik')
ON CONFLICT (vehicle_code) DO NOTHING;

-- -----------------------------------------------
-- Harga BBM Aktif (Snapshot per Juni 2026)
-- Sumber: Pertamina
-- -----------------------------------------------
INSERT INTO fuel_prices (fuel_type, price_per_liter, effective_date, source) VALUES
('Pertalite',       10000,  '2026-06-10', 'Pertamina — SK Harga BBM 2026'),
('Pertamax',        16250,  '2026-06-10', 'Pertamina — SK Harga BBM 2026'),
('Pertamax Turbo',  20750,  '2026-06-10', 'Pertamina — SK Harga BBM 2026'),
('Dex',             24800,  '2026-06-10', 'Pertamina — SK Harga BBM 2026'),
('Solar',    6800,  '2026-06-10', 'Pertamina — SK Harga BBM 2026'),
('Dexlite',         23000,  '2026-06-10', 'Pertamina — SK Harga BBM 2026')
ON CONFLICT (fuel_type) DO UPDATE SET
    price_per_liter = EXCLUDED.price_per_liter,
    effective_date  = EXCLUDED.effective_date,
    source          = EXCLUDED.source,
    updated_at      = NOW();
