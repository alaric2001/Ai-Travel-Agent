import { query }        from '../db/client';
import { getDistance }  from '../services/maps.service';

export interface FuelCalcInput {
  employeeId:   number;
  vehicleId:    number;
  originLat:    number;
  originLng:    number;
  destLat:      number;
  destLng:      number;
  originAddress?: string;
  destAddress?:   string;
}

export interface FuelCalcResult {
  claimId:             string;
  employeeId:          number;
  employeeName:        string;
  vehicle:             { id: number; brand: string; model: string; licensePlate: string | null; fuelType: string; };
  fuelEfficiency:      number;   // E (KM/Liter)
  fuelPricePerLiter:   number;   // C (IDR/Liter)
  fuelType:            string;
  originAddress:       string;
  destAddress:         string;
  originLat:           number;
  originLng:           number;
  destLat:             number;
  destLng:             number;
  distanceKm:          number;   // D_aktual
  distanceText:        string;
  durationText:        string;
  fuelVolumeLiters:    number;   // V_BBM = D / E
  maxCostApproved:     number;   // Cost_BBM = V_BBM * C
  status:              'LOCKED';
  lockedAt:            string;
}

export async function createFuelClaim(input: FuelCalcInput): Promise<FuelCalcResult> {
  // 1. Validasi karyawan
  const empRow = await query<{ id: number; full_name: string }>(
    'SELECT id, full_name FROM employees WHERE id = $1 AND is_active = TRUE',
    [input.employeeId]
  );
  if (empRow.rows.length === 0) throw new Error(`Karyawan ID ${input.employeeId} tidak ditemukan`);
  const emp = empRow.rows[0];

  // 2. Ambil data kendaraan + snapshot efisiensi
  const vehRow = await query<{
    id: number; brand: string; model: string;
    license_plate: string | null; fuel_efficiency: number; fuel_type: string;
  }>(
    'SELECT id, brand, model, license_plate, fuel_efficiency, fuel_type FROM vehicles WHERE id = $1 AND is_active = TRUE',
    [input.vehicleId]
  );
  if (vehRow.rows.length === 0) throw new Error(`Kendaraan ID ${input.vehicleId} tidak ditemukan`);
  const veh = vehRow.rows[0];

  // 3. Ambil harga BBM aktif untuk jenis bahan bakar kendaraan tersebut
  const priceRow = await query<{ price_per_liter: number }>(
    'SELECT price_per_liter FROM fuel_prices WHERE fuel_type = $1',
    [veh.fuel_type]
  );
  if (priceRow.rows.length === 0) throw new Error(`Harga BBM untuk ${veh.fuel_type} belum dikonfigurasi`);
  const fuelPricePerLiter = priceRow.rows[0].price_per_liter;

  // 4. Hitung jarak aktual via Google Maps Distance Matrix API
  const dist = await getDistance(input.originLat, input.originLng, input.destLat, input.destLng);

  // 5. Kalkulasi BBM (dikunci — tidak bisa diubah setelah ini)
  // V_BBM  = D_aktual / E          (Liter)
  // Cost   = V_BBM    * C          (IDR)
  const E                = +veh.fuel_efficiency;
  const D                = dist.distanceKm;
  const fuelVolumeLiters = +(D / E).toFixed(2);
  const maxCostApproved  = Math.ceil(fuelVolumeLiters * fuelPricePerLiter);
  const lockedAt         = new Date().toISOString();

  const originAddr = input.originAddress || dist.originAddress;
  const destAddr   = input.destAddress   || dist.destAddress;

  // 6. Simpan ke fuel_claims (status = LOCKED langsung karena kalkulasi sudah final)
  const claimRow = await query<{ claim_id: string }>(`
    INSERT INTO fuel_claims (
      employee_id, vehicle_id,
      origin_address, destination_address,
      origin_lat, origin_lng, destination_lat, destination_lng,
      distance_km, fuel_efficiency_snapshot, fuel_price_snapshot,
      fuel_volume_liters, max_cost_approved, status, locked_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'LOCKED',$14)
    RETURNING claim_id
  `, [
    input.employeeId, input.vehicleId,
    originAddr, destAddr,
    input.originLat, input.originLng, input.destLat, input.destLng,
    D, E, fuelPricePerLiter,
    fuelVolumeLiters, maxCostApproved, lockedAt,
  ]);

  const claimId = claimRow.rows[0].claim_id;

  // 7. Immutable audit log
  await query(`
    INSERT INTO immutable_audit_log
      (actor_id, action, module, resource_type, resource_id, after_state)
    VALUES ($1, 'FUEL_CLAIM_LOCKED', 'FUEL', 'fuel_claims', $2, $3)
  `, [
    input.employeeId, claimId,
    JSON.stringify({ D, E, fuelVolumeLiters, fuelPricePerLiter, maxCostApproved }),
  ]);

  return {
    claimId,
    employeeId:        input.employeeId,
    employeeName:      emp.full_name,
    vehicle:           { id: veh.id, brand: veh.brand, model: veh.model, licensePlate: veh.license_plate, fuelType: veh.fuel_type },
    fuelEfficiency:    E,
    fuelPricePerLiter,
    fuelType:          veh.fuel_type,
    originAddress:     originAddr,
    destAddress:       destAddr,
    originLat:         input.originLat,
    originLng:         input.originLng,
    destLat:           input.destLat,
    destLng:           input.destLng,
    distanceKm:        D,
    distanceText:      dist.distanceText,
    durationText:      dist.durationText,
    fuelVolumeLiters,
    maxCostApproved,
    status:            'LOCKED',
    lockedAt,
  };
}
