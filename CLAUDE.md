# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Travel Agent** adalah sistem manajemen perjalanan dinas perusahaan berbasis Multi-Agent Orchestration. Terdiri dari tiga agen AI spesialis yang bekerja di bawah satu Orchestrator Core:

- **Booking Agent** — Parse permintaan perjalanan natural language via Gemini 1.5 Pro, validasi pagu golongan, tampilkan opsi tiket/hotel simulasi
- **Audit Agent** — OCR struk belanja via Gemini 1.5 Pro Vision, matching whitelist kebijakan Finance, hitung nominal reimburse yang disetujui
- **Fuel Agent** — Pin drop peta interaktif, kalkulasi jarak via Google Maps Distance Matrix API, kunci klaim BBM berdasarkan formula resmi

## Repository Structure

```
/                   → Backend API (Node.js + Express + TypeScript)
  src/
    agents/         → Logika bisnis inti setiap agen (booking, audit, fuel, orchestrator)
    routes/         → Express route handlers
    services/       → Wrapper eksternal API (Gemini, Vision, Maps)
    db/client.ts    → pg Pool singleton

client/             → Frontend (Next.js 14 App Router)
  app/(dashboard)/  → Halaman: booking, audit, fuel, admin
  components/       → UI components per modul
  lib/api.ts        → Semua fetch ke backend (satu file, semua modul)

database/
  migrations/       → 001–005 SQL, harus dijalankan berurutan
  seeds/            → 001–005 SQL data sample, dijalankan setelah semua migrations

dify/tools/         → OpenAPI spec untuk Dify.ai Custom Tools (opsional)
uploads/            → Struk foto yang diupload (gitignored kecuali .gitkeep)
```

## Development Commands

### Backend (root)
```bash
npm install
npm run dev        # tsx watch src/index.ts — hot reload, port 3001
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

### Frontend (client/)
```bash
cd client
npm install
npm run dev        # next dev, port 3000
npm run build
npm run lint
```

### Database (Docker)
```bash
# Start postgres + redis saja (untuk dev lokal tanpa Docker penuh)
docker-compose up postgres redis -d

# Start semua layanan
docker-compose up -d

# Reset database (hapus volume lalu recreate)
docker-compose down -v && docker-compose up postgres -d
```

Database diinisialisasi otomatis saat container pertama kali berjalan via `database/init.sh` yang menjalankan migration 001–005 lalu seed 001–005.

## Environment Setup

Salin `.env.example` → `.env` di root. Variabel wajib:

```
DATABASE_URL=postgresql://travel_admin:password@localhost:5432/travel_agent_db
GEMINI_API_KEY=          # Booking Agent + Audit Agent (OCR)
GOOGLE_MAPS_API_KEY=     # Fuel Agent backend (Distance Matrix API)
```

Variabel frontend di `client/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
GOOGLE_MAPS_API_KEY=   # Fuel Agent frontend (Maps JS + Places + Directions)
```

Google Maps API yang harus diaktifkan: **Maps JavaScript API**, **Places API**, **Directions API**, **Distance Matrix API**.

## Architecture: Data Flow Per Agent

### Booking Agent
```
POST /api/booking/submit  { employeeId, rawInput }
  → gemini.service.ts::parseBookingRequest()     # NLP → BookingParsed JSON
  → DB: allowance_matrix WHERE grade = emp.grade  # ambil pagu
  → validasi: max_price <= max_flight_price
  → DB INSERT booking_submissions                 # status: WITHIN_POLICY | EXCEEDS_POLICY
  → DB INSERT immutable_audit_log
  → return: parsed + allowanceCheck + mockFlights + mockHotels
```

### Audit Agent
```
POST /api/audit/scan  multipart: { receipt: File, employeeId }
  → multer simpan → ./uploads/receipt-{uuid}.jpg
  → vision.service.ts::scanReceipt()             # Gemini Vision → ReceiptData JSON
  → per item: matchItemToPolicy()                # ILIKE query ke whitelist_keywords
    - REJECTED menang jika ada konflik (ORDER BY is_allowed ASC)
  → totalApproved = totalClaimed - Σ(item REJECTED)
  → DB INSERT expense_submissions
  → DB INSERT immutable_audit_log
