/**
 * MCP Server — AI Travel Agent Tools
 *
 * Dijalankan TERPISAH sebagai subprocess untuk client MCP eksternal
 * (Claude Desktop, Dify.ai, dll.). Komunikasi via stdin/stdout.
 *
 * Cara menjalankan:
 *   npx tsx src/services/mcp/travelServer.ts
 *
 * Cara daftarkan di Claude Desktop (claude_desktop_config.json):
 *   { "mcpServers": { "travel": { "command": "npx", "args": ["tsx", "src/services/mcp/travelServer.ts"] } } }
 *
 * Untuk penggunaan INTERNAL di dalam Express/booking agent,
 * gunakan travelTools.ts langsung — tidak perlu MCP protocol.
 */

import 'dotenv/config';
import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { executeTool } from './travelTools';

const server = new Server(
  { name: 'ai-travel-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ── Daftar tools yang tersedia ────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name:        'search_flights',
      description: 'Mencari jadwal dan harga tiket pesawat real-time via Google Flights (SerpApi)',
      inputSchema: {
        type: 'object',
        properties: {
          departure_id:  { type: 'string', description: 'Kode bandara asal IATA (misal: CGK, SUB, DPS)' },
          arrival_id:    { type: 'string', description: 'Kode bandara tujuan IATA' },
          outbound_date: { type: 'string', description: 'Tanggal berangkat format YYYY-MM-DD' },
          currency:      { type: 'string', description: 'Kode mata uang (default: IDR)' },
        },
        required: ['departure_id', 'arrival_id', 'outbound_date'],
      },
    },
    {
      name:        'search_hotels',
      description: 'Mencari hotel beserta harga per malam real-time via Google Hotels (SerpApi)',
      inputSchema: {
        type: 'object',
        properties: {
          city:       { type: 'string', description: 'Nama kota tujuan (misal: Surabaya, Bali, Yogyakarta)' },
          check_in:   { type: 'string', description: 'Tanggal check-in YYYY-MM-DD' },
          check_out:  { type: 'string', description: 'Tanggal check-out YYYY-MM-DD' },
          adults:     { type: 'number', description: 'Jumlah tamu (default: 1)' },
        },
        required: ['city', 'check_in', 'check_out'],
      },
    },
    {
      name:        'check_budget_policy',
      description: 'Memeriksa apakah harga tiket/hotel sesuai pagu anggaran golongan karyawan dari database perusahaan',
      inputSchema: {
        type: 'object',
        properties: {
          employee_id:           { type: 'number', description: 'ID karyawan di database' },
          flight_price:          { type: 'number', description: 'Harga tiket yang akan dicek (IDR)' },
          hotel_price_per_night: { type: 'number', description: 'Harga hotel per malam yang akan dicek (IDR)' },
        },
        required: ['employee_id'],
      },
    },
  ],
}));

// ── Eksekusi tool saat dipanggil ──────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args = {} } = request.params;

  try {
    const result = await executeTool(name, args as Record<string, any>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    // Kembalikan error sebagai teks — jangan lempar exception
    // agar MCP client bisa membaca pesan error dari LLM
    return {
      content: [{ type: 'text', text: `ERROR: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start server ──────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  // stderr agar tidak mencemari stdout (protokol MCP pakai stdout)
  process.stderr.write('[MCP] ai-travel-mcp server siap\n');
});
