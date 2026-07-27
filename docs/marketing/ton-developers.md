# Experimental TON executor behind a self-hosted agent payment firewall

Guardrail Wallet is not another Telegram bot payment shortcut. It is a policy-first
gateway for agents, where request signing, limits, and human approval are owned by your
deployment.

Core flow:
agent requests with metadata (`recipient`, `amount`, `memo`, `category`);
policy validates static + behavioral rules;
safe paths execute automatically if matched;
non-standard paths become `pending_approval` for owner action.

Household scenario:
the AI helper suggests a recurring top-up at a new merchant during weekend hours.
TON chain settings can be preconfigured as a backstop, but the owner decision is still
required for unusual patterns.

Try it now:
https://patronhill.ru/dashboard?utm_source=ton_community&utm_medium=organic&utm_campaign=guardrail_launch

Repo and docs:
https://github.com/nordpaul/guardrail-wallet
https://patronhill.ru/docs/LAUNCH.md

Demo reminder:
`EXECUTOR=stub`, no real money. Project is early access, no full audit.
If you're designing executor integration, please share requested API contracts and
security assumptions for your chain path.
