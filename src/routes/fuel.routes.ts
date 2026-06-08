import { Router, Request, Response } from 'express';
import { z }                          from 'zod';
import { createFuelClaim }            from '../agents/fuel.agent';
import { query }                      from '../db/client';

const router = Router();

// ── GET /api/fuel/vehicles ─────────────────────────────────────
router.get('/vehicles', async (_req: Request, res: Response) => {
  const result = await query(`
    SELECT id, vehicle_code, brand, model, vehicle_type, year,
           license_plate, fuel_efficiency, fuel_type, notes
    FROM vehicles
    WHERE is_active = TRUE
    ORDER BY brand, model
  `);
  return res.json(result.rows);
});

// ── GET /api/fuel/prices ───────────────────────────────────────
router.get('/prices', async (_req: Request, res: Response) => {
  const result = await query(
    'SELECT fuel_type, price_per_liter, effective_date FROM fuel_prices ORDER BY fuel_type'
  );
  return res.json(result.rows);
});

// ── POST /api/fuel/claims ──────────────────────────────────────
// Hitung jarak via Maps API, kunci klaim, simpan ke DB
const ClaimSchema = z.object({
  employeeId:   z.number().int().positive(),
  vehicleId:    z.number().int().positive(),
  originLat:    z.number().min(-90).max(90),
  originLng:    z.number().min(-180).max(180),
  destLat:      z.number().min(-90).max(90),
  destLng:      z.number().min(-180).max(180),
  originAddress: z.string().optional(),
  destAddress:   z.string().optional(),
});

router.post('/claims', async (req: Request, res: Response) => {
  const parsed = ClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Input tidak valid', details: parsed.error.flatten() });
  }
  const result = await createFuelClaim(parsed.data);
  return res.json(result);
});

// ── GET /api/fuel/claims ───────────────────────────────────────
router.get('/claims', async (req: Request, res: Response) => {
  const employeeId = Number(req.query.employeeId);
  if (!employeeId) return res.status(400).json({ error: 'employeeId diperlukan' });

  const result = await query(`
    SELECT fc.claim_id, fc.origin_address, fc.destination_address,
           fc.distance_km, fc.fuel_volume_liters, fc.max_cost_approved,
           fc.fuel_efficiency_snapshot, fc.fuel_price_snapshot,
           fc.status, fc.locked_at, fc.created_at,
           v.brand, v.model, v.fuel_type,
           e.full_name
    FROM fuel_claims fc
    JOIN vehicles  v ON v.id = fc.vehicle_id
    JOIN employees e ON e.id = fc.employee_id
    WHERE fc.employee_id = $1
    ORDER BY fc.created_at DESC
    LIMIT 20
  `, [employeeId]);

  return res.json(result.rows);
});

// ── GET /api/fuel/claims/:id ───────────────────────────────────
router.get('/claims/:id', async (req: Request, res: Response) => {
  const result = await query(`
    SELECT fc.*, v.brand, v.model, v.license_plate, v.fuel_type, e.full_name
    FROM fuel_claims fc
    JOIN vehicles  v ON v.id = fc.vehicle_id
    JOIN employees e ON e.id = fc.employee_id
    WHERE fc.claim_id = $1
  `, [req.params.id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Klaim tidak ditemukan' });
  return res.json(result.rows[0]);
});

export default router;
