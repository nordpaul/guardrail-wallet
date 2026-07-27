# Guardrail Wallet early access: agent requests, owner decides

Build with AI agents at home and on servers: the owner should stay in control of money.
Guardrail Wallet is a self-hosted payment firewall: agent sends payment requests only,
policy evaluates locally, owner approves unusual requests.

For households: if your model buys a random “urgent” order and category is unknown,
the request appears as `pending_approval` and does not move real funds until owner
confirms.

Public demo:
https://patronhill.ru/dashboard?utm_source=telegram&utm_medium=organic&utm_campaign=guardrail_launch
Repo:
https://github.com/nordpaul/guardrail-wallet

Public demo safety:
`EXECUTOR=stub` only, no real money.
Early access, resettable environment. TON chain guardrail is experimental and
unaudited.

Нужна обратная связь по техническим аспектам: policy API, approval UX, edge-case
правила, отказоустойчивость. Скиньте OS, Node/Docker, точный curl и логи.
https://patronhill.ru/docs/DEMO.md
