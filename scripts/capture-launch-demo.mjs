import { mkdtemp, readdir, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEMO_BASE_URL = process.env.DEMO_BASE_URL || "https://patronhill.ru";
const AGENT_TOKEN = "guardrail-demo-agent";
const OWNER_TOKEN = "guardrail-demo-owner";
const SCREENSHOTS = [
  {
    name: "01-landing.png",
    label: "Landing page",
    waitMs: 140,
  },
  {
    name: "02-pending-approval.png",
    label: "Pending approval",
    waitMs: 180,
  },
  {
    name: "03-rejected.png",
    label: "Rejected",
    waitMs: 180,
  },
];

function exitIfNotSuccessful(commandResult, message) {
  if (commandResult.status !== 0) {
    throw new Error(`${message}\n${commandResult.stderr || commandResult.stdout || "no output"}`);
  }
}

async function checkDependencies(baseUrl) {
  const browserCheck = await chromium.launch({ headless: true });
  await browserCheck.close();

  const convertCheck = spawnSync("convert", ["-version"], { encoding: "utf8" });
  exitIfNotSuccessful(convertCheck, "ImageMagick convert is not available.");

  const healthResponse = await fetch(`${baseUrl}/health`);
  if (!healthResponse.ok) {
    throw new Error(`Health check failed with ${healthResponse.status}`);
  }
  const health = await healthResponse.json();
  if (health.ok !== true) {
    throw new Error("Health endpoint did not return { ok: true }.");
  }
}

async function requestDemoPayment(baseUrl) {
  const response = await fetch(`${baseUrl}/v1/payments/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AGENT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotency_key: `launch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recipient: {
        address: "EQ_DEMO_CAMPAIGN_ONLY",
        merchant_id: "campaign-launch",
      },
      amount: {
        value: 150,
        currency: "USD",
      },
      category: "electronics",
      memo: "Launch walkthrough / stub only",
    }),
  });
  if (!response.ok) {
    throw new Error(`Payment request failed with ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== "pending_approval" || !payload.payment_id) {
    throw new Error("Expected response status pending_approval and payment_id.");
  }
  return payload.payment_id;
}

async function runCapture(baseUrl) {
  const assetsDir = path.resolve(process.cwd(), "docs/assets");
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true });
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "guardrail-demo-"));
  const browser = await chromium.launch({ headless: true });
  const framePaths = [];
  let paymentId;

  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 800 } });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(SCREENSHOTS[0].waitMs);
    const landingPath = path.join(workDir, SCREENSHOTS[0].name);
    await page.screenshot({ path: landingPath });
    framePaths.push(landingPath);

    paymentId = await requestDemoPayment(baseUrl);

    await page.goto(new URL("/dashboard", baseUrl).toString(), { waitUntil: "networkidle" });
    await page.fill("#token", OWNER_TOKEN);
    await page.getByRole("button", { name: "Save" }).click();
    await page.locator("span.badge.pending_approval").first().waitFor({ timeout: 30000 });
    const pendingPath = path.join(workDir, SCREENSHOTS[1].name);
    await page.waitForTimeout(SCREENSHOTS[1].waitMs);
    await page.screenshot({ path: pendingPath });
    framePaths.push(pendingPath);

    await page.locator("button.reject").first().click();
    await page.locator("span.badge.rejected").first().waitFor({ timeout: 30000 });
    const rejectedPath = path.join(workDir, SCREENSHOTS[2].name);
    await page.waitForTimeout(SCREENSHOTS[2].waitMs);
    await page.screenshot({ path: rejectedPath });
    framePaths.push(rejectedPath);
  } finally {
    await browser.close();
  }

  const gifPath = path.join(assetsDir, "guardrail-demo-walkthrough.gif");
  const convertResult = spawnSync(
    "convert",
    [
      ...framePaths,
      "-set",
      "delay",
      "140,180,180",
      "-layers",
      "Optimize",
      gifPath,
    ],
    {
      cwd: workDir,
      encoding: "utf8",
    }
  );
  exitIfNotSuccessful(convertResult, "ImageMagick convert failed.");

  const files = await readdir(workDir);
  const produced = files.filter((file) => file.endsWith(".png"));
  return { gifPath, frameCount: framePaths.length, produced };
}

;(async function main() {
  const isCheckMode = process.argv.includes("--check");
  await checkDependencies(DEMO_BASE_URL);
  if (isCheckMode) {
    console.log("Launch demo capture environment check passed.");
    return;
  }
  const result = await runCapture(DEMO_BASE_URL);
  console.log(`Launch walkthrough frames: ${result.frameCount}`);
  console.log(`Launched payment lifecycle GIF: ${result.gifPath}`);
  console.log(`Created ${result.produced.length} temporary frames.`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
