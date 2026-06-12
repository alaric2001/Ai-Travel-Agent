# 🚀 AI Travel Agent — Sistem Manajemen Perjalanan Dinas Multi-Agen

> Sistem **Multi-Agent Orchestration** enterprise untuk otomatisasi pemesanan tiket perjalanan dinas, audit pengeluaran via Vision AI, dan pengelolaan klaim BBM secara real-time.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

---

## 🎯 Tentang Proyek

**AI Travel Agent** mengotomatiskan 3 alur kerja kritis manajemen perjalanan dinas dengan **audit log permanen** dan pengambilan keputusan real-time:

| **Booking Agent** | **Audit Agent** | **Fuel Agent** |
|---|---|---|
| 💬 Parsing permintaan via NLP | 📸 OCR struk belanja dengan Vision AI | 🗺️ Pemetaan rute interaktif |
| ✅ Validasi otomatis terhadap pagu golongan | 🏷️ Kategorisasi item pengeluaran | 📍 Kalkulasi jarak real-time |
| 🎫 Tampilkan opsi penerbangan/hotel | 💰 Hitung nominal reimburse yang disetujui | 🔒 Kunci klaim BBM secara permanen |
| Status: WITHIN_POLICY / EXCEEDS_POLICY | Cocokkan dengan whitelist kebijakan Finance | Rumus: V_BBM = D/E, Biaya = V × C |

**Setiap transaksi bersifat append-only** — trigger PostgreSQL mencegah manipulasi. Jejak audit tamper-proof untuk keperluan kepatuhan (*compliance*).

---

## ✨ Fitur Utama

### 🤖 **Tiga Agen AI Spesialis**

**1. Booking Agent** — "Mau terbang ke Jakarta 15-17 Mei, hotel bintang 4"
- Parsing NLP dengan Gemini 1.5 Pro
- Validasi otomatis terhadap matriks pagu golongan (Golongan I–IV)
- Tampilkan opsi penerbangan/hotel yang sesuai policy
- Routing persetujuan otomatis jika melebihi pagu

**2. Audit Agent** — "Upload foto struk, saya audit dan hitung reimburse"
- Vision AI membaca struk restoran/toko/SPBU dari foto
- Ekstraksi per-baris: merchant, alamat, tanggal, item, subtotal, pajak, metode pembayaran
- Kategorisasi berbasis whitelist (item diizinkan vs. ditolak)
- Hitung otomatis reimburse final: `Disetujui = Total - Item Ditolak`

**3. Fuel Agent** — "Pin titik A→B, saya hitung biaya BBM final"
- Peta Google Maps interaktif dengan Places Autocomplete
- Jarak aktual real-time via Google Distance Matrix API
- Kalkulasi otomatis: `V_BBM = Jarak / Efisiensi_Bahan_Bakar`
- **Klaim dikunci** — tidak bisa diubah setelah disubmit (mencegah fraud)

### 🔒 **Audit Log Permanen (Immutable)**
- Trigger PostgreSQL (`fn_protect_audit_log`) memaksa penulisan append-only
- Setiap booking, scan struk, klaim BBM → satu baris log permanen
- UPDATE/DELETE tidak mungkin dilakukan — jejak audit setingkat compliance

### 📊 **Pola Snapshot Database**
- Efisiensi BBM (E) & harga (C) dikunci pada saat klaim dibuat
- Integritas data historis — perubahan harga BBM di masa depan tidak mempengaruhi klaim lama
- Berlaku juga untuk matriks pagu golongan

### 🔌 **Penggantian Provider LLM saat Runtime**
```
LLM_PROVIDER=auto (default)
├─ Ollama (lokal) jika OLLAMA_BASE_URL tersedia
└─ Fallback: Gemini (cloud)

Timeout terpisah:
├─ Teks: 120 detik  (qwen2.5:7b)
└─ Vision: 600 detik (qwen2.5vl:latest)
```

