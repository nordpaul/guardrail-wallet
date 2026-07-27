# Self-hosted guardrails for AI-agent purchase requests

Self-hosted stacks usually fail on “who is allowed to spend?” instead of “how much can we automate?”
Guardrail Wallet separates those concerns with a narrow request API and owner policy.

The flow is simple:
- Agent submits request (`recipient`, `category`, `memo`, `amount`, `idempotency_key`)
- Policy checks limits and rules locally
- `pending_approval` goes to owner, otherwise auto-approval for allowed patterns

Household example:
an agent sees a recurring top-up pattern that changed recipient. This should not auto-run.
It becomes a pending request so the owner can reject suspicious spending before funds
move.

Public demo uses `EXECUTOR=stub` and moves no real money:
https://patronhill.ru/dashboard?utm_source=reddit_selfhosted&utm_medium=organic&utm_campaign=guardrail_launch
Source:
https://github.com/nordpaul/guardrail-wallet

This is early-access and intentionally conservative. Policy is deterministic first;
chain guardrail and deep audit are still experimental.

If you run it, please report installation steps, failed commands, and exact policy
cases that should have rejected or passed.
