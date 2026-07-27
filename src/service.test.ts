import { describe, expect, it } from "vitest";
import { ApprovalManager } from "./approvals.js";
import { StubExecutor } from "./chain/executor.js";
import { policySchema } from "./policy.js";
import { PaymentService } from "./service.js";
import { Store } from "./store/store.js";

const policy = policySchema.parse({
  currency_display: "USD",
  chain: "stub",
  hard_limits: { per_tx_max: 200, daily_max: 500, kill_switch: false },
  auto_approve: { under: 25, allow_new_recipient: false },
  rules: [
    { name: "blocked", if: { category: ["crypto_withdrawal"] }, then: "deny" },
    { name: "trusted", if: { category: ["groceries"] }, then: "allow" },
    { name: "new-recipient", if: { recipient_age: "new" }, then: "require_approval" },
  ],
  default: "require_approval",
  allowlist: [],
  blocklist: [],
  telegram: { owner_chat_id: 1, approval_timeout_sec: 1 },
});

function setup() {
  const store = new Store(":memory:");
  const approvals = new ApprovalManager();
  const service = new PaymentService(store, policy, new StubExecutor(), approvals, null);
  return { service, store, approvals };
}

function request(idempotencyKey: string, amount = 10, category?: string) {
  return {
    idempotencyKey,
    recipient: { address: "EQ_TEST_RECIPIENT" },
    amount: { value: amount, currency: "USD" },
    category,
    purchase: {
      orderId: "order-001",
      checkoutId: "checkout-001",
      lineItems: [
        { name: "Coffee", unitAmount: 4.5, quantity: 2, currency: "USD" },
        { name: "Milk", unitAmount: 3, quantity: 1, currency: "USD" },
      ],
    },
  };
}

describe("PaymentService", () => {
  it("executes an allowed request through the stub executor", async () => {
    const { service } = setup();
    const rec = await service.request(request("allowed-1", 12, "groceries"));

    expect(rec.status).toBe("executed");
    expect(rec.purchase?.orderId).toBe("order-001");
    expect(rec.purchase?.lineItems?.length).toBe(2);
    expect(rec.txHash).toMatch(/^stub:/);
  });

  it("rejects a request above the hard per-transaction limit", async () => {
    const { service } = setup();
    const rec = await service.request(request("denied-1", 201));

    expect(rec.status).toBe("rejected");
    expect(rec.decision.action).toBe("deny");
  });

  it("returns the original record for an idempotent retry", async () => {
    const { service, store } = setup();
    const first = await service.request(request("same-operation", 9, "groceries"));
    const retry = await service.request(request("same-operation", 99, "groceries"));

    expect(retry.id).toBe(first.id);
    expect(retry.amount).toBe(9);
    expect(store.list()).toHaveLength(1);
  });

  it("settles a pending request only after owner approval", async () => {
    const { service, approvals } = setup();
    const rec = await service.request(request("approval-1", 75));

    expect(rec.status).toBe("pending_approval");
    expect(approvals.isPending(rec.id)).toBe(true);
    expect(service.resolveApproval(rec.id, true)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(service.get(rec.id)?.status).toBe("executed");
  });

  it("fails closed when the owner rejects a pending request", async () => {
    const { service } = setup();
    const rec = await service.request(request("approval-2", 75));

    expect(service.resolveApproval(rec.id, false)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(service.get(rec.id)?.status).toBe("rejected");
  });
});
