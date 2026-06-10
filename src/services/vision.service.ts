import * as fs            from 'fs/promises';
import { generateVision } from './llm.service';

export interface ExtractedReceiptItem {
  name:        string;
  quantity:    number | null;
  unit_price:  number | null;
  total_price: number;
}

export interface ReceiptData {
  merchant_name:    string;
  merchant_address: string | null;
  date:             string | null;
  receipt_number:   string | null;
  items:            ExtractedReceiptItem[];
  subtotal:         number | null;
  tax:              number | null;
  total:            number;
  payment_method:   string | null;
}

const OCR_PROMPT = `Anda adalah sistem OCR untuk membaca struk/nota belanja Indonesia.
Baca gambar ini dan ekstrak semua informasi. Semua harga = angka murni IDR tanpa Rp/titik/koma.

Output JSON murni TANPA markdown:
{"merchant_name":"...","merchant_address":null,"date":"YYYY-MM-DD","receipt_number":null,
"payment_method":"Cash","subtotal":null,"tax":null,"total":85000,
"items":[{"name":"Nama Item","quantity":1,"unit_price":25000,"total_price":25000}]}`;

export async function scanReceipt(filePath: string, mimeType: string): Promise<ReceiptData> {
  const imageBuffer = await fs.readFile(filePath);
  const base64Image = imageBuffer.toString('base64');

  const raw = await generateVision(base64Image, mimeType, OCR_PROMPT);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Vision model tidak menghasilkan JSON valid. Output: ${raw.slice(0, 200)}`);

  return JSON.parse(match[0]) as ReceiptData;
}
