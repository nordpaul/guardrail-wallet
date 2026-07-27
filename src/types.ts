// Core domain types shared across the policy engine, store, API and adapters.

/** What an agent asks the wallet to do. Numbers are authoritative; agentContext is advisory. */
export interface PaymentRequest {
  /** Client-generated key so retries don't double-spend. */
  idempotencyKey: string;
  recipient: {
    /** On-chain destination (e.g. a TON address). */
    address: string;
    /** Optional human-friendly id used in allow/blocklists and UI. */
    merchantId?: string;
  };
  amount: {
    /** Value in the display currency (e.g. 42.5). */
    value: number;
    /** Display currency code, e.g. "USD". Settled in stablecoin under the hood. */
    currency: string;
  };
  category?: string;
  memo?: string;
  /** Whatever the agent claims about the payment. NEVER trusted for security decisions. */
  agentContext?: { sourceUrl?: string; reasoning?: string };
}

export type DecisionAction = "allow" | "deny" | "require_approval";

export interface Decision {
  action: DecisionAction;
  /** Human-readable explanation, surfaced in the audit log and Telegram card. */
  reasons: string[];
  /** Name of the rule that decided this, or null for hard-limit / default outcomes. */
  matchedRule: string | null;
}

/** Live state the engine needs, computed by the store from past payments. */
export interface EvalContext {
  /** True if this recipient has at least one prior *executed* payment. */
  recipientKnown: boolean;
  /** Sum of executed payments in the trailing 24h, in display currency. */
  rolling24hTotal: number;
}

export type PaymentStatus =
  | "executed"
  | "pending_approval"
  | "rejected"
  | "failed";

export interface PaymentRecord {
  id: string;
  idempotencyKey: string;
  recipientAddress: string;
  merchantId: string | null;
  amount: number;
  currency: string;
  category: string | null;
  memo: string | null;
  status: PaymentStatus;
  decision: Decision;
  /** On-chain transaction hash once settled. */
  txHash: string | null;
  createdAt: number;
  resolvedAt: number | null;
}
