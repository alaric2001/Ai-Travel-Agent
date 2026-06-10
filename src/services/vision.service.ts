import * as fs from 'fs/promises';
import { generateVision } from './llm.service';

export interface ExtractedReceiptItem {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number;
}

export interface ReceiptData {
  merchant_name: string;
  merchant_address: string | null;
  date: string | null;
  receipt_number: string | null;
  items: ExtractedReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number;
  payment_method: string | null;
}

// const OCR_PROMPT = `Anda adalah sistem OCR untuk membaca struk/nota belanja Indonesia.
// Baca gambar ini dan ekstrak semua informasi. Semua harga = angka murni IDR tanpa Rp/titik/koma.

// Output JSON murni TANPA markdown:
// {"merchant_name":"...","merchant_address":null,"date":"YYYY-MM-DD","receipt_number":null,
// "payment_method":"Cash","subtotal":null,"tax":null,"total":85000,
// "items":[{"name":"Nama Item","quantity":1,"unit_price":25000,"total_price":25000}]}`;

// Prompt dirombak agar lebih ketat dan menangani kasus struk SPBU/BBM
const OCR_PROMPT = `Tugas Anda adalah mengekstrak data dari gambar struk belanja/BBM Indonesia ini ke dalam format JSON.

ATURAN KETAT EKSTRAKSI:
1. MERCHANT: Ambil nama toko/SPBU dan alamat lengkap jika ada.
2. ANGKA HARGA: Ekstrak sebagai angka murni (integer). Abaikan simbol 'Rp', koma, atau titik pemisah ribuan (contoh: 'Rp. 250,000' menjadi 250000).
3. KUANTITAS/VOLUME: Khusus untuk struk BBM, perhatikan baris "Volume" atau "(L)". Ekstrak angka desimalnya (contoh: 27.77) masukkan ke dalam properti "quantity".
4. TANGGAL: Jika format di struk adalah DD/MM/YYYY, wajib konversi ke YYYY-MM-DD (contoh: '27/10/2021' menjadi '2021-10-27').
5. JSON FORMAT: Output HARUS valid JSON. Jangan tambahkan penjelasan apapun, jangan gunakan blok kode markdown (\`\`\`).

CONTOH OUTPUT JSON:
{
  "merchant_name": "PERTAMINA 34.40111",
  "merchant_address": "JL. CIPAGANTI, PASTEUR, SUKAJADI, BANDUNG",
  "date": "2021-10-27",
  "receipt_number": "273512",
  "payment_method": "CASH",
  "subtotal": null,
  "tax": null,
  "total": 250000,
  "items": [
    {
      "name": "PERTAMAX",
      "quantity": 27.77,
      "unit_price": 9000,
      "total_price": 250000
    }
  ]
}`;

export async function scanReceipt(filePath: string, mimeType: string): Promise<ReceiptData> {
  const imageBuffer = await fs.readFile(filePath);
  const base64Image = imageBuffer.toString('base64');

  const raw = await generateVision(base64Image, mimeType, OCR_PROMPT);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Vision model tidak menghasilkan JSON valid. Output: ${raw.slice(0, 200)}`);

  return JSON.parse(match[0]) as ReceiptData;
}
