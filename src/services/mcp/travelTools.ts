import { getJson } from 'serpapi';
import { query } from '../../db/client';

// ── Result types ─────────────────────────────────────────────────

export interface FlightResult {
  airline:    string;
  flight_no:  string;
  price_idr:  number;
  departure:  string;
  arrival:    string;
  duration:   string;
  stops:      number;
  class:      string;
}

export interface HotelResult {
  name:                string;
  stars:               number;
  price_per_night_idr: number;
  address:             string;
  rating:              number | null;
}

export interface BudgetCheckResult {
  employee_name:      string;
  grade:              string;
  max_flight_price:   number;
  max_hotel_per_night: number;
  flight_ok:          boolean;
  hotel_ok:           boolean;
  message:            string;
}

// ── Tool: Cari tiket pesawat real-time ───────────────────────────

export async function searchFlights(params: {
  departure_id:  string;
  arrival_id:    string;
  outbound_date: string;
  currency?:     string;
}): Promise<FlightResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY tidak dikonfigurasi di .env');
  }

  let response: any;
  try {
    response = await getJson({
      engine:        'google_flights',
      departure_id:  params.departure_id,
      arrival_id:    params.arrival_id,
      outbound_date: params.outbound_date,
      type:          2,                    // 1=round trip, 2=one-way, 3=multi-city
      currency:      params.currency || 'IDR',
      hl:            'id',
      api_key:       process.env.SERPAPI_KEY,
    });
  } catch (err) {
    throw normalizeSerpApiError(err);
  }

  if (response?.error) throw new Error(`SerpApi Flights: ${response.error}`);

  const raw: any[] = [
    ...(response.best_flights  || []),
    ...(response.other_flights || []),
  ];

  if (raw.length === 0) {
    throw new Error(
      `Tidak ada penerbangan untuk ${params.departure_id} → ${params.arrival_id} pada ${params.outbound_date}`
    );
  }

  return raw.slice(0, 5).map((f) => {
    const first = f.flights[0];
    const last  = f.flights[f.flights.length - 1];
    const totalMin: number = f.total_duration || 0;
    return {
      airline:   first?.airline      || 'Unknown',
      flight_no: first?.flight_number || '-',
      price_idr: f.price,
      departure: first?.departure_airport?.time || '-',
      arrival:   last?.arrival_airport?.time    || '-',
      duration:  `${Math.floor(totalMin / 60)}j ${totalMin % 60}m`,
      stops:     f.flights.length - 1,
      class:     first?.travel_class || 'Economy',
    };
  });
}

// ── Tool: Cari hotel real-time ───────────────────────────────────

export async function searchHotels(params: {
  city:       string;
  check_in:   string;
  check_out:  string;
  adults?:    number;
}): Promise<HotelResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY tidak dikonfigurasi di .env');
  }

  let response: any;
  try {
    response = await getJson({
      engine:          'google_hotels',
      q:               `hotel di ${params.city} Indonesia`,
      check_in_date:   params.check_in,
      check_out_date:  params.check_out,
      adults:          params.adults || 1,
      currency:        'IDR',
      hl:              'id',
      api_key:         process.env.SERPAPI_KEY,
    });
  } catch (err) {
    throw normalizeSerpApiError(err);
  }

  if (response?.error) throw new Error(`SerpApi Hotels: ${response.error}`);

  const hotels: any[] = response.properties || [];

  if (hotels.length === 0) {
    throw new Error(`Tidak ada hotel ditemukan di ${params.city}`);
  }

  return hotels.slice(0, 5).map((h) => ({
    name:                h.name,
    stars:               h.stars || 3,
    price_per_night_idr: h.rate_per_night?.lowest
      ? parseInt(String(h.rate_per_night.lowest).replace(/[^0-9]/g, ''), 10)
      : 0,
    address:             h.description || h.type || '',
    rating:              h.overall_rating ?? null,
  }));
}

// ── Tool: Cek kebijakan pagu dari database ────────────────────────

export async function checkBudgetPolicy(params: {
  employee_id:          number;
  flight_price?:        number;
  hotel_price_per_night?: number;
}): Promise<BudgetCheckResult> {
  const res = await query<{
    full_name: string; grade: string;
    max_flight_price: number; max_hotel_price_per_night: number;
  }>(`
    SELECT e.full_name, e.grade, am.max_flight_price, am.max_hotel_price_per_night
    FROM employees e
    JOIN allowance_matrix am ON am.grade = e.grade
    WHERE e.id = $1 AND e.is_active = TRUE
  `, [params.employee_id]);

  if (res.rows.length === 0) {
    throw new Error(`Karyawan ID ${params.employee_id} tidak ditemukan`);
  }

  const emp      = res.rows[0];
  const flightOk = !params.flight_price        || params.flight_price        <= emp.max_flight_price;
  const hotelOk  = !params.hotel_price_per_night || params.hotel_price_per_night <= emp.max_hotel_price_per_night;

  return {
    employee_name:       emp.full_name,
    grade:               emp.grade,
    max_flight_price:    emp.max_flight_price,
    max_hotel_per_night: emp.max_hotel_price_per_night,
    flight_ok:           flightOk,
    hotel_ok:            hotelOk,
    message: flightOk && hotelOk
      ? `✅ Sesuai pagu Golongan ${emp.grade}`
      : `⚠️ Melebihi pagu. Batas tiket: Rp ${emp.max_flight_price.toLocaleString('id-ID')}, batas hotel: Rp ${emp.max_hotel_price_per_night.toLocaleString('id-ID')}/malam`,
  };
}

// ── Dispatcher: dipanggil oleh tool calling loop ─────────────────

export async function executeTool(name: string, args: Record<string, any>): Promise<unknown> {
  switch (name) {
    case 'search_flights':      return searchFlights(args as any);
    case 'search_hotels':       return searchHotels(args as any);
    case 'check_budget_policy': return checkBudgetPolicy(args as any);
    default: throw new Error(`Tool tidak dikenal: '${name}'`);
  }
}

// Normalisasi error dari serpapi ke Error standard
export function normalizeSerpApiError(err: unknown): Error {
  if (err instanceof Error) {
    // serpapi kadang menaruh object di err.message, bukan string
    const msg = (err as any).message;
    if (typeof msg === 'object' && msg !== null) {
      return new Error(msg.error || JSON.stringify(msg));
    }
    return err;
  }
  if (typeof err === 'string') return new Error(err);
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, any>;
    const msg = e.error || e.message?.error || e.message || e.statusMessage;
    return new Error(typeof msg === 'string' ? msg : JSON.stringify(e));
  }
  return new Error('SerpApi error tidak diketahui');
}
