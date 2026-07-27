# API usage

Base URL: `https://patronhill.ru/api`

The public demo uses `EXECUTOR=stub`. API responses that appear to create, execute, settle, refund, or transfer a payment are simulated in that environment. They do not initiate real financial operations or real translations/transfers.

## Authentication

Use the application's normal authenticated session or the credentials provided by the deployment. The public demo credentials are documented in [DEMO.md](DEMO.md); they are public and must never be reused for a private or production deployment.

Do not place passwords or long-lived tokens directly in shell history. Prefer environment variables and HTTPS:

```bash
export API_BASE='https://patronhill.ru/api'
export ACCESS_TOKEN='replace-with-a-non-demo-token'

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Accept: application/json' \
  "$API_BASE/..."
```

`...` intentionally stands for an endpoint exposed by the running version of the application. This document does not invent endpoint paths or request schemas: inspect the deployed API reference or application routes before automating calls.

## Safe curl patterns

Health or metadata endpoints, when enabled by the deployment, can be queried without credentials:

```bash
curl --fail-with-body --silent --show-error \
  -H 'Accept: application/json' \
  https://patronhill.ru/api/health
```

For an authenticated JSON request, use the route and JSON schema published by the deployed application:

```bash
curl --fail-with-body --silent --show-error \
  -X POST "$API_BASE/<resource>" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"example":"replace-with-the-documented-schema"}'
```

Treat `404`, `401`, `403`, `409`, `422`, `429`, and all `5xx` responses as errors requiring explicit handling. Do not retry a state-changing request blindly; use an idempotency key if the deployed endpoint supports one.

## Payment lifecycle

A payment integration normally distinguishes creation, authorization or pending processing, execution, final settlement, failure/cancellation, and refund/reversal. The exact state names and transitions are provider- and deployment-specific.

For the public demo:

- Execution is performed by `EXECUTOR=stub`.
- Lifecycle updates are simulated application data only.
- No provider is contacted and no money moves.
- “Success” is not financial settlement.

For production, persist the provider reference, validate signed webhooks, make processing idempotent, reconcile provider records, and expose final settlement only after authoritative provider confirmation.

## API security

- Use HTTPS only; reject plain HTTP at the edge.
- Keep access tokens out of URLs, logs, browser storage where avoidable, and source control.
- Authorize every resource request server-side; client role checks are not sufficient.
- Validate content type, schema, amount/currency constraints, and ownership before execution.
- Rate-limit authentication and state-changing endpoints.
- Redact secrets and payment data from logs and error responses.
