# A narrow, local payment API for agents that must ask before spending

This project is aimed at people who run LLM tooling locally or semi-locally and want
an explicit payment safety boundary.

Guardrail Wallet gives agents one constrained verb: request a payment. Policy checks
are local-first. Only approved/auto-allowed cases execute. Any `pending_approval`
request asks a human.

Household pattern:
agent sees a one-off order for supplements while groceries are already paid this month.
Category, amount, and recipient rules stop “scope creep” unless owner explicitly approves.

Demo:
https://patronhill.ru/dashboard?utm_source=reddit_localllama&utm_medium=organic&utm_campaign=guardrail_launch

Repo:
https://github.com/nordpaul/guardrail-wallet

Transparent constraints:
`EXECUTOR=stub` in public demo, no real money moved;
no audit claim, experimental TON guardrail.

If you care about self-hosted safety, please share model/agent runtime details and
hard edge cases you want in policy (timeouts, recipient allowlists, spend ceilings).