### 🖼️ **Optimasi Gambar untuk Vision AI**
- Auto-resize ke 768×768px + kualitas JPEG 80%
- Reduksi payload: **225KB → 45KB** (hemat 90%)
- Membuat inferensi Ollama ~10x lebih cepat melalui tunnel ngrok

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────┐
│   Frontend (Next.js 14)         │
│  Booking │ Audit │ Fuel (Map)   │
└──────────────┬──────────────────┘
               │ HTTP/JSON
┌──────────────┴──────────────────┐
│  Backend API (Express + TS)     │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Booking │ Audit │ Fuel  │   │
│  │  (Agen Terorkestrasi)   │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  LLM Router Service     │   │
│  │  (Ollama ↔ Gemini)     │   │
│  └─────────────────────────┘   │
└──────────────┬──────────────────┘
     ┌─────────┼──────────┐
     ▼         ▼          ▼
  PostgreSQL  Ollama   Google Maps
  (Immutable)  (LLM)  (Distance)
```

---

## 🚀 Panduan Instalasi

### **Prasyarat**
- Node.js 18+
- Docker Desktop
- Google Maps API Key (Maps JS, Places, Directions, Distance Matrix)
- Gemini API Key (backup)
- Instance Ollama (opsional — LLM lokal)

### **1. Instalasi**
```bash
git clone <repo> && cd ai-travel-agent
npm install
cd client && npm install && cd ..
```

### **2. Konfigurasi .env**
```bash
# Root (.env)
DATABASE_URL=postgresql://travel_admin:password@localhost:5432/travel_agent_db
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=AIza...
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=https://your-ollama.ngrok-free.dev
LLM_MODEL=qwen2.5:7b
VISION_MODEL=qwen2.5vl:latest

# Frontend (client/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### **3. Jalankan Database**
```bash
docker-compose up postgres redis -d
# PostgreSQL otomatis menjalankan migration 001–005 + seeding data
```

### **4. Jalankan Backend & Frontend**
```bash
# Terminal 1 — Backend (port 3001)
npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

Buka **http://localhost:3000** 🎉

---

## 📡 Endpoint API

```http
# Booking Agent
GET    /api/booking/employees
POST   /api/booking/submit             { employeeId, rawInput }
GET    /api/booking/submissions?employeeId=X

# Audit Agent
POST   /api/audit/scan                 multipart: { receipt, employeeId }
GET    /api/audit/submissions?employeeId=X
GET    /api/audit/policy

