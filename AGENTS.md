# Agent integration contract

Guardrail Wallet treats every agent as untrusted. An agent receives only an
`AGENT_API_KEY`; it never receives the owner token, Telegram token, session
mnemonic, or wallet key.

## Request

`POST /v1/payments/request` with `Authorization: Bearer <AGENT_API_KEY>` and:

```json
{
  "idempotency_key": "stable-unique-operation-id",
  "recipient": { "address": "EQ...", "merchant_id": "merchant" },
  "amount": { "value": 12.5, "currency": "USD" },
  "category": "groceries",
  "memo": "Human-readable purpose"
}
```

## Result handling

- `executed`: store `payment_id` and `tx_hash`.
- `pending_approval`: poll `GET /v1/payments/<payment_id>`.
- `rejected`: stop; never modify a request to bypass policy.
- Timeout: retry with the same `idempotency_key` to prevent duplicate payment.

## Safety rules

- Never split payments to evade limits.
- Never change recipient or amount after requesting approval.
- Never request owner credentials or settlement keys.
- Never use the public sandbox for secrets, personal data, or real accounting.
