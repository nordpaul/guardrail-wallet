import { describe, expect, it } from "vitest";
import { evaluate } from "./engine.js";
import { policySchema, type Policy } from "../policy.js";
import type { EvalContext, PaymentRequest } from "../types.js";

// A representative policy used across tests.
const policy: Policy = policySchema.parse({
  currency_display: "USD",
  chain: "ton",
  hard_limits: { per_tx_max: 200, daily_max: 500 },
  auto_approve: { under: 25, allow_new_recipient: false },
  rules: [
    { name: "blocked-categories", if: { category: ["crypto_withdrawal", "p2p_transfer"] }, then: "deny" },
    { name: "trusted-categories", if: { category: ["groceries", "utilities", "subscription"] }, then: "allow" },
    { name: "new-recipient", if: { recipient_age: "new" }, then: "require_approval" },
    { name: "velocity-guard", if: { velocity_24h_over: 300 }, then: "require_approval" },
  ],
  default: "require_approval",
  allowlist: [],
  blocklist: ["0xBAD"],
  telegram: { owner_chat_id: 1, approval_timeout_sec: 600 },
});

function req(overrides: Omit<Partial<PaymentRequest>, "amount"> & { amount?: number } = {}): PaymentRequest {
  const { amount = 10, ...rest } = overrides;
  return {
    idempotencyKey: "k",
    recipient: { address: "0xKNOWN" },
    amount: { value: amount, currency: "USD" },
    ...rest,
  };
}

const known: EvalContext = { recipientKnown: true, rolling24hTotal: 0 };
const fresh: EvalContext = { recipientKnown: false, rolling24hTotal: 0 };

describe("hard limits", () => {
  it("denies non-positive amounts", () => {
    expect(evaluate(req({ amount: 0 }), known, policy).action).toBe("deny");
  });
  it("denies above per_tx_max", () => {
    expect(evaluate(req({ amount: 250 }), known, policy).action).toBe("deny");
  });
  it("denies when it would cross daily_max", () => {
    const ctx: EvalContext = { recipientKnown: true, rolling24hTotal: 480 };
    expect(evaluate(req({ amount: 50 }), ctx, policy).action).toBe("deny");
  });
  it("denies everything when the kill switch is on", () => {
    const armed = { ...policy, hard_limits: { ...policy.hard_limits, kill_switch: true } };
    expect(evaluate(req({ amount: 1 }), known, armed).action).toBe("deny");
  });
});

describe("rules", () => {
  it("denies blocklisted recipients regardless of category", () => {
    const d = evaluate(req({ amount: 5, recipient: { address: "0xBAD" }, category: "groceries" }), known, policy);
    expect(d.action).toBe("deny");
    expect(d.matchedRule).toBe("blocklist");
  });
  it("denies blocked categories before allowing trusted ones (order matters)", () => {
    expect(evaluate(req({ amount: 5, category: "crypto_withdrawal" }), known, policy).action).toBe("deny");
  });
  it("allows trusted categories to a known recipient", () => {
    expect(evaluate(req({ amount: 150, category: "groceries" }), known, policy).action).toBe("allow");
  });
  it("requires approval for a new recipient", () => {
    const d = evaluate(req({ amount: 150 }), fresh, policy);
    expect(d.action).toBe("require_approval");
    expect(d.matchedRule).toBe("new-recipient");
  });
  it("requires approval when velocity would be exceeded", () => {
    const ctx: EvalContext = { recipientKnown: true, rolling24hTotal: 290 };
    expect(evaluate(req({ amount: 20 }), ctx, policy).action).toBe("require_approval");
  });
  it("falls back to the default action when nothing matches", () => {
    const d = evaluate(req({ amount: 150, category: "misc" }), known, policy);
    expect(d.action).toBe("require_approval");
    expect(d.matchedRule).toBeNull();
  });
});

describe("auto-approve", () => {
  it("downgrades a trivial payment to a known recipient", () => {
    const d = evaluate(req({ amount: 5, category: "misc" }), known, policy);
    expect(d.action).toBe("allow");
  });
  it("does NOT downgrade a trivial payment to a new recipient by default", () => {
    const d = evaluate(req({ amount: 5, category: "misc" }), fresh, policy);
    expect(d.action).toBe("require_approval");
  });
  it("never downgrades a deny", () => {
    const d = evaluate(req({ amount: 5, category: "crypto_withdrawal" }), known, policy);
    expect(d.action).toBe("deny");
  });
});
