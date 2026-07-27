# Public demo

The public instance is available at [https://patronhill.ru](https://patronhill.ru).

## Demo accounts

Use these credentials only on the public demo:

| Role | Login | Password |
| --- | --- | --- |
| Agent | `guardrail-demo-agent` | `guardrail-demo-agent` |
| Owner | `guardrail-demo-owner` | `guardrail-demo-owner` |

These are intentionally public, low-privilege accounts. Do not enter personal data, production secrets, payment details, or credentials from another system into the demo. Demo data can be reset, changed, or removed without notice.

## What the demo does

The public demo runs with `EXECUTOR=stub`. A stub executor is a simulator: it records and returns predictable demo outcomes, but it does not contact a bank, payment processor, blockchain, or external transfer provider.

As a result:

- No real money is charged, held, refunded, or transferred.
- No real recipient receives funds.
- A successful-looking payment or transfer state is only a simulated application state.
- The demo is not evidence of a completed payment and must not be used for accounting or reconciliation.

## Payment lifecycle in demo mode

A typical demo flow is:

1. Create or inspect a payment intent/request.
2. Submit the action that would normally initiate execution.
3. The stub executor returns a simulated result.
4. The application displays the resulting lifecycle state and history.

In a production integration, payment state must be confirmed from the actual provider's signed callback, API response, or reconciliation process. Never treat a client-side screen or a demo response as settlement confirmation.

## Reporting issues

When reporting an issue, include the time, account role, non-sensitive request or action details, and the displayed state. Never include passwords, access tokens, or personal payment information.
