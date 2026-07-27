# Home Core Purchase Intents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, structured household purchase-intent flow on top of the existing self-hosted payment policy and stub executor.

**Architecture:** A strict purchase schema normalizes a cart into the existing `PaymentRequest`, preserving one policy, approval and settlement path. SQLite stores a sanitized cart snapshot, and the local dashboard renders it before owner action.

**Tech Stack:** TypeScript, Hono, Zod, SQLite, Vitest, Playwright, Docker.

## Global Constraints

- Preserve `POST /v1/payments/request` without breaking existing agents.
- Keep the public demo on `EXECUTOR=stub`; no real transaction is part of this plan.
- Never accept or persist a mnemonic, raw card number, bank password or complete delivery address.
- Calculate totals on the server from validated item prices and quantities.
- Require separate agent and owner credentials and fail closed on timeout or restart.
- Every task must leave `npm test`, `npm run test:e2e` and `npm run test:smoke` runnable independently.

---

### Task 1: Purchase domain and validation

**Files:**
- Create: `src/purchase/types.ts`
- Create: `src/purchase/schema.ts`
- Create: `src/purchase/schema.test.ts`

**Interfaces:**
- Produces: `PurchaseIntentInput`, `PurchaseIntent`, `purchaseIntentSchema`, `normalizePurchaseIntent(input)`.
- Consumes: no runtime service; this task is a pure validation boundary.

- [ ] **Step 1: Write failing schema tests**

Cover a valid grocery cart, an empty cart, zero/negative quantity, non-finite or
negative price, more than 100 items, lowercase/oversized currency, computed
total above `maximum_total`, unknown fields and raw credential-like fields.

- [ ] **Step 2: Run the focused tests**

Run: `npx vitest run src/purchase/schema.test.ts`

Expected: FAIL because the purchase schema does not exist.

- [ ] **Step 3: Implement strict types and normalization**

The external contract is:

```ts
interface PurchaseIntentInput {
  idempotency_key: string;
  merchant: { id: string; name?: string; payment_address?: string };
  items: Array<{ sku?: string; name: string; quantity: number; unit_price: number }>;
  maximum_total: number;
  currency: string;
  category?: string;
  fulfillment?: { mode: "digital" | "pickup" | "delivery"; profile_id?: string };
  memo?: string;
}
```

Return camelCase domain data plus `calculatedTotal`, rounded only for display,
while comparison uses exact integer minor units derived during normalization.

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/purchase/schema.test.ts`

Expected: all purchase schema tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/purchase
git commit -m "feat: define safe household purchase intents"
```

### Task 2: Persist purchase snapshots with a migration

**Files:**
- Create: `src/store/migrations.ts`
- Modify: `src/store/store.ts`
- Create: `src/store/store.test.ts`

**Interfaces:**
- Consumes: normalized `PurchaseIntent` from Task 1.
- Produces: `savePurchase(paymentId, intent)`, `getPurchase(paymentId)` and migration version tracking.

- [ ] **Step 1: Write failing persistence tests**

Use `:memory:` SQLite. Verify a snapshot round trip, missing lookup, migration
idempotence and rejection of a purchase referencing a nonexistent payment.

- [ ] **Step 2: Run the focused tests**

Run: `npx vitest run src/store/store.test.ts`

Expected: FAIL because migration and purchase methods do not exist.

- [ ] **Step 3: Add versioned migrations**

Create `schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER)` and
`purchases(payment_id TEXT PRIMARY KEY REFERENCES payments(id), intent_json TEXT NOT NULL)`.
Apply each migration in one transaction. Serialize only validated normalized data.

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/store/store.test.ts`

Expected: all store tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: persist sanitized purchase snapshots"
```

### Task 3: Add the purchase API without duplicating payment decisions

**Files:**
- Create: `src/purchase/service.ts`
- Modify: `src/api/server.ts`
- Modify: `src/api/server.test.ts`

**Interfaces:**
- Consumes: `normalizePurchaseIntent`, `PaymentService.request`, Store purchase methods.
- Produces: `POST /v1/purchases/request` and `GET /v1/purchases/:id`.

- [ ] **Step 1: Add failing API tests**

