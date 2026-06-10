import axios  from 'axios';
import sharp  from 'sharp';

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export const LLM_MODEL       = process.env.LLM_MODEL           || 'qwen2.5:7b';
export const REASONING_MODEL = process.env.LLM_MODEL_REASONING  || 'deepseek-r1:8b';
export const VISION_MODEL    = process.env.VISION_MODEL         || '';

// Timeout terpisah: text lebih cepat, vision butuh waktu lama
const TEXT_TIMEOUT   = Number(process.env.LLM_TIMEOUT_MS)   || 120_000;  // 2 menit
const VISION_TIMEOUT = Number(process.env.VISION_TIMEOUT_MS) || 600_000;  // 10 menit

const BASE_HEADERS = {
  'Content-Type':               'application/json',
  'ngrok-skip-browser-warning': 'true',   // bypass halaman redirect ngrok
};

const textClient = axios.create({ baseURL: BASE_URL, timeout: TEXT_TIMEOUT,   headers: BASE_HEADERS });
const visionClient= axios.create({ baseURL: BASE_URL, timeout: VISION_TIMEOUT, headers: BASE_HEADERS });

type Role = 'system' | 'user' | 'assistant';
export interface ChatMessage { role: Role; content: string; }

// ── Resize gambar sebelum dikirim ke vision model ─────────────
// Mengurangi ukuran payload secara signifikan → request lebih cepat
async function resizeImageForVision(base64: string, maxPx = 768): Promise<string> {
  const buf = Buffer.from(base64, 'base64');
  const resized = await sharp(buf)
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return resized.toString('base64');
}

// ── Text generation (OpenAI-compatible /v1/chat/completions) ───
export async function chatCompletion(
  messages: ChatMessage[],
  model:    string  = LLM_MODEL,
  jsonMode: boolean = false
): Promise<string> {
  const { data } = await textClient.post('/v1/chat/completions', {
    model,
    messages,
    stream: false,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  });

  const raw: string = data.choices[0].message.content;
  // deepseek-r1 kadang tambahkan <think>...</think> sebelum output utama
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ── Vision / OCR (Ollama native /api/generate) ────────────────
export async function visionGenerate(
  base64Image: string,
  prompt:      string,
  model:       string = VISION_MODEL
): Promise<string> {
  if (!model) {
    throw new Error(
      'VISION_MODEL belum dikonfigurasi. ' +
      'Set VISION_MODEL=<nama_model> di .env (contoh: VISION_MODEL=llava)'
    );
  }

  // Resize gambar → kurangi payload, percepat inferensi
  const optimizedImage = await resizeImageForVision(base64Image);
  const originalKB     = Math.round(base64Image.length  * 0.75 / 1024);
  const optimizedKB    = Math.round(optimizedImage.length * 0.75 / 1024);
  console.log(`[Vision] Image: ${originalKB}KB → ${optimizedKB}KB (model: ${model})`);

  const { data } = await visionClient.post('/api/generate', {
    model,
    prompt,
    images: [optimizedImage],
    format: 'json',
    stream: false,
  });

  return (data.response as string).trim();
}
