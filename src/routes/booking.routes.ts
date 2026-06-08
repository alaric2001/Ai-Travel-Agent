import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { processBookingRequest } from '../agents/booking.agent';
import { query } from '../db/client';

const router = Router();

// ── POST /api/booking/submit ────────────────────────────────────
// Parse teks natural language + validasi pagu + simpan submission
const SubmitSchema = z.object({
  employeeId: z.number().int().positive(),
  rawInput: z.string().min(5).max(1000),
});

router.post('/submit', async (req: Request, res: Response) => {
  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Input tidak valid', details: parsed.error.flatten() });
  }

  const result = await processBookingRequest(parsed.data.employeeId, parsed.data.rawInput);
  return res.json(result);
});

// ── GET /api/booking/submissions ───────────────────────────────
// Daftar submission milik karyawan
router.get('/submissions', async (req: Request, res: Response) => {
  const employeeId = Number(req.query.employeeId);
  if (!employeeId) return res.status(400).json({ error: 'employeeId diperlukan' });

  const result = await query(`
    SELECT bs.submission_id, bs.raw_input, bs.parsed_payload,
           bs.allowance_check, bs.status, bs.created_at,
           e.full_name, e.grade
    FROM booking_submissions bs
    JOIN employees e ON e.id = bs.employee_id
    WHERE bs.employee_id = $1
    ORDER BY bs.created_at DESC
    LIMIT 20
  `, [employeeId]);

  return res.json(result.rows);
});

// ── GET /api/booking/submissions/:id ──────────────────────────
// Detail satu submission
router.get('/submissions/:id', async (req: Request, res: Response) => {
  const result = await query(`
    SELECT bs.*, e.full_name, e.grade, e.department
    FROM booking_submissions bs
    JOIN employees e ON e.id = bs.employee_id
    WHERE bs.submission_id = $1
  `, [req.params.id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Submission tidak ditemukan' });
  return res.json(result.rows[0]);
});

// ── GET /api/booking/employees ────────────────────────────────
// List karyawan aktif (untuk dropdown demo UI)
router.get('/employees', async (_req: Request, res: Response) => {
  const result = await query(`
    SELECT e.id, e.employee_code, e.full_name, e.position, e.department,
           e.grade, am.grade_label, am.max_flight_price, am.max_hotel_price_per_night
    FROM employees e
    JOIN allowance_matrix am ON am.grade = e.grade
    WHERE e.is_active = TRUE
    ORDER BY e.grade DESC, e.full_name
  `);
  return res.json(result.rows);
});

export default router;
