-- =============================================================
-- Migration 004: Vehicle Assets Database
-- Data kendaraan dinas dan efisiensi BBM (KM/Liter)
-- Digunakan oleh Fuel Agent untuk kalkulasi kebutuhan BBM riil
-- =============================================================

-- -----------------------------------------------
-- Tabel Kendaraan Dinas
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id                  SERIAL          PRIMARY KEY,
    vehicle_code        VARCHAR(20)     NOT NULL UNIQUE,
    brand               VARCHAR(100)    NOT NULL,           -- Toyota, Honda, Suzuki, dll.
    model               VARCHAR(100)    NOT NULL,           -- Avanza, Innova, Brio, dll.
    vehicle_type        VARCHAR(50),                        -- sedan | MPV | SUV | Hatchback | Pickup
    year                INTEGER,
    license_plate       VARCHAR(20)     UNIQUE,
    fuel_efficiency     DECIMAL(5,2)    NOT NULL,           -- E (KM/Liter)
    fuel_type           VARCHAR(50)     NOT NULL DEFAULT 'Pertalite',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fuel_efficiency  CHECK (fuel_efficiency > 0),
    CONSTRAINT chk_year             CHECK (year IS NULL OR (year BETWEEN 1990 AND 2035)),
    CONSTRAINT chk_vehicle_type     CHECK (vehicle_type IN ('Sedan', 'MPV', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Truck'))
);

CREATE INDEX idx_vehicles_active ON vehicles(is_active);

COMMENT ON TABLE  vehicles                  IS 'Data aset kendaraan dinas perusahaan beserta spesifikasi efisiensi BBM';
COMMENT ON COLUMN vehicles.fuel_efficiency  IS 'Rata-rata efisiensi konsumsi BBM dalam KM/Liter (E). Dipakai dalam rumus: V_BBM = D_aktual / E';
COMMENT ON COLUMN vehicles.fuel_type        IS 'Jenis BBM yang dikonsumsi kendaraan. Referensi ke tabel fuel_prices.';

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------
-- Tabel Harga BBM Aktif (dapat diperbarui oleh Admin)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_prices (
    id              SERIAL      PRIMARY KEY,
    fuel_type       VARCHAR(50) NOT NULL UNIQUE,
    price_per_liter INTEGER     NOT NULL,   -- C (IDR per Liter)
    effective_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    source          VARCHAR(255),           -- Sumber: 'Pertamina Official', dll.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_price_positive CHECK (price_per_liter > 0)
);

COMMENT ON TABLE  fuel_prices                   IS 'Harga BBM aktif per liter. Digunakan Fuel Agent dalam rumus: Cost_BBM = V_BBM * C';
COMMENT ON COLUMN fuel_prices.price_per_liter   IS 'Harga BBM (C) dalam IDR per Liter. Snapshot harga dikunci pada saat klaim dibuat.';
COMMENT ON COLUMN fuel_prices.effective_date    IS 'Tanggal efektif berlakunya harga ini';

CREATE TRIGGER trg_fuel_prices_updated_at
    BEFORE UPDATE ON fuel_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