```

### Fuel Agent
```
POST /api/fuel/claims  { employeeId, vehicleId, originLat, originLng, destLat, destLng }
  → DB: vehicles WHERE id = vehicleId            # snapshot E (KM/Liter)
  → DB: fuel_prices WHERE fuel_type = vehicle.fuel_type  # snapshot C (IDR/Liter)
  → maps.service.ts::getDistance()               # Google Distance Matrix → D_aktual (km)
  → V_BBM = D_aktual / E                         # Volume BBM (Liter)
  → Cost_BBM = V_BBM * C                         # Biaya (IDR), dibulatkan ke atas
  → DB INSERT fuel_claims  status='LOCKED'       # dikunci langsung, tidak bisa diubah
  → DB INSERT immutable_audit_log
```

## Database Design

### Immutable Audit Log
`immutable_audit_log` dilindungi trigger PostgreSQL (`fn_protect_audit_log`) yang melempar exception pada setiap `UPDATE` atau `DELETE`. Tabel ini hanya bisa di-`INSERT`. Setiap aksi agen harus menulis satu baris ke tabel ini.

### Snapshot Pattern
`fuel_claims` menyimpan `fuel_efficiency_snapshot` dan `fuel_price_snapshot` — nilai E dan C dikunci pada saat klaim dibuat agar perubahan harga BBM di masa depan tidak mengubah nilai klaim historis. Pola yang sama berlaku untuk `allowance_check` (JSON) di `booking_submissions`.

### Pagu Golongan
Karyawan memiliki `grade` (I, II, III, IV). Tabel `allowance_matrix` menyimpan batas maksimal per golongan:

| Golongan | Max Tiket Pesawat | Max Hotel/malam |
|----------|-------------------|-----------------|
| I        | Rp 1.500.000      | Rp 450.000      |
| II       | Rp 2.000.000      | Rp 650.000      |
| III      | Rp 3.500.000      | Rp 1.000.000    |
| IV       | Rp 5.000.000      | Rp 2.000.000    |

### Migration Order
Migrations **wajib** dijalankan berurutan karena dependencies antar tabel:
- `001` mendefinisikan `update_updated_at_column()` trigger function yang dipakai oleh semua migration berikutnya
- `002` membutuhkan `employees` dari 001
- `005` membutuhkan `employees`, `vehicles` dari 001 dan 004

## Key Business Formulas

```
# Fuel Agent
V_BBM     = D_aktual / E          # Liter
Cost_BBM  = V_BBM * C             # IDR (Math.ceil)

# Audit Agent
Nominal Disetujui = Total Nota - Σ(total_price item REJECTED)
```

## Frontend Architecture

`client/lib/api.ts` adalah satu-satunya file yang boleh memanggil backend. Semua komponen mengimpor fungsi dari sini (`submitBooking`, `scanReceipt`, `createFuelClaim`, dll).

`client/components/fuel/RouteMap.tsx` menggunakan `dynamic(() => import(...), { ssr: false })` di page karena Google Maps tidak kompatibel dengan SSR. Map instance, markers, dan DirectionsRenderer disimpan dalam `useRef` — bukan state — untuk menghindari re-render berlebihan.

Gemini Vision model (`gemini-1.5-pro`) dipanggil dari backend dengan `inlineData` (base64 image buffer), bukan URL. File dibaca dari disk setelah multer menyimpannya.

## Dify.ai Compatibility

Backend dirancang agar tiap endpoint bisa didaftarkan sebagai Custom Tool di Dify Self-Hosted. OpenAPI spec tersedia di `dify/tools/booking-tool.yaml`. Saat Dify memanggil endpoint, gunakan URL internal Docker: `http://api:3001`.

## API Endpoints Summary

```
GET  /health
GET  /api/booking/employees
POST /api/booking/submit           { employeeId, rawInput }
GET  /api/booking/submissions      ?employeeId=X
GET  /api/booking/submissions/:id

POST /api/audit/scan               multipart: receipt + employeeId
GET  /api/audit/submissions        ?employeeId=X
GET  /api/audit/submissions/:id
GET  /api/audit/policy

GET  /api/fuel/vehicles
GET  /api/fuel/prices
POST /api/fuel/claims              { employeeId, vehicleId, originLat, originLng, destLat, destLng }
GET  /api/fuel/claims              ?employeeId=X
GET  /api/fuel/claims/:id

GET  /uploads/:filename            static — foto struk yang diupload
```
