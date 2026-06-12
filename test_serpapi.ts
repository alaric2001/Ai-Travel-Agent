import 'dotenv/config';
import { searchFlights, searchHotels } from './src/services/mcp/travelTools';

async function runTest() {
  console.log('=== Uji Coba SerpApi ===');
  console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? 'Terpasang (Aktif)' : 'TIDAK ADA');

  try {
    console.log('\n1. Mengambil data penerbangan (Jakarta CGK -> Bali DPS)...');
    const flights = await searchFlights({
      departure_id: 'CGK',
      arrival_id: 'DPS',
      outbound_date: '2026-06-20', // Tanggal mendatang untuk simulasi
    });
    console.log('Hasil Penerbangan dari Google Flights:');
    console.log(flights);

    console.log('\n2. Mengambil data hotel di Bali...');
    const hotels = await searchHotels({
      city: 'Bali',
      check_in: '2026-06-20',
      check_out: '2026-06-22',
    });
    console.log('Hasil Hotel dari Google Hotels:');
    console.log(hotels);

  } catch (err: any) {
    console.error('Error saat uji coba:');
    console.error('  type   :', typeof err);
    console.error('  message:', err?.message);
    console.error('  status :', err?.status || err?.statusCode);
    console.error('  full   :', JSON.stringify(err, null, 2));
  }
}

runTest();
