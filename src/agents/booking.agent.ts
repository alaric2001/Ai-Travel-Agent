import { query } from '../db/client';
import { parseBookingRequest, BookingParsed } from '../services/gemini.service';

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

export interface BookingAgentResult {
  submissionId: string;
  employeeId: number;
  employeeName: string;
  parsedPayload: BookingParsed;
  allowanceCheck: AllowanceCheck;
  mockFlights: MockFlight[];
  mockHotels: MockHotel[];
  status: string;
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
  withinPagu: boolean;
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
  withinPagu: boolean;
}

// ── Helper: Generate mock flights ───────────────────────────────
function generateMockFlights(origin: string, destination: string, date: string, limit: number): MockFlight[] {
  const airlines = [
    { name: 'Garuda Indonesia', prefix: 'GA', class: 'Economy' },
    { name: 'Citilink',         prefix: 'QG', class: 'Economy' },
    { name: 'Lion Air',         prefix: 'JT', class: 'Economy' },
    { name: 'Batik Air',        prefix: 'ID', class: 'Economy' },
    { name: 'Sriwijaya Air',    prefix: 'SJ', class: 'Economy' },
    { name: 'Garuda Indonesia', prefix: 'GA', class: 'Business' },
  ];
  const slots = [
    { dep: '06:00', dur: '1j 30m', multiplier: 1.2 },
    { dep: '08:30', dur: '1j 30m', multiplier: 1.0 },
    { dep: '11:00', dur: '1j 45m', multiplier: 0.85 },
    { dep: '14:30', dur: '1j 30m', multiplier: 0.9 },
    { dep: '17:00', dur: '1j 30m', multiplier: 1.05 },
    { dep: '20:00', dur: '1j 30m', multiplier: 1.3 },
  ];

  const basePrice = Math.round(limit * 0.6);

  return airlines.slice(0, 5).map((a, i) => {
    const slot = slots[i % slots.length];
    const price = Math.round(basePrice * slot.multiplier * (1 + (i * 0.08)));
    const [depH, depM] = slot.dep.split(':').map(Number);
    const durMin = parseInt(slot.dur) * 60 + (slot.dur.includes('45') ? 45 : 30);
    const arrDate = new Date(`${date}T${slot.dep}:00`);
    arrDate.setMinutes(arrDate.getMinutes() + durMin);
    const arrTime = `${String(arrDate.getHours()).padStart(2, '0')}:${String(arrDate.getMinutes()).padStart(2, '0')}`;

    return {
      id: `FL-${a.prefix}-${i + 1}`,
      airline: a.name,
      flightNo: `${a.prefix}${200 + i * 37}`,
      origin,
      destination,
      departureTime: slot.dep,
      arrivalTime: arrTime,
      price,
      class: a.class,
      duration: slot.dur,
      withinPagu: price <= limit,
    };
  });
}

