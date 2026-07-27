import { randomUUID } from "node:crypto";
import { evaluate } from "./core/engine.js";
import type { Policy } from "./policy.js";
import type { Store } from "./store/store.js";
import type { Executor } from "./chain/executor.js";
import { ApprovalManager } from "./approvals.js";
import type { EvalContext, PaymentRecord, PaymentRequest } from "./types.js";

// Notified when a payment needs a human. Implemented by the Telegram bot;
// kept as an interface so the service has no hard dependency on it.
export interface Notifier {
  notifyApprovalNeeded(rec: PaymentRecord, ctx: EvalContext): Promise<void>;
  notifyResolved?(rec: PaymentRecord): Promise<void>;
}

export class PaymentService {
  constructor(
    private readonly store: Store,
    private readonly policy: Policy,
    private readonly executor: Executor,
    private readonly approvals: ApprovalManager,
    private readonly notifier: Notifier | null,
  ) {}

  /** Entry point for the agent's request. Returns the record in its initial state. */
  async request(req: PaymentRequest): Promise<PaymentRecord> {
    // Idempotency: a retried key returns the original outcome, never a second spend.
    const existing = this.store.getByIdempotencyKey(req.idempotencyKey);
    if (existing) return existing;

    const now = Date.now();
    const ctx = this.store.context(req.recipient.address, now);
    const decision = evaluate(req, ctx, this.policy);

    const rec: PaymentRecord = {
      id: randomUUID(),
      idempotencyKey: req.idempotencyKey,
      recipientAddress: req.recipient.address,
      merchantId: req.recipient.merchantId ?? null,
      amount: req.amount.value,
      currency: req.amount.currency,
      category: req.category ?? null,
      memo: req.memo ?? null,
      status: decision.action === "deny" ? "rejected" : "pending_approval",
      decision,
      txHash: null,
      createdAt: now,
      resolvedAt: decision.action === "deny" ? now : null,
    };

    if (decision.action === "deny") {
      this.store.insert(rec);
      return rec;
    }

    if (decision.action === "allow") {
      this.store.insert(rec);
      return await this.settle(rec);
    }

    // require_approval: persist, ping the human, and resolve asynchronously.
    this.store.insert(rec);
    if (this.notifier) {
      await this.notifier.notifyApprovalNeeded(rec, ctx).catch(() => {});
    }
    this.armApproval(rec.id);
    return rec;
  }

  /** Wait for the human's decision (or timeout) and act on it. Runs in the background. */
  private armApproval(paymentId: string): void {
    const timeoutMs = this.policy.telegram.approval_timeout_sec * 1000;
    void this.approvals.wait(paymentId, timeoutMs).then(async (outcome) => {
      const rec = this.store.get(paymentId);
      if (!rec || rec.status !== "pending_approval") return;

      if (outcome === "approved") {
        await this.settle(rec);
      } else {
        this.store.updateStatus(paymentId, "rejected", null, Date.now());
      }
      const updated = this.store.get(paymentId);
      if (updated && this.notifier?.notifyResolved) {
        await this.notifier.notifyResolved(updated).catch(() => {});
      }
    });
  }

  /** Called by the Telegram callback handler when the owner taps a button. */
  resolveApproval(paymentId: string, approved: boolean): boolean {
    return this.approvals.decide(paymentId, approved ? "approved" : "rejected");
  }

  /** Settle an approved/allowed payment through the configured executor. */
  private async settle(rec: PaymentRecord): Promise<PaymentRecord> {
    try {
      const { txHash } = await this.executor.execute(rec);
      this.store.updateStatus(rec.id, "executed", txHash, Date.now());
    } catch {
      this.store.updateStatus(rec.id, "failed", null, Date.now());
    }
    return this.store.get(rec.id)!;
  }

  get(id: string): PaymentRecord | null {
    return this.store.get(id);
  }

  list(limit = 50): PaymentRecord[] {
    return this.store.list(limit);
  }
}
