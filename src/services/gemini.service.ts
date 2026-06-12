import { generateText } from './llm.service';

export interface BookingParsed {
  category: 'flight' | 'hotel' | 'both' | 'unknown';
  origin: string | null;
  destination: string;
  departure_date: string;
  return_date: string | null;
  max_price: number | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  duration_nights: number | null;
  preferences: string[];
}

function buildSystemPrompt(): string {
  const now    = new Date();
  const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const todayStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  return `Anda adalah "TravelAgent-Brain", komponen AI dari sistem manajemen perjalanan dinas perusahaan.

Tugas: Ubah permintaan perjalanan kasual dari karyawan menjadi JSON terstruktur.

PANDUAN EKSTRAKSI:
1. TANGGAL: Ubah kata relatif ("besok", "minggu depan", "Senin ini") ke format YYYY-MM-DD.
   Konteks waktu: Hari ini adalah ${todayStr}. PENTING: departure_date HARUS di masa mendatang.
2. KOTA → KODE BANDARA (3 huruf IATA):
   Jakarta/Soekarno-Hatta → CGK | Bali/Denpasar → DPS | Surabaya → SUB
   Yogyakarta → JOG | Medan → KNO | Semarang → SRG | Makassar → UPG
   Balikpapan → BPN | Palembang → PLM | Lombok → LOP | Manado → MDC
   Pekanbaru → PKU | Padang → PDG | Pontianak → PNK | Ambon → AMQ
3. HARGA: Angka murni tanpa Rp/titik/koma. "1,5 juta" → 1500000. Jika tidak disebut → null.
4. KATEGORI: "flight"=tiket saja | "hotel"=hotel saja | "both"=keduanya | "unknown"=tidak jelas.
5. DURASI HOTEL: Hitung duration_nights dari check_in ke check_out jika disebutkan.
6. PREFERENSI: Catat detail seperti "penerbangan pagi", "bintang 4", "tanpa transit".

OUTPUT: JSON murni TANPA markdown, TANPA teks penjelasan, TANPA komentar.`;
}

export async function parseBookingRequest(rawInput: string): Promise<BookingParsed> {
  const text = await generateText(buildSystemPrompt(), rawInput, true);
  const parsed = JSON.parse(text) as BookingParsed;
  // LLM kadang mengembalikan null atau tidak menyertakan field array
  parsed.preferences = Array.isArray(parsed.preferences) ? parsed.preferences : [];
  return parsed;
}
