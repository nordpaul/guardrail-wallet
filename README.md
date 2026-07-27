# Guardrail Wallet

[Live demo](http://129.159.133.143) | [Agent integration](./AGENTS.md) | [Security model](./SECURITY.md)

**A self-hosted wallet that lets an AI agent spend money — within limits you set, with you signing off from Telegram.**

> The public demo uses `EXECUTOR=stub` and never moves real money. The TON
> executor remains experimental until the on-chain guardrail extension is
> implemented and audited.

### Shared sandbox credentials

- Agent API key: `guardrail-demo-agent`
- Dashboard owner token: `guardrail-demo-owner`
- Dashboard: `http://129.159.133.143/dashboard`

The sandbox is public and may be reset. Never submit secrets or personal data.

You top up a balance. Your agent (shopping, paying bills, subscriptions) asks the
wallet to pay. Small, trusted payments go through automatically; anything
unusual pings your Telegram with **✅ Approve / ❌ Reject**. Hard limits are
enforced on-chain, so even a hacked server can't drain you past the daily cap.

> The agent is never trusted. It can only *ask*. The wallet decides. See
> [SECURITY.md](./SECURITY.md) for the full threat model and
> [USAGE.md](./USAGE.md) for the step-by-step operating guide.

```
agent ──request──▶ guardrail wallet ──▶ policy engine ──┬─ allow ─▶ settle on-chain
                                                        ├─ deny  ─▶ 402 + reason
                                                        └─ ask   ─▶ Telegram ✅/❌ ─▶ settle
```

- **Crypto is hidden.** You see a `$` balance; under the hood it's stablecoin
  (USDT on TON by default). The chain layer is pluggable.
- **Hybrid enforcement.** Soft rules (categories, allowlists, new-recipient) run
  on the server; hard ceilings (per-tx, daily cap, freeze) run on-chain.
- **Self-hosted & open source.** One Docker container + a `policy.yaml`. MIT.

## Quickstart (no chain, 2 minutes)

Runs the full policy + approval flow with a fake settler — perfect to try it.

```bash
npm install

cp .env.example .env          # set AGENT_API_KEY to anything long & random
cp policy.example.yaml policy.yaml

npm test                      # the policy engine is fully unit-tested
npm run dev                   # starts on :8787 with EXECUTOR=stub
```

Ask for a payment as your agent would:

```bash
curl -s localhost:8787/v1/payments/request \
  -H "Authorization: Bearer <AGENT_API_KEY>" \
  -H "content-type: application/json" \
  -d '{
    "idempotency_key": "demo-1",
    "recipient": { "address": "EQexample...", "merchant_id": "coffee-shop" },
    "amount": { "value": 4.50, "currency": "USD" },
    "category": "groceries",
    "memo": "Morning coffee"
  }'
# -> { "status": "executed", ... }   (trusted category, settles via stub)
```

Try `"amount": { "value": 150 }` to a new address with no category → you'll get
`pending_approval`. Poll it:

```bash
curl localhost:8787/v1/payments/<payment_id> -H "Authorization: Bearer <key>"
```

## Web dashboard

Set `DASHBOARD_TOKEN` in `.env` (a secret **different** from `AGENT_API_KEY`),
then open `http://localhost:<PORT>/`. You get a live list of payments and
**Approve / Reject** buttons for anything pending — a browser alternative to
Telegram. Enter the owner token once; it's kept in the browser.

The dashboard uses the **owner** token, never the agent key — the agent cannot
approve its own payments. Leave `DASHBOARD_TOKEN` empty to disable the web UI.

## Turn on Telegram approvals

1. Create a bot with [@BotFather](https://t.me/BotFather), copy the token.
2. Get your numeric id from [@userinfobot](https://t.me/userinfobot).
3. Put the token in `.env` (`TELEGRAM_BOT_TOKEN=...`) and your id in
   `policy.yaml` (`telegram.owner_chat_id`).
4. Restart. `require_approval` payments now arrive as cards with buttons.
   No answer within `approval_timeout_sec` → auto-reject.

## Agent API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/payments/request` | ask to pay; returns `executed` / `pending_approval` / `rejected` |
| `GET`  | `/v1/payments/:id` | poll status (for pending) |
| `GET`  | `/health` | liveness |

Auth: `Authorization: Bearer <AGENT_API_KEY>`. The agent's token grants the
right to *request*, never to spend.

`idempotency_key` makes retries safe — the same key always returns the original
outcome, never a second payment.

## Configure spending: `policy.yaml`

The only file you really tune. Limits, categories, allow/block lists, the
auto-approve threshold, and Telegram. See
[`policy.example.yaml`](./policy.example.yaml) — it's commented end to end.

Decision order (fail-closed): `kill_switch / hard_limits → blocklist → rules
(first match wins) → default → auto-approve downgrade for trivial amounts`.

## Going on-chain (TON)

Set `EXECUTOR=ton` and fill the `TON_*` vars in `.env`. The settlement adapter
lives in [`src/chain/ton.ts`](./src/chain/ton.ts) (skeleton). The hard limits
are meant to be enforced by an on-chain **guardrail extension** on a TON Wallet
v5 — the contract is the floor the server can't lower. Until that contract is
audited, run on testnet or keep `daily_max` small.

Want a different chain? Implement the `Executor` interface
([`src/chain/executor.ts`](./src/chain/executor.ts)) — nothing above it changes.

## Architecture

```
src/
  core/engine.ts     # pure, deterministic policy engine (+ engine.test.ts)
  policy.ts          # policy schema (zod) parsed from policy.yaml
  service.ts         # ties engine + store + executor + approvals together
  store/store.ts     # SQLite persistence + derived context (velocity, known-recipient)
  approvals.ts       # pending-approval registry with fail-closed timeouts
  chain/executor.ts  # settlement interface + StubExecutor
  chain/ton.ts       # TON / native-USDT adapter (skeleton)
  telegram/bot.ts    # approval cards, owner-only buttons
  api/server.ts      # the narrow agent-facing HTTP API
  index.ts           # wiring
```

## Status

Early. The off-chain core (engine, API, approvals, store) works and is tested.
The on-chain TON executor and guardrail contract are the next milestone — see
the roadmap in the README discussion / issues. **Don't put large mainnet
balances behind it yet.**

## Support this project

Guardrail Wallet is free and MIT-licensed. If it's useful to you, donations keep
it maintained:

- TON: `UQCLbq0UGD65ljHQGlqF5pNgMAWDgE_bnavRxSSRZy-V3rEJ`
- Tonkeeper: [Support Guardrail Wallet](https://app.tonkeeper.com/transfer/UQCLbq0UGD65ljHQGlqF5pNgMAWDgE_bnavRxSSRZy-V3rEJ?text=Support%20Guardrail%20Wallet)

## License

MIT © 2026 Pavel