Test authentication, invalid cart, maximum-total violation, allowed request,
pending approval, rejected hard limit, polling, persistence and idempotent retry.
Assert that retries create one payment and one purchase snapshot.

- [ ] **Step 2: Run the focused tests**

Run: `npx vitest run src/api/server.test.ts`

Expected: FAIL with `404` for the new routes.

- [ ] **Step 3: Implement the adapter service and routes**

Map merchant payment address or merchant ID to `recipient.address`, calculated
minor-unit total to `amount.value`, and category/memo to the existing payment
request. Return `purchase_id`, `payment_id`, calculated total, status, decision,
reason and stub receipt fields. Do not add a second policy evaluation.

- [ ] **Step 4: Run API and existing service tests**

Run: `npx vitest run src/api/server.test.ts src/service.test.ts`

Expected: all tests pass and the old payment endpoint behavior is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/purchase/service.ts src/api/server.ts src/api/server.test.ts
git commit -m "feat: expose idempotent purchase intent API"
```

### Task 4: Render complete purchases in the owner dashboard

**Files:**
- Modify: `src/web/dashboard.ts`
- Modify: `src/api/server.ts`
- Modify: `e2e/public-site.e2e.ts`

**Interfaces:**
- Consumes: `GET /admin/payments` enriched with optional sanitized purchase data.
- Produces: owner-visible cart summary and unchanged approve/reject controls.

- [ ] **Step 1: Add a failing browser test**

Create a stub purchase through the API, authenticate the dashboard, and assert
merchant, item, quantity, total and decision reason are visible before approval.

- [ ] **Step 2: Run the focused browser test**

Run: `npm run test:e2e -- --grep "purchase cart"`

Expected: FAIL because the cart is not rendered.

- [ ] **Step 3: Extend the owner response and dashboard**

Escape every text value before insertion into HTML. Show fulfillment profile ID,
never a resolved household address. Preserve accessible buttons and mobile layout.

- [ ] **Step 4: Run browser and API tests**

Run: `npm run test:e2e && npx vitest run src/api/server.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/web/dashboard.ts src/api/server.ts e2e/public-site.e2e.ts
git commit -m "feat: show purchase details before owner approval"
```

### Task 5: Publish the agent contract and safe demo

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/API.md`
- Modify: `docs/DEMO.md`
- Modify: `docs/DEMO.ru.md`
- Modify: `scripts/smoke.sh`

**Interfaces:**
- Consumes: purchase routes from Task 3.
- Produces: copy-paste HTTP examples and a production stub smoke scenario.

- [ ] **Step 1: Extend the smoke script**

Create a grocery purchase with a unique idempotency key, assert
`pending_approval`, fetch it, reject it with the owner token, and assert the final
status is `rejected`. Never include personal information.

- [ ] **Step 2: Document the contract**

Document field limits, minor-unit calculation, status handling, retries, local
profile IDs, credential separation and the explicit stub-only public demo.

- [ ] **Step 3: Run all approved verification**

Run:

```bash
npm test
npm run test:e2e
npm run test:smoke
npm run build
```

Expected: every command exits `0`; smoke output confirms the stub purchase was rejected.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs scripts/smoke.sh
git commit -m "docs: publish the self-hosted purchase workflow"
```

### Task 6: Release the first Home Core increment

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/ROADMAP.ru.md`

**Interfaces:**
- Consumes: verified outputs from Tasks 1–5.
- Produces: an honest release status and rollback procedure.

- [ ] **Step 1: Update product status**

Mark only the implemented Home Core items complete. Keep card, bank, mainnet and
merchant automation stages explicitly experimental or planned.

- [ ] **Step 2: Deploy the verified commit**

Run the existing Docker deployment, retain the previous image tag, and keep
`EXECUTOR=stub` in production.

- [ ] **Step 3: Run the production smoke command once**

Run: `npm run test:smoke`

Expected: exit `0` against `https://patronhill.ru`.

- [ ] **Step 4: Commit and push the release documentation**

```bash
git add README.md ROADMAP.md docs/ROADMAP.ru.md
git commit -m "docs: mark Home Core purchase intents released"
git push origin main
```

