import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

const SYSTEM_PROMPT = `Anda adalah "TravelAgent-Brain", komponen AI dari sistem manajemen perjalanan dinas perusahaan.

Tugas: Ubah permintaan perjalanan kasual dari karyawan menjadi JSON terstruktur.

PANDUAN EKSTRAKSI:
1. TANGGAL: Ubah kata relatif ("besok", "minggu depan", "Senin ini") ke format YYYY-MM-DD.
   Konteks waktu: Hari ini adalah Senin, 8 Juni 2026.
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

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ['category', 'destination', 'departure_date', 'preferences'],
  properties: {
    category: { type: SchemaType.STRING, enum: ['flight', 'hotel', 'both', 'unknown'] },
    origin: { type: SchemaType.STRING, nullable: true, description: 'Kode bandara asal (default CGK jika tidak disebut)' },
    destination: { type: SchemaType.STRING, description: 'Kode bandara tujuan 3 huruf' },
    departure_date: { type: SchemaType.STRING, description: 'Format YYYY-MM-DD' },
    return_date: { type: SchemaType.STRING, nullable: true, description: 'Tanggal pulang YYYY-MM-DD atau null' },
    max_price: { type: SchemaType.INTEGER, nullable: true, description: 'Budget max tiket dalam IDR tanpa format' },
    hotel_check_in: { type: SchemaType.STRING, nullable: true, description: 'Tanggal check-in hotel YYYY-MM-DD' },
    hotel_check_out: { type: SchemaType.STRING, nullable: true, description: 'Tanggal check-out hotel YYYY-MM-DD' },
    duration_nights: { type: SchemaType.INTEGER, nullable: true, description: 'Jumlah malam menginap' },
    preferences: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Preferensi spesifik user',
    },
  },
};

export async function parseBookingRequest(rawInput: string): Promise<BookingParsed> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as never,
      temperature: 0.1,
    },
  });

  const result = await model.generateContent(rawInput);
  const text = result.response.text();

  return JSON.parse(text) as BookingParsed;
}
