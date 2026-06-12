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

// ── Tool calling (multi-turn) ─────────────────────────────────────
//
// Format tool definition yang provider-agnostic.
// generateWithTools() mengkonversi ke format masing-masing provider.

export interface ToolParam {
  name:        string;
  description: string;
  parameters: {
    type:       'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required:   string[];
  };
}

export async function generateWithTools(
  systemPrompt: string,
  userMessage:  string,
  tools:        ToolParam[],
  executor:     (name: string, args: Record<string, unknown>) => Promise<unknown>,
  maxRounds = 5
): Promise<string> {
  if (PROVIDER === 'ollama') {
    return _ollamaWithTools(systemPrompt, userMessage, tools, executor, maxRounds);
  }
  return _geminiWithTools(systemPrompt, userMessage, tools, executor, maxRounds);
}

// ── Ollama tool calling (OpenAI-compatible /v1/chat/completions) ──

async function _ollamaWithTools(
  systemPrompt: string,
  userMessage:  string,
  tools:        ToolParam[],
  executor:     (name: string, args: Record<string, unknown>) => Promise<unknown>,
  maxRounds:    number
): Promise<string> {
  const { default: axios } = await import('axios');
  const { LLM_MODEL } = await import('./ollama.service');
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  const ollamaTools = tools.map((t) => ({
    type:     'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage  },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const res = await axios.post(
      `${OLLAMA_BASE_URL}/v1/chat/completions`,
      { model: LLM_MODEL, messages, tools: ollamaTools, stream: false },
      { timeout: Number(process.env.LLM_TIMEOUT_MS) || 120_000 }
    );

    const choice = res.data.choices[0];

    if (choice.finish_reason !== 'tool_calls') {
      return choice.message.content ?? '';
    }

    // Tambah pesan assistant dengan tool_calls ke history
    messages.push(choice.message);

    // Eksekusi setiap tool call secara paralel
    const calls: any[] = choice.message.tool_calls || [];
    const toolMessages = await Promise.all(
      calls.map(async (call: any) => {
        let content: string;
        try {
          const args = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function.arguments;
          const result = await executor(call.function.name, args);
          content = JSON.stringify(result);
        } catch (err: any) {
          content = `ERROR: ${err.message}`;
        }
        return { role: 'tool', tool_call_id: call.id, content };
      })
    );

    messages.push(...toolMessages);
  }

  throw new Error(`generateWithTools: melebihi batas ${maxRounds} putaran tool calling`);
}

// ── Gemini tool calling (chat multi-turn) ─────────────────────────

async function _geminiWithTools(
  systemPrompt: string,
  userMessage:  string,
  tools:        ToolParam[],
  executor:     (name: string, args: Record<string, unknown>) => Promise<unknown>,
  maxRounds:    number
): Promise<string> {
  const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

  const typeMap: Record<string, any> = {
    string:  SchemaType.STRING,
    number:  SchemaType.NUMBER,
    boolean: SchemaType.BOOLEAN,
    object:  SchemaType.OBJECT,
    array:   SchemaType.ARRAY,
  };

  const functionDeclarations = tools.map((t) => ({
    name:        t.name,
    description: t.description,
    parameters: {
      type:       SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([k, v]) => [
          k,
          { type: typeMap[v.type] ?? SchemaType.STRING, description: v.description, ...(v.enum ? { enum: v.enum } : {}) },
        ])
      ),
      required: t.parameters.required,
    },
  }));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model:             process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    tools:             [{ functionDeclarations }],
    generationConfig:  { temperature: 0.1 },
  });

  const chat = model.startChat();
  let result = await chat.sendMessage(userMessage);

  for (let round = 0; round < maxRounds; round++) {
    const calls = result.response.functionCalls();
    if (!calls || calls.length === 0) break;

    // Eksekusi setiap function call
    const toolParts = await Promise.all(
      calls.map(async (call) => {
        let response: unknown;
        try {
          response = await executor(call.name, call.args as Record<string, unknown>);
        } catch (err: any) {
          response = { error: err.message };
        }
        return {
          functionResponse: {
            name:     call.name,
            response: { output: response },
          },
        };
      })
    );

    result = await chat.sendMessage(toolParts);
  }

  return result.response.text();
}
