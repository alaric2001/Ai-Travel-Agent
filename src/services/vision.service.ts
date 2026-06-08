import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as fs from 'fs/promises';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedReceiptItem {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number;
}

export interface ReceiptData {
  merchant_name: string;
  merchant_address: string | null;
  date: string | null;          // YYYY-MM-DD
  receipt_number: string | null;
  items: ExtractedReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number;
  payment_method: string | null;
}

const OCR_SYSTEM_PROMPT = `Anda adalah "AuditBot-Vision", sistem AI untuk membaca dan mengekstrak data dari foto struk/nota belanja Indonesia.

TUGAS: Analisis gambar struk dengan teliti. Ekstrak SEMUA informasi ke JSON terstruktur.

PANDUAN EKSTRAKSI:
1. merchant_name  : Nama toko/restoran di bagian atas struk. Jika tidak terbaca → "Unknown Merchant".
2. date           : Tanggal transaksi → format YYYY-MM-DD. Jika tidak ada tahun → 2026. null jika tidak ada.
3. items          : SETIAP baris produk/item yang tercantum. Jangan lewatkan satupun.
   - name         : Nama item persis seperti di struk.
   - quantity     : Jumlah (angka murni). null jika tidak tercantum.
   - unit_price   : Harga satuan dalam IDR (angka murni TANPA Rp/titik/koma). null jika tidak ada.
   - total_price  : Total harga item dalam IDR (angka murni). Wajib diisi, estimasi jika perlu.
4. subtotal       : Subtotal sebelum pajak (angka murni IDR). null jika tidak ada.
5. tax            : Nilai pajak/PPN (angka murni IDR). null jika tidak ada.
6. total          : Total AKHIR yang harus dibayar (angka murni IDR). WAJIB diisi.
7. payment_method : Cash/Debit/Kredit/QRIS/Transfer/GoPay/OVO. null jika tidak ada.
8. receipt_number : Nomor struk/invoice. null jika tidak ada.

PENTING:
- Semua nominal = angka murni tanpa format. "Rp 25.000" → 25000.
- Jika struk buram/tidak terbaca sempurna, tetap isi semua field sebisa mungkin.
- OUTPUT: JSON murni TANPA markdown, TANPA teks penjelasan.`;

const RECEIPT_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ['merchant_name', 'total', 'items'],
  properties: {
    merchant_name:    { type: SchemaType.STRING },
    merchant_address: { type: SchemaType.STRING, nullable: true },
    date:             { type: SchemaType.STRING, nullable: true },
    receipt_number:   { type: SchemaType.STRING, nullable: true },
    payment_method:   { type: SchemaType.STRING, nullable: true },
    subtotal:         { type: SchemaType.NUMBER, nullable: true },
    tax:              { type: SchemaType.NUMBER, nullable: true },
    total:            { type: SchemaType.NUMBER },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ['name', 'total_price'],
        properties: {
          name:       { type: SchemaType.STRING },
          quantity:   { type: SchemaType.NUMBER, nullable: true },
          unit_price: { type: SchemaType.NUMBER, nullable: true },
          total_price:{ type: SchemaType.NUMBER },
        },
      },
    },
  },
};

export async function scanReceipt(filePath: string, mimeType: string): Promise<ReceiptData> {
  const imageBuffer = await fs.readFile(filePath);
  const base64Image = imageBuffer.toString('base64');

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: OCR_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RECEIPT_SCHEMA as never,
      temperature: 0.1,
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64Image } },
    { text: 'Baca dan ekstrak semua data dari struk/nota ini.' },
  ]);

  return JSON.parse(result.response.text()) as ReceiptData;
}
