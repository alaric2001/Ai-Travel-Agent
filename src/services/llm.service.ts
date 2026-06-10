/**
 * LLM Provider Router
 *
 * Satu titik kontrol untuk memilih provider AI yang aktif.
 * Atur via .env:
 *
 *   LLM_PROVIDER=ollama   → Ollama (lokal/ngrok)
 *   LLM_PROVIDER=gemini   → Google Gemini API
 *   LLM_PROVIDER=auto     → Ollama jika OLLAMA_BASE_URL ada, fallback Gemini
 *
 * Untuk Vision (OCR):
 *   VISION_MODEL terisi    → Ollama vision (llava, dll.)
 *   VISION_MODEL kosong    → Gemini Vision (gemini-1.5-flash)
 */

export type Provider = 'ollama' | 'gemini';

function resolveProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER || 'auto').toLowerCase();

  if (raw === 'gemini') return 'gemini';
  if (raw === 'ollama') return 'ollama';

  // auto: pilih berdasarkan credentials yang tersedia
  if (process.env.OLLAMA_BASE_URL) return 'ollama';
  if (process.env.GEMINI_API_KEY)  return 'gemini';

  throw new Error(
    'Tidak ada LLM provider yang dikonfigurasi. ' +
    'Set LLM_PROVIDER=ollama (+ OLLAMA_BASE_URL) atau LLM_PROVIDER=gemini (+ GEMINI_API_KEY) di .env'
  );
}

export const PROVIDER: Provider = resolveProvider();

console.log(`[LLM] Provider aktif: ${PROVIDER.toUpperCase()}`);

// ── Text generation (routing ke provider yang aktif) ──────────
export async function generateText(
  systemPrompt: string,
  userMessage:  string,
  jsonMode      = false
): Promise<string> {
  if (PROVIDER === 'ollama') {
    const { chatCompletion, LLM_MODEL } = await import('./ollama.service');
    return chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      LLM_MODEL,
      jsonMode
    );
  }

  // Gemini
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
      temperature: 0.1,
    },
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

// ── Vision / OCR (routing ke provider yang aktif) ────────────
export async function generateVision(
  base64Image: string,
  mimeType:    string,
  prompt:      string
): Promise<string> {
  const visionModel = process.env.VISION_MODEL;

  // Prioritas 1: Ollama vision (jika VISION_MODEL terisi)
  if (visionModel) {
    const { visionGenerate } = await import('./ollama.service');
    return visionGenerate(base64Image, prompt, visionModel);
  }

  // Prioritas 2: Gemini Vision (fallback)
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      { inlineData: { mimeType: mimeType as 'image/jpeg', data: base64Image } },
      { text: prompt },
    ]);
    return result.response.text();
  }

  throw new Error(
    'Tidak ada vision provider. ' +
    'Set VISION_MODEL=llava (Ollama) atau GEMINI_API_KEY (Gemini) di .env'
  );
}
