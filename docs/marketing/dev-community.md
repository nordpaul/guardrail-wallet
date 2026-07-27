# DEV: I gave an AI agent a payment request API, not a wallet key

Most teams wire AI agents directly into payment credentials and then try to “fix”
safety with ad-hoc checks. That is exactly where policy drift appears.

With Guardrail Wallet the model calls one narrow endpoint:
`POST /v1/payments/request`. The request carries reason, category, memo, and idempotency key.
The policy service runs deterministically before execution; for borderline cases the
owner must approve via dashboard or Telegram. The owner decides in one place, not
every model prompt.

A practical household example: a child asks an agent for 150 USD worth of school
supplies, category `education`. If this is outside the configured budget window, the
request can be shown in approval state before any transfer.

Try it live:
https://patronhill.ru/dashboard?utm_source=dev_community&utm_medium=organic&utm_campaign=guardrail_launch

Repository:
https://github.com/nordpaul/guardrail-wallet

Important limits:
public demo uses `EXECUTOR=stub` and moves no real money;
early-access flow can be reset;
experimental TON chain guardrail, not audited.

If you integrate an agent runtime, share your API boundary and threat model
assumptions. Early feedback should include payloads and exact curl/agent logs.
