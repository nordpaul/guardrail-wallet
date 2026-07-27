import type { PaymentRecord } from "../types.js";

// ---------------------------------------------------------------------------
// The settlement boundary. Everything above this interface is chain-agnostic.
// Swap StubExecutor for TonExecutor (or an EVM one) without touching the engine,
// API, or Telegram layers.
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  txHash: string;
}

export interface Executor {
  /**
   * Move funds for an already-approved payment. Implementations SHOULD validate
   * chain-level limits and wallet rules before broadcasting.
   */
  execute(rec: PaymentRecord): Promise<ExecutionResult>;
}

/**
 * No-chain executor for local development and tests. Pretends to settle and
 * returns a fake hash. Lets you exercise the whole policy + approval flow
 * before wiring real money.
 */
export class StubExecutor implements Executor {
  private counter = 0;

  async execute(rec: PaymentRecord): Promise<ExecutionResult> {
    this.counter += 1;
    return { txHash: `stub:${rec.id}:${this.counter}` };
  }
}
