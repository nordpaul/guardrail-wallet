import { describe, expect, it } from "vitest";
import { ApprovalManager } from "../approvals.js";
import { StubExecutor } from "../chain/executor.js";
import { policySchema } from "../policy.js";
import { PaymentService } from "../service.js";
import { Store } from "../store/store.js";
import { buildApi } from "./server.js";

const AGENT_KEY = "test-agent-key";
const OWNER_KEY = "test-owner-key";

function setup() {
  const policy = policySchema.parse({
    hard_limits: { per_tx_max: 200, daily_max: 500 },
    auto_approve: { under: 25, allow_new_recipient: false },
    rules: [
      { name: "trusted", if: { category: ["groceries"] }, then: "allow" },
      { name: "new-recipient", if: { recipient_age: "new" }, then: "require_approval" },
    ],
    default: "require_approval",
    telegram: { owner_chat_id: 1, approval_timeout_sec: 1 },
  });
  const service = new PaymentService(
    new Store(":memory:"),
    policy,
    new StubExecutor(),
    new ApprovalManager(),
    null,
  );
  return { app: buildApi(service, AGENT_KEY, OWNER_KEY), service };
}

const payload = (key: string, amount = 10, category?: string) => ({
  idempotency_key: key,
  recipient: { address: "EQ_TEST_RECIPIENT", merchant_id: "test-merchant" },
  amount: { value: amount, currency: "USD" },
  category,
  memo: "Automated integration test",
});

const payloadWithPurchase = (key: string, amount = 10, category?: string) => ({
  ...payload(key, amount, category),
  purchase: {
    order_id: "order-001",
    checkout_id: "checkout-001",
    cart_id: "cart-001",
    description: "Starter bundle",
    line_items: [
      { name: "Coffee beans", unit_amount: 6.5, quantity: 2, currency: "USD" },
      { name: "Milk", unit_amount: 4.5, quantity: 1, currency: "USD" },
    ],
  },
});

const agentRequest = (body: object) => ({
  method: "POST",
  headers: { authorization: `Bearer ${AGENT_KEY}`, "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("agent API", () => {
  it("rejects missing agent authentication", async () => {
    const { app } = setup();
    const res = await app.request("/v1/payments/request", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid payment body", async () => {
    const { app } = setup();
    const res = await app.request("/v1/payments/request", agentRequest({ amount: -1 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_request" });
  });

  it("executes an allowed stub payment and deduplicates its retry", async () => {
    const { app, service } = setup();
    const first = await app.request(
      "/v1/payments/request",
      agentRequest(payload("api-idempotent", 8, "groceries")),
    );
    const retry = await app.request(
      "/v1/payments/request",
      agentRequest(payload("api-idempotent", 99, "groceries")),
    );
    const firstBody = await first.json();
    const retryBody = await retry.json();

    expect(first.status).toBe(200);
    expect(firstBody.status).toBe("executed");
    expect(firstBody.tx_hash).toMatch(/^stub:/);
    expect(retryBody.payment_id).toBe(firstBody.payment_id);
    expect(service.list()).toHaveLength(1);
  });

  it("requires the owner token and completes an approval lifecycle", async () => {
    const { app } = setup();
    const requested = await app.request(
      "/v1/payments/request",
      agentRequest(payload("api-approval", 75)),
    );
    const body = await requested.json();
    expect(body.status).toBe("pending_approval");

    expect((await app.request("/admin/payments")).status).toBe(401);
    const approved = await app.request(`/admin/payments/${body.payment_id}/approve`, {
      method: "POST",
      headers: { authorization: `Bearer ${OWNER_KEY}` },
    });
    expect(approved.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const polled = await app.request(`/v1/payments/${body.payment_id}`, {
      headers: { authorization: `Bearer ${AGENT_KEY}` },
    });
    expect(await polled.json()).toMatchObject({ status: "executed" });
  });

  it("accepts purchase snapshots and exposes them on status reads", async () => {
    const { app } = setup();
    const requested = await app.request(
      "/v1/payments/request",
      agentRequest(payloadWithPurchase("api-purchase", 17.5, "groceries")),
    );
    const reqBody = await requested.json();

    expect(reqBody.purchase).toEqual({
      order_id: "order-001",
      checkout_id: "checkout-001",
      cart_id: "cart-001",
      item_count: 2,
      item_total: 17.5,
    });

    const admin = await app.request("/admin/payments", {
      headers: { authorization: `Bearer ${OWNER_KEY}` },
    });
    const adminBody = await admin.json();
    expect(adminBody.payments).toHaveLength(1);
    expect(adminBody.payments[0]).toMatchObject({
      payment_id: reqBody.payment_id,
      purchase: {
        order_id: "order-001",
        item_count: 2,
        item_total: 17.5,
      },
    });

    const byId = await app.request(`/v1/payments/${reqBody.payment_id}`, {
      headers: { authorization: `Bearer ${AGENT_KEY}` },
    });
    expect(await byId.json()).toMatchObject({
      status: "executed",
      purchase: {
        order_id: "order-001",
        item_count: 2,
        item_total: 17.5,
      },
    });
  });

  it("validates purchase line item total against payment amount", async () => {
    const { app } = setup();
    const mismatched = payloadWithPurchase("api-purchase-mismatch", 12.5, "groceries");
    const res = await app.request("/v1/payments/request", agentRequest(mismatched));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_request" });
  });
});

describe("public web and SEO routes", () => {
  it.each([
    ["/", "Guardrail Wallet"],
    ["/docs", "Documentation"],
    ["/docs/ru", "Guardrail Wallet"],
    ["/api", "API"],
    ["/dashboard", "Guardrail"],
  ])("serves %s as an HTML page", async (path, marker) => {
    const { app } = setup();
    const res = await app.request(path);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain(marker);
  });

  it("publishes a crawlable sitemap while blocking private routes", async () => {
    const { app } = setup();
    const robots = await (await app.request("/robots.txt")).text();
    const sitemap = await (await app.request("/sitemap.xml")).text();

    expect(robots).toContain("Sitemap: https://patronhill.ru/sitemap.xml");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /dashboard");
    expect(sitemap).toContain("<loc>https://patronhill.ru/docs</loc>");
    expect(sitemap).not.toContain("/dashboard");
  });
});
