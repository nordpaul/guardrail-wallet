# Guardrail Wallet - a self-hosted payment firewall for AI agents

AI agents still need a hard boundary between “ask” and “spend.” Most agent payment
designs eventually leak authority, not just money. Guardrail Wallet is a
self-hosted middle layer for AI agent spending: the agent can only request a
payment, policy decides automatically for safe cases, and the owner gets explicit
approval for anything unusual.

Use case for households:
an agent sees a grocery add-on at checkout and asks: amount 150 USD, category
`groceries`, recipient unknown. The policy rejects unknown recipients and asks the
owner for approval before anything is paid.

The public demo uses `EXECUTOR=stub` and moves no real money. It is a simulated
approval lifecycle only:
https://patronhill.ru/dashboard?utm_source=hacker_news&utm_medium=organic&utm_campaign=guardrail_launch

Code and docs:
https://github.com/nordpaul/guardrail-wallet (docs: https://patronhill.ru/docs)

Early-access is active only. There is no production guarantee, no finalized audit,
and no claim of guaranteed savings. `guardrail-demo-agent` and
`guardrail-demo-owner` are public demo credentials.

If you try it and hit a bug, please send installation details, payload examples,
policy assumptions, and failing output so we can harden the owner approval loop.
