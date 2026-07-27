import { access } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const STUB_PATTERN = /(executor\s*=\s*stub|stub\s+executor)/i;
const NO_REAL_MONEY_PATTERN = /no\s+real\s+money/i;
const FORBIDDEN_PAGES = ["nordpaul.github.io/guardrail-wallet"];

const MARKETING_FILES = {
  "docs/marketing/show-hn.md": "hacker_news",
  "docs/marketing/dev-community.md": "dev_community",
  "docs/marketing/reddit-selfhosted.md": "reddit_selfhosted",
  "docs/marketing/reddit-localllama.md": "reddit_localllama",
  "docs/marketing/telegram.md": "telegram",
  "docs/marketing/ton-developers.md": "ton_community",
};

const REQUIRED_FILES = [
  "docs/LAUNCH.md",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/install-report.yml",
  ".github/ISSUE_TEMPLATE/integration-proposal.yml",
  "docs/marketing/show-hn.md",
  "docs/marketing/dev-community.md",
  "docs/marketing/reddit-selfhosted.md",
  "docs/marketing/reddit-localllama.md",
  "docs/marketing/telegram.md",
  "docs/marketing/ton-developers.md",
  "scripts/launch-kit.mjs",
  "scripts/launch-kit.test.mjs",
  "scripts/capture-launch-demo.mjs",
  "docs/releases/v0.1.0-alpha.1.md",
  "docs/assets/guardrail-demo-walkthrough.gif",
];

function formatIssue(file, message) {
  return `${file}: ${message}`;
}

function hasCampaignUtm(content, source) {
  const contentLower = content.toLowerCase();
  return (
    contentLower.includes(`utm_source=${source}`) &&
    contentLower.includes("utm_medium=organic") &&
    contentLower.includes("utm_campaign=guardrail_launch")
  );
}

export function validateCopy(relativePath, content) {
  const issues = [];
  const hasStub = STUB_PATTERN.test(content);
  const hasNoRealMoney = NO_REAL_MONEY_PATTERN.test(content);
  if (!hasStub || !hasNoRealMoney) {
    issues.push(
      `Add a stub-executor disclosure with explicit real-money safety, e.g. 'EXECUTOR=stub' and 'no real money'.`
    );
  }

  for (const badOrigin of FORBIDDEN_PAGES) {
    if (content.toLowerCase().includes(badOrigin.toLowerCase())) {
      issues.push(`Do not reference ${badOrigin} because GitHub Pages is disabled.`);
    }
  }

  if (relativePath.startsWith("docs/marketing/")) {
    const source = MARKETING_FILES[relativePath];
    if (source && !hasCampaignUtm(content, source)) {
      issues.push(
        `Marketing copy should include utm_source=${source}, utm_medium=organic, utm_campaign=guardrail_launch.`
      );
    }
  }

  return issues;
}

export async function validateLaunchKit(root) {
  const issues = [];
  for (const relativePath of REQUIRED_FILES) {
    const absolutePath = path.resolve(root, relativePath);
    try {
      await access(absolutePath);
    } catch {
      issues.push(formatIssue(relativePath, "required file is missing"));
      continue;
    }

    const content = await fs.readFile(absolutePath, "utf8");
    const extension = path.extname(relativePath).toLowerCase();
    const shouldValidateCopy =
      extension === ".md" ||
      extension === ".yml" ||
      extension === ".yaml";
    if (shouldValidateCopy) {
      const copyIssues = validateCopy(relativePath, content);
      for (const copyIssue of copyIssues) {
        issues.push(formatIssue(relativePath, copyIssue));
      }
    }
  }

  return issues;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const issues = await validateLaunchKit(process.cwd());
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exitCode = 1;
  } else {
    console.log("Launch kit checks passed.");
  }
}
