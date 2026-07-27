# Guardrail Wallet roadmap

Guardrail Wallet is a self-hosted spending wallet for AI agents. It runs on a
home computer, keeps policy and history local, and gives an agent permission to
request a purchase without giving it unrestricted access to money.

## Product contract

Every payment rail follows the same local lifecycle:

```text
purchase intent -> normalize -> policy -> owner approval -> executor -> receipt
```

- The agent receives a scoped request token, never an owner or settlement key.
- Default behavior is fail-closed.
- The owner can cap amount, velocity, merchants, categories, products and time.
- Strong customer authentication, CAPTCHA and ambiguous checkout return to the owner.
- A payment is not described as secure or on-chain limited until that property is implemented and audited.

## Delivery stages

### 0. Safety baseline

- Resolve production dependency vulnerabilities.
- Remove claims that are ahead of the implementation.
- Add migrations, structured audit events, backup and restore procedures.
- Define executor capability and threat-model contracts.

Release gate: the stub build, test suite and documented recovery process pass on a clean machine.

### 1. Home Core

- Add structured purchase intents with cart items, merchant, budget and fulfillment.
- Add merchant, product and recurring-purchase policy conditions.
- Show the complete intent and decision in the local dashboard.
- Add scoped agent credentials and a local emergency lock.
- Publish an MCP tool and TypeScript client for agent integrations.

Release gate: an agent can request a grocery basket, the owner can inspect and approve it, and the stub executor produces an auditable receipt.

### 2. Crypto executors

- Production-grade TON and USDT testnet executor.
- x402 executor for paid APIs and machine services.
- EVM/USDC, Solana and Bitcoin Lightning adapters.
- Chain-specific simulation, fee limits and confirmation tracking.

Release gate: independent audit, testnet soak period and explicit per-executor risk labels. Mainnet remains opt-in.

### 3. Everyday checkout

- Merchant connectors that create carts without holding payment credentials.
- Human handoff for 3DS, CAPTCHA, substitutions and delivery changes.
- Invoice, QR and gift-card workflows.
- Receipt reconciliation, refunds and partial captures.

Release gate: supported merchants have deterministic checkout and refund tests; unsupported sites fail safely.

### 4. Card and bank partners

- Tokenized or dedicated virtual-card executors through eligible issuing partners.
- Open-banking payment initiation where legally and technically available.
- Issuer-side amount, category, country and merchant restrictions.
- No raw card number or online-banking password stored by Guardrail Wallet.

Release gate: partner approval, legal review, strong authentication and a third-party security assessment.

### 5. Home product

- Signed installers for Windows, macOS and Linux.
- Encrypted local vault backed by the operating-system keychain.
- Signed updates, local diagnostics and encrypted backups.
- Family profiles, per-agent budgets and mobile approval notifications.
- Optional preconfigured mini-PC appliance.

Release gate: reproducible builds, signed artifacts, upgrade/rollback tests and recovery documentation.

## Sustainable self-hosted business

The existing core stays MIT licensed. Revenue comes from convenience and trust,
not custody of customer funds:

- Home Pro installer and signed updates.
- Family edition and premium local integrations.
- Preconfigured hardware appliance.
- Remote setup, recovery and support.
- Executor/merchant connector marketplace.
- Donations and sponsorships.

No hosted wallet or mandatory cloud account is required for core operation.

## Not in scope

- Giving an agent an unrestricted mnemonic, bank password or card number.
- Bypassing merchant anti-bot controls, CAPTCHA or strong authentication.
- Custodying customer funds as a cloud service.
- Promising compatibility with every store through brittle browser automation.

Detailed Russian roadmap: [docs/ROADMAP.ru.md](./docs/ROADMAP.ru.md).

