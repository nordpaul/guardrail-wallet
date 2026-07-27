import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { Store } from "./store/store.js";
import { ApprovalManager } from "./approvals.js";
import { PaymentService, type Notifier } from "./service.js";
import { StubExecutor, type Executor } from "./chain/executor.js";
import { TonExecutor } from "./chain/ton.js";
import { TelegramNotifier } from "./telegram/bot.js";
import { buildApi } from "./api/server.js";

async function main() {
  const cfg = loadConfig();

  // Ensure the SQLite directory exists.
  mkdirSync(dirname(cfg.dbPath), { recursive: true });
  const store = new Store(cfg.dbPath);

  const approvals = new ApprovalManager();

  const executor: Executor =
    cfg.executor === "ton"
      ? new TonExecutor({
          network: (process.env.TON_NETWORK ?? "testnet") as "mainnet" | "testnet",
          endpoint: process.env.TON_ENDPOINT ?? "",
          apiKey: process.env.TON_API_KEY,
          sessionMnemonic: process.env.TON_SESSION_MNEMONIC ?? "",
          usdtJettonMaster: process.env.TON_USDT_MASTER ?? "",
          decimals: Number(process.env.TON_DECIMALS ?? 6),
          gasTon: process.env.TON_GAS_TON ?? "0.05",
        })
      : new StubExecutor();

  // The notifier is created after the service so it can resolve approvals,
  // but the service needs the notifier to send cards — wire it in two steps.
  let notifier: Notifier | null = null;
  const service = new PaymentService(store, cfg.policy, executor, approvals, {
    notifyApprovalNeeded: (rec, ctx) => notifier?.notifyApprovalNeeded(rec, ctx) ?? Promise.resolve(),
    notifyResolved: (rec) => notifier?.notifyResolved?.(rec) ?? Promise.resolve(),
  });

  if (cfg.telegram.enabled && cfg.telegram.botToken) {
    const tg = new TelegramNotifier(cfg.telegram.botToken, cfg.policy, service);
    notifier = tg;
    await tg.start();
    console.log("[guardrail] Telegram approvals: ON");
  } else {
    console.log(
      "[guardrail] Telegram approvals: OFF (no TELEGRAM_BOT_TOKEN). " +
        "require_approval payments will sit pending until they time out.",
    );
  }

  const app = buildApi(service, cfg.agentApiKey, cfg.dashboardToken);
  serve({ fetch: app.fetch, port: cfg.port });
  console.log(
    `[guardrail] listening on :${cfg.port} | executor=${cfg.executor} | chain=${cfg.policy.chain}`,
  );
  console.log(
    cfg.dashboardToken
      ? `[guardrail] web dashboard: http://localhost:${cfg.port}/`
      : "[guardrail] web dashboard: OFF (set DASHBOARD_TOKEN to enable)",
  );
}

main().catch((err) => {
  console.error("[guardrail] fatal:", err);
  process.exit(1);
});
