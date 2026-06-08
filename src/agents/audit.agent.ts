import { query } from '../db/client';
import { scanReceipt, ReceiptData, ExtractedReceiptItem } from '../services/vision.service';

export type ItemAuditStatus = 'APPROVED' | 'REJECTED' | 'UNKNOWN';

export interface AuditedItem extends ExtractedReceiptItem {
  category_name: string | null;
  is_allowed: boolean | null;
  rejection_reason: string | null;
  status: ItemAuditStatus;
}

export interface AuditResult {
  submissionId: string;
  employeeId: number;
  employeeName: string;
  receiptImageUrl: string;
  receipt: ReceiptData;
  auditedItems: AuditedItem[];
  totalClaimed: number;
  totalRejected: number;
  totalApproved: number;   // totalClaimed - totalRejected
  approvedItems: AuditedItem[];
  rejectedItems: AuditedItem[];
  unknownItems: AuditedItem[];
  status: string;
}

// ── Whitelist matching ────────────────────────────────────────────
async function matchItemToPolicy(itemName: string): Promise<{
  category_name: string | null;
  is_allowed: boolean | null;
  rejection_reason: string | null;
}> {
  // ILIKE matching: cari keyword yang terkandung dalam nama item, atau sebaliknya
  // Urutan: REJECTED item diprioritaskan (is_allowed ASC = FALSE dulu), lalu priority DESC
  const result = await query<{
    category_name: string;
    is_allowed: boolean;
    rejection_reason: string | null;
  }>(`
    SELECT ec.category_name, ec.is_allowed, ec.rejection_reason
    FROM whitelist_keywords wk
    JOIN expense_categories ec ON ec.id = wk.category_id
    WHERE LOWER($1) ILIKE '%' || LOWER(wk.keyword) || '%'
       OR LOWER(wk.keyword) ILIKE '%' || LOWER($1) || '%'
    ORDER BY
      CASE WHEN ec.is_allowed = FALSE THEN 0 ELSE 1 END ASC,
      ec.match_priority DESC
    LIMIT 1
  `, [itemName]);

  if (result.rows.length === 0) {
    return { category_name: null, is_allowed: null, rejection_reason: null };
  }
  return result.rows[0];
}

// ── Audit Agent Core ──────────────────────────────────────────────
export async function processReceiptAudit(
  employeeId: number,
  filePath: string,
  mimeType: string,
  imageUrl: string
): Promise<AuditResult> {
  // 1. Validasi karyawan
  const empResult = await query<{ id: number; full_name: string }>(
    'SELECT id, full_name FROM employees WHERE id = $1 AND is_active = TRUE',
    [employeeId]
  );
  if (empResult.rows.length === 0) {
    throw new Error(`Karyawan ID ${employeeId} tidak ditemukan`);
  }
  const emp = empResult.rows[0];

  // 2. OCR via Gemini Vision
  const receipt = await scanReceipt(filePath, mimeType);

  // 3. Whitelist matching untuk setiap item
  const auditedItems: AuditedItem[] = await Promise.all(
    receipt.items.map(async (item) => {
      const match = await matchItemToPolicy(item.name);
      let status: ItemAuditStatus;
      if (match.is_allowed === null)  status = 'UNKNOWN';
      else if (match.is_allowed)      status = 'APPROVED';
      else                             status = 'REJECTED';

      return { ...item, ...match, status };
    })
  );

  // 4. Kalkulasi total
  // Rumus: Nominal Disetujui = Total Nota - Sum(Item Ditolak)
  const totalClaimed  = receipt.total;
  const totalRejected = auditedItems
    .filter((i) => i.status === 'REJECTED')
    .reduce((sum, i) => sum + i.total_price, 0);
  const totalApproved = totalClaimed - totalRejected;

  const approvedItems = auditedItems.filter((i) => i.status === 'APPROVED');
  const rejectedItems = auditedItems.filter((i) => i.status === 'REJECTED');
  const unknownItems  = auditedItems.filter((i) => i.status === 'UNKNOWN');

  const dbStatus = rejectedItems.length > 0 ? 'PARTIAL_APPROVED' : 'AUDITED';

  // 5. Simpan ke expense_submissions
  const subResult = await query<{ submission_id: string }>(`
    INSERT INTO expense_submissions
      (employee_id, receipt_image_url, ocr_raw_output, extracted_items,
       total_claimed, total_approved, rejected_items, audit_summary, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING submission_id
  `, [
    employeeId,
    imageUrl,
    JSON.stringify(receipt),
    JSON.stringify(auditedItems),
    totalClaimed,
    totalApproved,
    JSON.stringify(rejectedItems),
    JSON.stringify({
      totalClaimed, totalRejected, totalApproved,
      approvedCount: approvedItems.length,
      rejectedCount: rejectedItems.length,
      unknownCount:  unknownItems.length,
    }),
    dbStatus,
  ]);

  const submissionId = subResult.rows[0].submission_id;

  // 6. Immutable audit log
  await query(`
    INSERT INTO immutable_audit_log
      (actor_id, action, module, resource_type, resource_id, after_state)
    VALUES ($1, 'EXPENSE_SCANNED', 'AUDIT', 'expense_submissions', $2, $3)
  `, [
    employeeId,
    submissionId,
    JSON.stringify({ totalClaimed, totalRejected, totalApproved, status: dbStatus }),
  ]);

  return {
    submissionId,
    employeeId,
    employeeName: emp.full_name,
    receiptImageUrl: imageUrl,
    receipt,
    auditedItems,
    totalClaimed,
    totalRejected,
    totalApproved,
    approvedItems,
    rejectedItems,
    unknownItems,
    status: dbStatus,
  };
}
