import { query } from '../db/client';
import { parseBookingRequest, BookingParsed } from '../services/gemini.service';
import { searchFlights, searchHotels, FlightResult, HotelResult } from '../services/mcp/travelTools';

export interface AllowanceCheck {
  passed: boolean;
  grade: string;
  gradeLabel: string;
  flightLimit: number;
  hotelLimitPerNight: number;
  requestedFlightPrice: number | null;
  requestedHotelNights: number | null;
  flightOk: boolean;
  hotelOk: boolean;
  message: string;
}

export interface MockFlight {
  id: string;
  airline: string;
  flightNo: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  class: string;
  duration: string;
  stops: number;
  withinPagu: boolean;
  source: 'realtime' | 'mock';
}

export interface MockHotel {
  id: string;
  name: string;
  stars: number;
  location: string;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  facilities: string[];
  rating: number | null;
  withinPagu: boolean;
  source: 'realtime' | 'mock';
}

export interface BookingAgentResult {
  submissionId: string;
  employeeId: number;
  employeeName: string;
  parsedPayload: BookingParsed;
  allowanceCheck: AllowanceCheck;
  mockFlights: MockFlight[];
  mockHotels: MockHotel[];
  status: string;
  dataSource: 'realtime' | 'mock';
}

// ── IATA code → nama kota untuk query hotel SerpApi ───────────────
const IATA_TO_CITY: Record<string, string> = {
  CGK: 'Jakarta', DPS: 'Bali',      SUB: 'Surabaya', JOG: 'Yogyakarta',
  KNO: 'Medan',   SRG: 'Semarang',  UPG: 'Makassar', BPN: 'Balikpapan',
  PLM: 'Palembang', LOP: 'Lombok',  MDC: 'Manado',   PKU: 'Pekanbaru',
  PDG: 'Padang',  PNK: 'Pontianak', AMQ: 'Ambon',
};

// ── Map SerpApi FlightResult → MockFlight ─────────────────────────
function mapFlight(f: FlightResult, i: number, origin: string, dest: string, limit: number): MockFlight {
  return {
    id:            `FL-SERP-${i + 1}`,
    airline:       f.airline,
    flightNo:      f.flight_no,
    origin,
    destination:   dest,
    departureTime: f.departure,
    arrivalTime:   f.arrival,
    price:         f.price_idr,
    class:         f.class,
    duration:      f.duration,
    stops:         f.stops,
    withinPagu:    f.price_idr <= limit,
    source:        'realtime',
  };
}

// ── Map SerpApi HotelResult → MockHotel ───────────────────────────
function mapHotel(h: HotelResult, i: number, nights: number, limitPerNight: number): MockHotel {
  return {
    id:           `HT-SERP-${i + 1}`,
    name:         h.name,
    stars:        h.stars,
    location:     h.address,
    pricePerNight: h.price_per_night_idr,
    totalPrice:   h.price_per_night_idr * nights,
    nights,
    facilities:   [],
    rating:       h.rating,
    withinPagu:   h.price_per_night_idr <= limitPerNight,
    source:       'realtime',
  };
}

// ── Fallback: mock flights ─────────────────────────────────────────
function generateMockFlights(origin: string, destination: string, _date: string, limit: number): MockFlight[] {
  const airlines = [
    { name: 'Garuda Indonesia', prefix: 'GA', class: 'Economy' },
    { name: 'Citilink',         prefix: 'QG', class: 'Economy' },
    { name: 'Lion Air',         prefix: 'JT', class: 'Economy' },
    { name: 'Batik Air',        prefix: 'ID', class: 'Economy' },
    { name: 'Sriwijaya Air',    prefix: 'SJ', class: 'Economy' },
  ];
  const slots = [
    { dep: '06:00', dur: '1j 30m', multiplier: 1.2 },
    { dep: '08:30', dur: '1j 30m', multiplier: 1.0 },
    { dep: '11:00', dur: '1j 45m', multiplier: 0.85 },
    { dep: '14:30', dur: '1j 30m', multiplier: 0.9 },
    { dep: '17:00', dur: '1j 30m', multiplier: 1.05 },
  ];
  const basePrice = Math.round(limit * 0.6);
  return airlines.map((a, i) => {
    const slot    = slots[i % slots.length];
    const price   = Math.round(basePrice * slot.multiplier * (1 + i * 0.08));
    const durMin  = slot.dur.includes('45') ? 105 : 90;
    const [hh, mm] = slot.dep.split(':').map(Number);
    const arrMin  = hh * 60 + mm + durMin;
    const arrTime = `${String(Math.floor(arrMin / 60) % 24).padStart(2, '0')}:${String(arrMin % 60).padStart(2, '0')}`;
    return {
      id: `FL-MOCK-${i + 1}`, airline: a.name, flightNo: `${a.prefix}${200 + i * 37}`,
      origin, destination, departureTime: slot.dep, arrivalTime: arrTime,
      price, class: a.class, duration: slot.dur, stops: 0,
      withinPagu: price <= limit, source: 'mock' as const,
    };
  });
}