// ── Helper: Generate mock hotels ──────────────────────────────────
function generateMockHotels(city: string, nights: number, limitPerNight: number): MockHotel[] {
  const hotelData = [
    { name: `Aston ${city} Hotel`,      stars: 3, multiplier: 0.65, facilities: ['WiFi', 'Sarapan', 'AC', 'TV'] },
    { name: `Swiss-Belhotel ${city}`,   stars: 3, multiplier: 0.80, facilities: ['WiFi', 'Sarapan', 'Kolam Renang', 'Gym'] },
    { name: `Mercure ${city}`,          stars: 4, multiplier: 0.95, facilities: ['WiFi', 'Sarapan', 'Kolam Renang', 'Gym', 'Meeting Room'] },
    { name: `Novotel ${city}`,          stars: 4, multiplier: 1.10, facilities: ['WiFi', 'Sarapan', 'Kolam Renang', 'Gym', 'Spa', 'Restaurant'] },
    { name: `Shangri-La ${city}`,       stars: 5, multiplier: 1.60, facilities: ['WiFi', 'Sarapan', 'Kolam Renang', 'Spa', 'Concierge', 'Club Lounge'] },
  ];

  const safeNights = nights || 1;
  return hotelData.slice(0, 4).map((h, i) => {
    const pricePerNight = Math.round(limitPerNight * h.multiplier);
    return {
      id: `HT-${i + 1}`,
      name: h.name,
      stars: h.stars,
      location: `Pusat Kota ${city}`,
      pricePerNight,
      totalPrice: pricePerNight * safeNights,
      nights: safeNights,
      facilities: h.facilities,
      withinPagu: pricePerNight <= limitPerNight,
    };
  });
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

  if (empResult.rows.length === 0) {
    throw new Error(`Karyawan dengan ID ${employeeId} tidak ditemukan`);
  }

  const emp = empResult.rows[0];

  // 2. Parse input via Gemini
  const parsed = await parseBookingRequest(rawInput);

  // 3. Validasi pagu
  const flightOk = !parsed.max_price || parsed.max_price <= emp.max_flight_price;
  const estimatedHotelTotal = parsed.duration_nights
    ? emp.max_hotel_price_per_night * parsed.duration_nights
    : null;
  const hotelOk = true; // hotel price check dilakukan saat memilih opsi

  const passed = flightOk;
  const allowanceCheck: AllowanceCheck = {
    passed,
    grade: emp.grade,
    gradeLabel: emp.grade_label,
    flightLimit: emp.max_flight_price,
    hotelLimitPerNight: emp.max_hotel_price_per_night,
    requestedFlightPrice: parsed.max_price,
    requestedHotelNights: parsed.duration_nights,
    flightOk,
    hotelOk,
    message: passed
      ? `✅ Permintaan sesuai pagu Golongan ${emp.grade} (${emp.grade_label})`
      : `⚠️ Budget yang diminta (Rp ${parsed.max_price?.toLocaleString('id-ID')}) melebihi pagu tiket Golongan ${emp.grade} (Rp ${emp.max_flight_price.toLocaleString('id-ID')}). Diperlukan dispensasi atasan.`,
  };

  // 4. Tentukan status submission
  const status = passed ? 'WITHIN_POLICY' : 'EXCEEDS_POLICY';

  // 5. Simpan ke DB
  const subResult = await query<{ submission_id: string }>(`
    INSERT INTO booking_submissions (employee_id, raw_input, parsed_payload, allowance_check, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING submission_id
  `, [
    employeeId,
    rawInput,
    JSON.stringify(parsed),
    JSON.stringify(allowanceCheck),
    status,
  ]);

  const submissionId = subResult.rows[0].submission_id;

  // 6. Tulis ke immutable audit log
  await query(`
    INSERT INTO immutable_audit_log (actor_id, actor_email, action, module, resource_type, resource_id, after_state)
    VALUES ($1, $2, 'BOOKING_SUBMITTED', 'BOOKING', 'booking_submissions', $3, $4)
  `, [
    employeeId,
    null,
    submissionId,
    JSON.stringify({ status, allowanceCheck }),
  ]);

  // 7. Generate mock OTA data
  const origin      = parsed.origin || 'CGK';
  const destination = parsed.destination;
  const mockFlights = generateMockFlights(origin, destination, parsed.departure_date, emp.max_flight_price);
  const cityName    = destination; // simplify for mock
  const nights      = parsed.duration_nights || (parsed.return_date
    ? Math.ceil((new Date(parsed.return_date).getTime() - new Date(parsed.departure_date).getTime()) / 86400000)
    : 1);
  const mockHotels  = (parsed.category === 'hotel' || parsed.category === 'both')
    ? generateMockHotels(cityName, nights, emp.max_hotel_price_per_night)
    : [];

  return {
    submissionId,
    employeeId,
    employeeName: emp.full_name,
    parsedPayload: parsed,
    allowanceCheck,
    mockFlights,
    mockHotels,
    status,
  };
}
