import Database from "better-sqlite3";
import type { EvalContext, PaymentRecord, PaymentStatus } from "../types.js";

// ---------------------------------------------------------------------------
// Persistence + the derived state the engine needs. SQLite keeps the whole
// wallet in one file — trivial to back up, no external service for a self-hoster.
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  idempotency_key: string;
  recipient_address: string;
  merchant_id: string | null;
  amount: number;
  currency: string;
  category: string | null;
  memo: string | null;
  purchase_snapshot: string | null;
  status: PaymentStatus;
  decision: string;
  tx_hash: string | null;
  created_at: number;
  resolved_at: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class Store {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id               TEXT PRIMARY KEY,
        idempotency_key  TEXT UNIQUE NOT NULL,
        recipient_address TEXT NOT NULL,
        merchant_id      TEXT,
        amount           REAL NOT NULL,
        currency         TEXT NOT NULL,
        category         TEXT,
        memo             TEXT,
        purchase_snapshot TEXT,
        status           TEXT NOT NULL,
        decision         TEXT NOT NULL,
        tx_hash          TEXT,
        created_at       INTEGER NOT NULL,
        resolved_at      INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_payments_recipient ON payments(recipient_address);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    `);

    const columns = this.db.prepare("PRAGMA table_info(payments)").all() as { name: string }[];
    const hasPurchaseSnapshot = columns.some((row) => row.name === "purchase_snapshot");
    if (!hasPurchaseSnapshot) {
      this.db.exec("ALTER TABLE payments ADD COLUMN purchase_snapshot TEXT");
    }
  }

  private parsePurchase(snapshot: string | null) {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  }

  private toRecord(r: Row): PaymentRecord {
    return {
      id: r.id,
      idempotencyKey: r.idempotency_key,
      recipientAddress: r.recipient_address,
      merchantId: r.merchant_id,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      memo: r.memo,
      purchase: this.parsePurchase(r.purchase_snapshot),
      status: r.status,
      decision: JSON.parse(r.decision),
      txHash: r.tx_hash,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    };
  }

  insert(rec: PaymentRecord): void {
    this.db
      .prepare(
        `INSERT INTO payments
          (id, idempotency_key, recipient_address, merchant_id, amount, currency,
           category, memo, purchase_snapshot, status, decision, tx_hash, created_at, resolved_at)
         VALUES
          (@id, @idempotency_key, @recipient_address, @merchant_id, @amount, @currency,
           @category, @memo, @purchase_snapshot, @status, @decision, @tx_hash, @created_at, @resolved_at)`,
      )
      .run({
        id: rec.id,
        idempotency_key: rec.idempotencyKey,
        recipient_address: rec.recipientAddress,
        merchant_id: rec.merchantId,
        amount: rec.amount,
        currency: rec.currency,
        category: rec.category,
        memo: rec.memo,
        purchase_snapshot: rec.purchase ? JSON.stringify(rec.purchase) : null,
        status: rec.status,
        decision: JSON.stringify(rec.decision),
        tx_hash: rec.txHash,
        created_at: rec.createdAt,
        resolved_at: rec.resolvedAt,
      });
  }

  updateStatus(id: string, status: PaymentStatus, txHash: string | null, resolvedAt: number): void {
    this.db
      .prepare(`UPDATE payments SET status = ?, tx_hash = ?, resolved_at = ? WHERE id = ?`)
      .run(status, txHash, resolvedAt, id);
  }

  get(id: string): PaymentRecord | null {
    const row = this.db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as Row | undefined;
    return row ? this.toRecord(row) : null;
  }

  /** Most recent payments first, for the dashboard. */
  list(limit = 50): PaymentRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM payments ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as Row[];
    return rows.map((r) => this.toRecord(r));
  }

  getByIdempotencyKey(key: string): PaymentRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM payments WHERE idempotency_key = ?`)
      .get(key) as Row | undefined;
    return row ? this.toRecord(row) : null;
  }

  /** Build the live context the engine needs for a recipient, as of `now`. */
  context(recipientAddress: string, now: number): EvalContext {
    const known = this.db
      .prepare(
        `SELECT 1 FROM payments
         WHERE recipient_address = ? AND status = 'executed' LIMIT 1`,
      )
      .get(recipientAddress);

    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
         WHERE status = 'executed' AND created_at >= ?`,
      )
      .get(now - DAY_MS) as { total: number };

    return { recipientKnown: !!known, rolling24hTotal: row.total };
  }
}
