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
   * Move funds for an already-approved payment. Implementations MUST treat their
   * own on-chain limits as the source of truth and reject anything that would
   * breach them, even if the server told them to proceed.
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
