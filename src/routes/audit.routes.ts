import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { processReceiptAudit } from '../agents/audit.agent';
import { query } from '../db/client';

const router = Router();

// ── Multer config: simpan file ke ./uploads/ ──────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const uuid = crypto.randomUUID();
    cb(null, `receipt-${Date.now()}-${uuid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Hanya file gambar (JPEG, PNG, WebP) yang diizinkan'));
  },
});

// ── POST /api/audit/scan ───────────────────────────────────────
// multipart/form-data: field "receipt" (file) + "employeeId" (text)
router.post('/scan', upload.single('receipt'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File struk tidak ditemukan dalam request' });
  }

  const parsed = z.object({ employeeId: z.coerce.number().int().positive() })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'employeeId tidak valid' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const result = await processReceiptAudit(
    parsed.data.employeeId,
    req.file.path,
    req.file.mimetype,
    imageUrl
  );

  return res.json(result);
});

// ── GET /api/audit/submissions ─────────────────────────────────
router.get('/submissions', async (req: Request, res: Response) => {
  const employeeId = Number(req.query.employeeId);
  if (!employeeId) return res.status(400).json({ error: 'employeeId diperlukan' });

  const result = await query(`
    SELECT es.submission_id, es.receipt_image_url, es.total_claimed,
           es.total_approved, es.status, es.created_at,
           e.full_name, e.grade
    FROM expense_submissions es
    JOIN employees e ON e.id = es.employee_id
    WHERE es.employee_id = $1
    ORDER BY es.created_at DESC
    LIMIT 20
  `, [employeeId]);

  return res.json(result.rows);
});

// ── GET /api/audit/submissions/:id ────────────────────────────
router.get('/submissions/:id', async (req: Request, res: Response) => {
  const result = await query(`
    SELECT es.*, e.full_name, e.grade
    FROM expense_submissions es
    JOIN employees e ON e.id = es.employee_id
    WHERE es.submission_id = $1
  `, [req.params.id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Submission tidak ditemukan' });
  return res.json(result.rows[0]);
});

// ── GET /api/audit/policy ─────────────────────────────────────
// Tampilkan seluruh whitelist policy (untuk referensi UI)
router.get('/policy', async (_req: Request, res: Response) => {
  const result = await query(`
    SELECT ec.id, ec.category_name, ec.is_allowed, ec.rejection_reason,
           COALESCE(
             json_agg(wk.keyword ORDER BY wk.keyword) FILTER (WHERE wk.id IS NOT NULL),
             '[]'
           ) AS keywords
    FROM expense_categories ec
    LEFT JOIN whitelist_keywords wk ON wk.category_id = ec.id
    GROUP BY ec.id
    ORDER BY ec.is_allowed DESC, ec.match_priority DESC
  `);
  return res.json(result.rows);
});

export default router;
