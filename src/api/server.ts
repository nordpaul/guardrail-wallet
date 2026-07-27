import { Hono } from "hono";
import { z } from "zod";
import type { PaymentService } from "../service.js";
import type { PaymentRecord, PaymentRequest } from "../types.js";
import { dashboardHtml } from "../web/dashboard.js";
import { landingHtml } from "../web/landing.js";

// ---------------------------------------------------------------------------
// The narrow API the agent talks to. Deliberately boring: request a payment,
// poll its status. The bearer token grants the right to *ask*, never to spend.
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  idempotency_key: z.string().min(1),
  recipient: z.object({
    address: z.string().min(1),
    merchant_id: z.string().optional(),
  }),
  amount: z.object({
    value: z.number().positive(),
    currency: z.string().min(1),
  }),
  category: z.string().optional(),
  memo: z.string().optional(),
  agent_context: z
    .object({ source_url: z.string().optional(), reasoning: z.string().optional() })
    .optional(),
});

function toPaymentRequest(b: z.infer<typeof requestSchema>): PaymentRequest {
  return {
    idempotencyKey: b.idempotency_key,
    recipient: { address: b.recipient.address, merchantId: b.recipient.merchant_id },
    amount: { value: b.amount.value, currency: b.amount.currency },
    category: b.category,
    memo: b.memo,
    agentContext: b.agent_context
      ? { sourceUrl: b.agent_context.source_url, reasoning: b.agent_context.reasoning }
      : undefined,
  };
}

export function buildApi(
  service: PaymentService,
  agentApiKey: string,
  dashboardToken: string | null,
): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  // ---- Owner web dashboard --------------------------------------------------
  // The page itself is public (no secret in it); every data/action call below
  // is gated by the OWNER token, which is distinct from the agent API key.
  app.get("/", (c) => c.html(landingHtml));
  app.get("/dashboard", (c) => c.html(dashboardHtml));

  app.use("/admin/*", async (c, next) => {
    if (!dashboardToken) return c.json({ error: "dashboard_disabled" }, 503);
    const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token !== dashboardToken) return c.json({ error: "unauthorized" }, 401);
    await next();
  });

  app.get("/admin/payments", (c) => {
    const all = service.list(100);
    const wasKnown = (r: PaymentRecord) =>
      all.some(
        (o) =>
          o.recipientAddress === r.recipientAddress &&
          o.status === "executed" &&
          o.createdAt < r.createdAt,
      );
    return c.json({
      payments: all.map((r) => ({
        payment_id: r.id,
        amount: { value: r.amount, currency: r.currency },
        recipient: r.recipientAddress,
        merchant_id: r.merchantId,
        category: r.category,
        status: r.status,
        reason: r.decision.reasons.join("; "),
        tx_hash: r.txHash,
        recipient_known: wasKnown(r),
        created_at: r.createdAt,
      })),
    });
  });

  const decide = (approve: boolean) => (c: import("hono").Context) => {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "not_found" }, 404);
    const rec = service.get(id);
    if (!rec) return c.json({ error: "not_found" }, 404);
    if (rec.status !== "pending_approval") {
      return c.json({ error: "not_pending", status: rec.status }, 409);
    }
    const ok = service.resolveApproval(id, approve);
    if (!ok) return c.json({ error: "not_pending_in_memory" }, 409);
    return c.json({ ok: true });
  };
  app.post("/admin/payments/:id/approve", decide(true));
  app.post("/admin/payments/:id/reject", decide(false));

  // Bearer auth for everything under /v1.
  app.use("/v1/*", async (c, next) => {
    const auth = c.req.header("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token !== agentApiKey) return c.json({ error: "unauthorized" }, 401);
    await next();
  });

  app.post("/v1/payments/request", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
    }

    const rec = await service.request(toPaymentRequest(parsed.data));

    const status =
      rec.status === "executed"
        ? "executed"
        : rec.status === "rejected" || rec.status === "failed"
          ? "rejected"
          : "pending_approval";

    const code = rec.status === "rejected" ? 402 : 200;
    return c.json(
      {
        status,
        payment_id: rec.id,
        tx_hash: rec.txHash,
        decision: rec.decision.action,
        reason: rec.decision.reasons.join("; "),
      },
      code,
    );
  });

  app.get("/v1/payments/:id", (c) => {
    const rec = service.get(c.req.param("id"));
    if (!rec) return c.json({ error: "not_found" }, 404);
    return c.json({
      payment_id: rec.id,
      status: rec.status,
      amount: { value: rec.amount, currency: rec.currency },
      recipient: rec.recipientAddress,
      tx_hash: rec.txHash,
      decision: rec.decision.action,
      reason: rec.decision.reasons.join("; "),
      created_at: rec.createdAt,
      resolved_at: rec.resolvedAt,
    });
  });

  return app;
}