// ── Fallback: mock hotels ──────────────────────────────────────────
function generateMockHotels(city: string, nights: number, limitPerNight: number): MockHotel[] {
  const data = [
    { name: `Aston ${city} Hotel`,    stars: 3, multiplier: 0.65 },
    { name: `Swiss-Belhotel ${city}`, stars: 3, multiplier: 0.80 },
    { name: `Mercure ${city}`,        stars: 4, multiplier: 0.95 },
    { name: `Novotel ${city}`,        stars: 4, multiplier: 1.10 },
  ];
  const safeNights = nights || 1;
  return data.map((h, i) => {
    const pricePerNight = Math.round(limitPerNight * h.multiplier);
    return {
      id: `HT-MOCK-${i + 1}`, name: h.name, stars: h.stars,
      location: `Pusat Kota ${city}`, pricePerNight,
      totalPrice: pricePerNight * safeNights, nights: safeNights,
      facilities: ['WiFi', 'AC'], rating: null,
      withinPagu: pricePerNight <= limitPerNight, source: 'mock' as const,
    };
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Pastikan tanggal valid dan tidak di masa lalu (SerpApi menolak past dates)
function ensureFutureDate(dateStr: string | null | undefined, fallbackDaysFromNow = 7): string {
  if (!dateStr) return addDays(new Date().toISOString().split('T')[0], fallbackDaysFromNow);
  const d    = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime()) || d < today) {
    return addDays(new Date().toISOString().split('T')[0], fallbackDaysFromNow);
  }
  return dateStr;
}

// ── Booking Agent ──────────────────────────────────────────────────
export async function processBookingRequest(
  employeeId: number,
  rawInput: string
): Promise<BookingAgentResult> {
  // 1. Ambil data karyawan + pagu golongan
  const empResult = await query<{
    id: number; full_name: string; grade: string;
    max_flight_price: number; max_hotel_price_per_night: number; grade_label: string;
  }>(`
    SELECT e.id, e.full_name, e.grade,
           am.max_flight_price, am.max_hotel_price_per_night, am.grade_label
    FROM employees e
    JOIN allowance_matrix am ON am.grade = e.grade
    WHERE e.id = $1 AND e.is_active = TRUE
  `, [employeeId]);

  if (empResult.rows.length === 0) throw new Error(`Karyawan ID ${employeeId} tidak ditemukan`);
  const emp = empResult.rows[0];

  // 2. Parse input via LLM
  const parsed = await parseBookingRequest(rawInput);

  // 3. Validasi pagu
  const flightOk = !parsed.max_price || parsed.max_price <= emp.max_flight_price;
  const allowanceCheck: AllowanceCheck = {
    passed: flightOk,
    grade: emp.grade, gradeLabel: emp.grade_label,
    flightLimit: emp.max_flight_price,
    hotelLimitPerNight: emp.max_hotel_price_per_night,
    requestedFlightPrice: parsed.max_price,
    requestedHotelNights: parsed.duration_nights,
    flightOk, hotelOk: true,
    message: flightOk
      ? `✅ Permintaan sesuai pagu Golongan ${emp.grade} (${emp.grade_label})`
      : `⚠️ Budget Rp ${parsed.max_price?.toLocaleString('id-ID')} melebihi pagu Golongan ${emp.grade} (Rp ${emp.max_flight_price.toLocaleString('id-ID')}). Diperlukan dispensasi atasan.`,
  };

  // 4. Simpan ke DB
  const status = flightOk ? 'WITHIN_POLICY' : 'EXCEEDS_POLICY';
  const subResult = await query<{ submission_id: string }>(`
    INSERT INTO booking_submissions (employee_id, raw_input, parsed_payload, allowance_check, status)
    VALUES ($1, $2, $3, $4, $5) RETURNING submission_id
  `, [employeeId, rawInput, JSON.stringify(parsed), JSON.stringify(allowanceCheck), status]);
  const submissionId = subResult.rows[0].submission_id;

  // 5. Immutable audit log
  await query(`
    INSERT INTO immutable_audit_log (actor_id, actor_email, action, module, resource_type, resource_id, after_state)
    VALUES ($1, $2, 'BOOKING_SUBMITTED', 'BOOKING', 'booking_submissions', $3, $4)
  `, [employeeId, null, submissionId, JSON.stringify({ status, allowanceCheck })]);

  // 6. Fetch data real dari SerpApi, fallback ke mock jika gagal
  const origin     = parsed.origin || 'CGK';
  const dest       = parsed.destination;
  const cityName   = IATA_TO_CITY[dest] || dest;
  const depDate    = ensureFutureDate(parsed.departure_date, 7);
  const nights     = parsed.duration_nights || (parsed.return_date
    ? Math.ceil((new Date(parsed.return_date).getTime() - new Date(depDate).getTime()) / 86400000)
    : 1);
  const needFlight = parsed.category !== 'hotel';
  const needHotel  = parsed.category === 'hotel' || parsed.category === 'both';

  let mockFlights: MockFlight[] = [];
  let mockHotels:  MockHotel[]  = [];
  let dataSource: 'realtime' | 'mock' = 'mock';

  if (process.env.SERPAPI_KEY) {
    const checkIn  = depDate;
    const checkOut = ensureFutureDate(parsed.return_date, nights + 7) > checkIn
      ? ensureFutureDate(parsed.return_date, nights + 7)
      : addDays(depDate, nights);

    const [flightRes, hotelRes] = await Promise.allSettled([
      needFlight
        ? searchFlights({ departure_id: origin, arrival_id: dest, outbound_date: depDate })
        : Promise.resolve([] as FlightResult[]),
      needHotel
        ? searchHotels({ city: cityName, check_in: checkIn, check_out: checkOut })
        : Promise.resolve([] as HotelResult[]),
    ]);

    if (flightRes.status === 'fulfilled' && flightRes.value.length > 0) {
      mockFlights = flightRes.value.map((f, i) => mapFlight(f, i, origin, dest, emp.max_flight_price));
      dataSource = 'realtime';
    } else {
      if (flightRes.status === 'rejected') {
        console.warn('[Booking] SerpApi flights fallback ke mock:', flightRes.reason?.message);
      }
      if (needFlight) mockFlights = generateMockFlights(origin, dest, depDate, emp.max_flight_price);
    }

    if (hotelRes.status === 'fulfilled' && hotelRes.value.length > 0) {
      mockHotels = hotelRes.value.map((h, i) => mapHotel(h, i, nights, emp.max_hotel_price_per_night));
      dataSource = 'realtime';
    } else {
      if (hotelRes.status === 'rejected') {
        console.warn('[Booking] SerpApi hotels fallback ke mock:', hotelRes.reason?.message);
      }
      if (needHotel) mockHotels = generateMockHotels(cityName, nights, emp.max_hotel_price_per_night);
    }
  } else {
    console.info('[Booking] SERPAPI_KEY tidak dikonfigurasi, menggunakan data mock');
    if (needFlight) mockFlights = generateMockFlights(origin, dest, depDate, emp.max_flight_price);
    if (needHotel)  mockHotels  = generateMockHotels(cityName, nights, emp.max_hotel_price_per_night);
  }

  return {
    submissionId, employeeId, employeeName: emp.full_name,
    parsedPayload: parsed, allowanceCheck,
    mockFlights, mockHotels, status, dataSource,
  };
}
