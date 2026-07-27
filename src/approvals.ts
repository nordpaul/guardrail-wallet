// ---------------------------------------------------------------------------
// Tracks payments waiting for a human decision in Telegram. Each pending
// approval has a timeout: if the owner doesn't act in time, it auto-rejects.
// Fail-closed — silence is "no".
// ---------------------------------------------------------------------------

export type ApprovalOutcome = "approved" | "rejected" | "timeout";

interface Pending {
  resolve: (outcome: ApprovalOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ApprovalManager {
  private pending = new Map<string, Pending>();

  /** Register a payment as awaiting approval; resolves when decided or timed out. */
  wait(paymentId: string, timeoutMs: number): Promise<ApprovalOutcome> {
    return new Promise<ApprovalOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(paymentId);
        resolve("timeout");
      }, timeoutMs);

      this.pending.set(paymentId, { resolve, timer });
    });
  }

  /** Called by the Telegram callback handler. Returns false if already resolved. */
  decide(paymentId: string, outcome: Exclude<ApprovalOutcome, "timeout">): boolean {
    const p = this.pending.get(paymentId);
    if (!p) return false;
    clearTimeout(p.timer);
    this.pending.delete(paymentId);
    p.resolve(outcome);
    return true;
  }

  isPending(paymentId: string): boolean {
    return this.pending.has(paymentId);
  }
}
