#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://patronhill.ru}"
AGENT_API_KEY="${AGENT_API_KEY:-guardrail-demo-agent}"
DASHBOARD_TOKEN="${DASHBOARD_TOKEN:-guardrail-demo-owner}"
IDEMPOTENCY_KEY="smoke-$(date +%s)-$$"

curl -fsS "$BASE_URL/health" | grep -q '"ok":true'
curl -fsS "$BASE_URL/" | grep -qi 'payment firewall'
curl -fsS "$BASE_URL/docs" | grep -qi 'documentation'
curl -fsS "$BASE_URL/docs/ru" | grep -q 'Guardrail Wallet'
curl -fsS "$BASE_URL/api" | grep -qi 'API'
curl -fsS "$BASE_URL/robots.txt" | grep -q "Sitemap: $BASE_URL/sitemap.xml"
curl -fsS "$BASE_URL/sitemap.xml" | grep -q "<loc>$BASE_URL/docs</loc>"
curl -fsSI "$BASE_URL/" | grep -qi '^strict-transport-security:'

RESPONSE="$(curl -fsS "$BASE_URL/v1/payments/request" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"idempotency_key\":\"$IDEMPOTENCY_KEY\",\"recipient\":{\"address\":\"EQ_SMOKE_TEST_ONLY\"},\"amount\":{\"value\":75,\"currency\":\"USD\"},\"memo\":\"Automated stub smoke test\"}")"

PAYMENT_ID="$(node -e 'const value=JSON.parse(process.argv[1]); if(value.status!=="pending_approval"||!value.payment_id) process.exit(1); process.stdout.write(value.payment_id)' "$RESPONSE")"

curl -fsS -X POST "$BASE_URL/admin/payments/$PAYMENT_ID/reject" \
  -H "Authorization: Bearer $DASHBOARD_TOKEN" | grep -q '"ok":true'

echo "Production smoke passed for $BASE_URL (stub payment $PAYMENT_ID was rejected)."
