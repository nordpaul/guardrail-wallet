import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { policySchema, type Policy } from "./policy.js";

// Load a local .env into process.env if present (Node 20.12+ / 22 built-in).
// In Docker we pass real env vars instead, so the file may be absent.
if (existsSync(".env")) process.loadEnvFile(".env");

// ---------------------------------------------------------------------------
// Runtime configuration: secrets and wiring come from the environment,
// the spending policy comes from a YAML file the human owns.
// ---------------------------------------------------------------------------

export interface AppConfig {
  port: number;
  /** Bearer token the agent must present. This grants the right to *request*, not to spend. */
  agentApiKey: string;
  dbPath: string;
  policyPath: string;
  executor: "stub" | "ton";
  /** Owner token for the web dashboard. Null disables the dashboard. Distinct from agentApiKey. */
  dashboardToken: string | null;
  telegram: {
    enabled: boolean;
    botToken: string | null;
  };
  policy: Policy;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function loadPolicy(path: string): Policy {
  const raw = readFileSync(path, "utf8");
  const parsed = parseYaml(raw);
  return policySchema.parse(parsed);
}

export function loadConfig(): AppConfig {
  const policyPath = process.env.POLICY_PATH ?? "policy.yaml";
  const policy = loadPolicy(policyPath);
  const executor = (process.env.EXECUTOR ?? "stub") as "stub" | "ton";
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? null;

  return {
    port: Number(process.env.PORT ?? 8787),
    agentApiKey: required("AGENT_API_KEY"),
    dbPath: process.env.DB_PATH ?? "data/wallet.sqlite",
    policyPath,
    executor,
    dashboardToken: process.env.DASHBOARD_TOKEN ?? null,
    telegram: {
      enabled: !!botToken,
      botToken,
    },
    policy,
  };
}
