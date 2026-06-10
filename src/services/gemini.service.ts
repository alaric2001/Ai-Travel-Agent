import { generateText } from './llm.service';

export interface BookingParsed {
  category:        'flight' | 'hotel' | 'both' | 'unknown';
  origin:          string | null;
  destination:     string;
  departure_date:  string;
  return_date:     string | null;
  max_price:       number | null;
  hotel_check_in:  string | null;
  hotel_check_out: string | null;
  duration_nights: number | null;
  preferences:     string[];
}

const SYSTEM_PROMPT = `Anda adalah "TravelAgent-Brain", komponen AI dari sistem manajemen perjalanan dinas perusahaan.

Tugas: Ubah permintaan perjalanan kasual dari karyawan menjadi JSON terstruktur.

PANDUAN EKSTRAKSI:
1. TANGGAL: Ubah kata relatif ("besok", "minggu depan") ke format YYYY-MM-DD.
   Konteks waktu: Hari ini adalah Senin, 8 Juni 2026.
2. KOTA → KODE BANDARA IATA (3 huruf):
   Jakarta → CGK | Bali/Denpasar → DPS | Surabaya → SUB | Yogyakarta → JOG
   Medan → KNO | Semarang → SRG | Makassar → UPG | Balikpapan → BPN
   Palembang → PLM | Lombok → LOP | Manado → MDC | Pekanbaru → PKU
3. HARGA: Angka murni IDR. "1,5 juta" → 1500000. Tidak ada → null.
4. KATEGORI: "flight" | "hotel" | "both" | "unknown"
5. duration_nights: hitung dari check_in ke check_out, atau null.

OUTPUT: JSON murni SATU baris, TANPA markdown, TANPA teks lain:
{"category":"both","origin":"CGK","destination":"SUB","departure_date":"2026-06-10","return_date":"2026-06-13","max_price":1500000,"hotel_check_in":"2026-06-10","hotel_check_out":"2026-06-13","duration_nights":3,"preferences":[]}`;

export async function parseBookingRequest(rawInput: string): Promise<BookingParsed> {
  const raw = await generateText(SYSTEM_PROMPT, rawInput, true);

  // Toleran: ekstrak JSON meskipun model membungkus dengan teks/markdown
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Model tidak mengembalikan JSON valid. Output: ${raw.slice(0, 200)}`);

  return JSON.parse(match[0]) as BookingParsed;
}