# Fuel Agent
GET    /api/fuel/vehicles
GET    /api/fuel/prices
POST   /api/fuel/claims                { employeeId, vehicleId, originLat, ... }
GET    /api/fuel/claims?employeeId=X
```

---

## 💡 Tantangan Teknis yang Berhasil Dipecahkan

### 1. **Konflik DOM React ↔ Google Maps**
- **Masalah**: Maps API memanipulasi DOM secara dinamis, merusak rekonsiliasi React
- **Solusi**: Simpan instance peta di `useRef` (bukan state), cleanup listener saat unmount, kontainer terpisah per marker

### 2. **Timeout Vision AI di Jaringan Lambat**
- **Masalah**: Foto struk 225KB timeout pada batas 120 detik saat dikirim ke Ollama via ngrok
- **Solusi**: Resize gambar ke 768×768px + kualitas JPEG 80% → **45KB**, timeout vision dipisah menjadi **600 detik**

### 3. **Abstraksi Provider LLM**
- **Masalah**: Perlu berganti Ollama ↔ Gemini saat runtime tanpa mengubah kode agent
- **Solusi**: Satu `llm.service.ts` sebagai router, routing via env var `LLM_PROVIDER`, fallback otomatis

### 4. **Migrasi API Google Maps Baru**
- **Masalah**: `PlaceAutocomplete` diganti `PlaceAutocompleteElement` (Web Component), tidak kompatibel CSS Tailwind ke shadow DOM
- **Solusi**: Migrasi ke `PlaceAutocompleteElement`, gunakan CSS custom properties, badge dipindah ke luar shadow DOM

### 5. **Penegakan Audit Log Permanen**
- **Masalah**: Bagaimana mencegah perubahan tidak sah pada catatan audit?
- **Solusi**: Trigger PostgreSQL `fn_protect_audit_log()` memblokir SEMUA UPDATE/DELETE, melempar exception

---

## 🏆 Tech Stack

| **Layer** | **Teknologi** |
|---|---|
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16 (immutable audit log via trigger) |
| **AI/ML** | Gemini 1.5 Pro/Flash, Ollama (LLM lokal), Vision API |
| **Maps** | Google Maps JS API, Places API, Distance Matrix API |
| **File Upload** | Multer, sharp (kompresi gambar otomatis) |
| **DevOps** | Docker, Docker Compose, tsx (hot reload) |

---

## 📊 Desain Database

| Fitur | Implementasi |
|---|---|
| **Immutable Audit Log** | Trigger PL/pgSQL memblokir UPDATE/DELETE |
| **Snapshot Pattern** | `fuel_efficiency_snapshot`, `fuel_price_snapshot` dikunci saat klaim |
| **RBAC** | 6 role (super_admin, finance_admin, employee, approver, dst.) + 22 permission |
| **Matriks Pagu** | Batas anggaran per golongan (I–IV), divalidasi otomatis |
| **Whitelist Policy** | Kategori pengeluaran + tabel `whitelist_keywords` untuk pencocokan item |

---

## 📂 Struktur Proyek

```
ai-travel-agent/
├── src/
│   ├── agents/              # Logika bisnis Booking, Audit, Fuel
│   ├── routes/              # Endpoint Express
│   ├── services/            # Wrapper LLM, Vision, Maps
│   ├── db/                  # PostgreSQL client
│   └── index.ts             # Entry point server
├── client/                  # Frontend Next.js
│   ├── app/(dashboard)/     # Halaman Booking, Audit, Fuel
│   ├── components/          # UI per agen
│   └── lib/api.ts           # API client terpusat
├── database/
│   ├── migrations/          # SQL 001–005 (urutan wajib)
│   ├── seeds/               # Data sample
│   └── init.sh              # Inisialisasi Docker
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## 📐 Rumus Bisnis

```
# Fuel Agent
V_BBM  = Jarak_km / Efisiensi_KM_per_Liter
Biaya  = Math.ceil(V_BBM × Harga_BBM_IDR_per_Liter)

# Audit Agent
Disetujui = Total_Nota - Jumlah(Item_Ditolak)

# Booking Validation
if (Harga_Tiket > Pagu[Golongan]) → EXCEEDS_POLICY
```

---

## 🔐 Keamanan & Kepatuhan

- ✅ Jejak audit permanen (trigger PostgreSQL)
- ✅ Role-Based Access Control (6 role, 22 permission)
- ✅ Snapshot data historis (integritas klaim masa lalu)
- ✅ Validasi upload file (ukuran, tipe, penamaan uuid)
- ✅ JWT auth siap pakai (default 8 jam)
- ✅ Environment masking (.env di .gitignore)

---

## 👤 Pengembang

- **Alaric** — Full Stack Developer & AI Engineer
- Email: alaric2001ra@gmail.com

---

## 📄 Lisensi

MIT License

---

## 🎯 Roadmap

- [ ] Dukungan multi-bahasa (EN, ID, ZH)
- [ ] Aplikasi mobile (React Native)
- [ ] Dashboard analitik
- [ ] Integrasi platform workflow Dify.ai
- [ ] Notifikasi email (konfirmasi booking, hasil audit)
- [ ] Konversi mata uang real-time (IDR → USD, dst.)
- [ ] Integrasi Gemini 2.0 untuk inferensi lebih cepat

---

**Dibangun untuk otomatisasi perjalanan dinas dan kepatuhan audit korporat.**

_Terakhir diperbarui: Juni 2026_
