# Home Core purchase intents design

## Objective

Extend Guardrail Wallet from a narrow payment request demo into the first useful
self-hosted household workflow: an AI agent requests a structured grocery or
online purchase, the owner evaluates the complete intent locally, and the
existing stub executor records the decision without moving money.

## Boundaries

This increment does not add card storage, browser automation, a hosted account,
mainnet settlement or a new merchant integration. It preserves the existing
`POST /v1/payments/request` contract and adds a higher-level purchase contract.

## Architecture

The new flow is:

```text
agent -> PurchaseIntent API -> normalizer -> PaymentService -> policy
      -> local approval -> StubExecutor -> PurchaseReceipt
```

`PurchaseIntent` contains a stable idempotency key, merchant identity, cart
items, maximum total, currency, category, fulfillment mode and optional local
profile references. It never accepts raw card data, wallet mnemonics or a full
delivery address. Sensitive household details remain behind local profile IDs.

The normalizer calculates the requested total from item quantity and unit price.
It rejects totals above the agent's declared maximum and maps the intent into the
existing `PaymentRequest`. This lets the current engine, store, approvals and
executor remain the single payment decision path.

## Components

### Purchase schema

Zod validates all external fields strictly. Prices are positive finite numbers,
quantities are positive integers, currency is a short uppercase code, and cart
size is bounded. Server-calculated totals are authoritative.

### Policy context

The first increment reuses amount, category, recipient and velocity rules.
Merchant/product conditions are a follow-up after the purchase API is stable.

### Persistence

SQLite stores the normalized cart snapshot and fulfillment metadata next to the
payment record through a versioned migration. No secret or raw address is stored
in the cart JSON.

### Dashboard

The owner sees merchant, items, quantities, unit prices, total, fulfillment,
agent identity, decision reasons and status before approving. The existing owner
token remains distinct from every agent token.

### Agent integration

The HTTP API is canonical. A small TypeScript client wraps it. An MCP server is
planned after the HTTP contract and scoped-token model are tested.

## Failure handling

- Invalid or oversized carts return `400 invalid_purchase_intent`.
- Reusing an idempotency key returns the original purchase and receipt.
- Unknown merchant or local profile IDs require approval by default.
- Approval timeout rejects the request.
- Executor errors produce `failed` and never retry with a new idempotency key.
- Restart recovery must not turn a pending request into an automatic approval.

## Security requirements

- `EXECUTOR=stub` is mandatory for this increment's public and automated tests.
- Agent input is untrusted and never used as a security fact without validation.
- Logs redact authorization headers and local profile details.
- Agent and owner credentials remain distinct.
- No mainnet claim is added to the product copy.

## Success criteria

An agent can request a grocery basket, retry safely, receive
`pending_approval`, and poll its status. The owner can inspect the complete cart,
reject or approve it, and receive a stub receipt. Unit, integration, browser and
production smoke suites remain green.

