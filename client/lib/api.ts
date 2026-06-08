const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res  = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ─────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────
export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  grade: string;
  grade_label: string;
  max_flight_price: number;
  max_hotel_price_per_night: number;
}

// ─────────────────────────────────────────────────────────────────
// Booking Types
// ─────────────────────────────────────────────────────────────────
export interface MockFlight {
  id: string; airline: string; flightNo: string;
  origin: string; destination: string;
  departureTime: string; arrivalTime: string;
  price: number; class: string; duration: string; withinPagu: boolean;
}
export interface MockHotel {
  id: string; name: string; stars: number; location: string;
  pricePerNight: number; totalPrice: number; nights: number;
  facilities: string[]; withinPagu: boolean;
}
export interface BookingResult {
  submissionId: string; employeeName: string;
  parsedPayload: {
    category: string; origin: string | null; destination: string;
    departure_date: string; return_date: string | null; max_price: number | null;
    hotel_check_in: string | null; hotel_check_out: string | null;
    duration_nights: number | null; preferences: string[];
  };
  allowanceCheck: {
    passed: boolean; grade: string; gradeLabel: string;
    flightLimit: number; hotelLimitPerNight: number;
    requestedFlightPrice: number | null; requestedHotelNights: number | null;
    message: string;
  };
  mockFlights: MockFlight[]; mockHotels: MockHotel[]; status: string;
}

// ─────────────────────────────────────────────────────────────────
// Audit Types
// ─────────────────────────────────────────────────────────────────
export type ItemAuditStatus = 'APPROVED' | 'REJECTED' | 'UNKNOWN';
export interface AuditedItem {
  name: string; quantity: number | null; unit_price: number | null; total_price: number;
  category_name: string | null; is_allowed: boolean | null;
  rejection_reason: string | null; status: ItemAuditStatus;
}
export interface AuditResult {
  submissionId: string; employeeName: string; receiptImageUrl: string;
  receipt: {
    merchant_name: string; merchant_address: string | null;
    date: string | null; receipt_number: string | null;
    payment_method: string | null; subtotal: number | null; tax: number | null;
    total: number; items: AuditedItem[];
  };
  auditedItems: AuditedItem[];
  totalClaimed: number; totalRejected: number; totalApproved: number;
  approvedItems: AuditedItem[]; rejectedItems: AuditedItem[]; unknownItems: AuditedItem[];
  status: string;
}
export interface PolicyCategory {
  id: number; category_name: string; is_allowed: boolean;
  rejection_reason: string | null; keywords: string[];
}

// ─────────────────────────────────────────────────────────────────
// Fuel Types
// ─────────────────────────────────────────────────────────────────
export interface Vehicle {
  id: number; vehicle_code: string; brand: string; model: string;
  vehicle_type: string | null; year: number | null;
  license_plate: string | null; fuel_efficiency: number; fuel_type: string; notes: string | null;
}
export interface FuelPrice {
  fuel_type: string; price_per_liter: number; effective_date: string;
}
export interface FuelClaimResult {
  claimId: string; employeeId: number; employeeName: string;
  vehicle: { id: number; brand: string; model: string; licensePlate: string | null; fuelType: string; };
  fuelEfficiency: number;    // E (KM/Liter)
  fuelPricePerLiter: number; // C (IDR/Liter)
  fuelType: string;
  originAddress: string; destAddress: string;
  originLat: number; originLng: number;
  destLat: number; destLng: number;
  distanceKm: number;       // D_aktual
  distanceText: string; durationText: string;
  fuelVolumeLiters: number; // V_BBM = D / E
  maxCostApproved: number;  // Cost_BBM = V_BBM * C
  status: 'LOCKED'; lockedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

// Booking
export const getEmployees  = () =>
  apiFetch<Employee[]>('/api/booking/employees');
export const submitBooking = (employeeId: number, rawInput: string) =>
  apiFetch<BookingResult>('/api/booking/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, rawInput }),
  });

// Audit
export const scanReceipt = (employeeId: number, file: File): Promise<AuditResult> => {
  const form = new FormData();
  form.append('receipt', file);
  form.append('employeeId', String(employeeId));
  return apiFetch<AuditResult>('/api/audit/scan', { method: 'POST', body: form });
};
export const getAuditPolicy = () => apiFetch<PolicyCategory[]>('/api/audit/policy');

// Fuel
export const getVehicles   = () => apiFetch<Vehicle[]>('/api/fuel/vehicles');
export const getFuelPrices = () => apiFetch<FuelPrice[]>('/api/fuel/prices');
export const createFuelClaim = (payload: {
  employeeId: number; vehicleId: number;
  originLat: number; originLng: number;
  destLat: number;   destLng: number;
  originAddress?: string; destAddress?: string;
}) =>
  apiFetch<FuelClaimResult>('/api/fuel/claims', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
