import axios from 'axios';

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export const LLM_MODEL       = process.env.LLM_MODEL            || 'qwen2.5:7b';
export const REASONING_MODEL = process.env.LLM_MODEL_REASONING   || 'deepseek-r1:8b';
export const VISION_MODEL    = process.env.VISION_MODEL          || '';

// Axios instance — ngrok-skip-browser-warning mencegah redirect ke halaman peringatan ngrok
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // 2 menit: model lokal bisa lambat
  headers: {
    'Content-Type':              'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

// ── Text generation (OpenAI-compatible endpoint) ──────────────
export async function chatCompletion(
  messages: ChatMessage[],
  model:    string  = LLM_MODEL,
  jsonMode: boolean = false
): Promise<string> {
  const { data } = await client.post('/v1/chat/completions', {
    model,
    messages,
    stream: false,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  });

  const raw: string = data.choices[0].message.content;

  // deepseek-r1 kadang menyertakan <think>...</think> sebelum output utama
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ── Vision / multimodal (Ollama native /api/generate) ─────────
// Hanya bisa digunakan jika VISION_MODEL terisi (misal: llava, bakllava)
export async function visionGenerate(
  base64Image: string,
  prompt:      string,
  model:       string = VISION_MODEL
): Promise<string> {
  if (!model) {
    throw new Error(
      'VISION_MODEL belum dikonfigurasi. ' +
      'Jalankan: ollama pull llava  lalu set VISION_MODEL=llava di .env'
    );
  }

  const { data } = await client.post('/api/generate', {
    model,
    prompt,
    images: [base64Image],
    format: 'json',
    stream: false,
  });

  return (data.response as string).trim();
}
