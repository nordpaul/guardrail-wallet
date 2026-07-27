# Organic Launch Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch a zero-budget, developer-first campaign for Guardrail Wallet with a verifiable public launch kit, community-specific copy, feedback intake, a demo walkthrough, and a GitHub pre-release.

**Architecture:** Keep the repository as the campaign source of truth. A small Node validator enforces stable links and safety disclosures across public launch assets; Markdown and GitHub issue forms hold the reusable campaign material; Playwright captures the existing production demo; GitHub Releases is the first publication channel. External community posts remain previewable drafts because they must be published through the owner's accounts under each community's rules.

**Tech Stack:** Node.js 20+, Node test runner, TypeScript project scripts, Playwright/Chromium, ImageMagick, Markdown, GitHub issue forms, GitHub CLI.

## Global Constraints

- Spend no money and add no advertising or analytics vendor.
- Position the project as a self-hosted payment firewall for AI agents.
- Use household purchases as the lead example and TON only as a pluggable rail.
- State that `EXECUTOR=stub` moves no real money in every standalone launch asset.
- Do not claim production readiness, a completed audit, guaranteed savings, or unrestricted autonomous spending.
- Do not publish mnemonics, bot tokens, API secrets, server keys, or owner credentials.
- Do not make donations the primary campaign call to action.
- Do not link to the disabled `nordpaul.github.io/guardrail-wallet` site.
- Use `https://patronhill.ru` as the canonical public origin.
- External posts require owner-account preview and must follow each community's self-promotion rules.

---

## File map

- `scripts/launch-kit.mjs`: validate required campaign files, disclosures, canonical links, and UTM parameters.
- `scripts/launch-kit.test.mjs`: test validator behavior against temporary real files.
- `package.json`: expose `test:launch` and `capture:launch-demo` commands.
- `docs/LAUNCH.md`: canonical public launch page and campaign source of truth.
- `README.md`: point repository visitors to the launch page and correct the GitHub-safe documentation link.
- `.github/ISSUE_TEMPLATE/install-report.yml`: collect reproducible installation feedback.
- `.github/ISSUE_TEMPLATE/integration-proposal.yml`: collect concrete executor and agent integration proposals.
- `.github/ISSUE_TEMPLATE/config.yml`: direct security reports away from public issues.
- `docs/marketing/*.md`: channel-specific post drafts with fixed organic campaign URLs.
- `scripts/capture-launch-demo.mjs`: capture the real landing, request, and dashboard states from the stub demo.
- `docs/assets/guardrail-demo-walkthrough.gif`: generated campaign walkthrough.
- `docs/releases/v0.1.0-alpha.1.md`: exact GitHub pre-release notes.

---

### Task 1: Launch-kit validator

**Files:**
- Create: `scripts/launch-kit.mjs`
- Create: `scripts/launch-kit.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateCopy(relativePath: string, content: string): string[]`
- Produces: `validateLaunchKit(root: string): string[]`
- Produces: `npm run test:launch` after Task 4 supplies every required asset.

- [ ] **Step 1: Write failing validator tests**

Create `scripts/launch-kit.test.mjs` with Node's built-in test runner. Use a temporary directory and literal expectations:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { validateCopy } from "./launch-kit.mjs";

test("rejects copy without the stub disclosure", () => {
  const issues = validateCopy("docs/marketing/show-hn.md", "Try https://patronhill.ru/?utm_source=hacker_news&utm_medium=organic&utm_campaign=guardrail_launch");
  assert(issues.some((issue) => issue.includes("stub disclosure")));
});

test("rejects the disabled GitHub Pages origin", () => {
  const issues = validateCopy("docs/LAUNCH.md", "EXECUTOR=stub moves no real money. https://nordpaul.github.io/guardrail-wallet/");
  assert(issues.some((issue) => issue.includes("GitHub Pages")));
});

test("accepts canonical campaign copy", () => {
  const copy = "The public demo uses EXECUTOR=stub and moves no real money. https://patronhill.ru/?utm_source=hacker_news&utm_medium=organic&utm_campaign=guardrail_launch";
  assert.deepEqual(validateCopy("docs/marketing/show-hn.md", copy), []);
});
```

- [ ] **Step 2: Run the tests and observe the expected failure**

Run: `node --test scripts/launch-kit.test.mjs`

Expected: FAIL because `scripts/launch-kit.mjs` does not exist.

- [ ] **Step 3: Implement the validator**

Create `scripts/launch-kit.mjs`. Export the two named functions. `validateCopy` must require a case-insensitive `EXECUTOR=stub` or `stub executor` disclosure plus `no real money`, reject `nordpaul.github.io/guardrail-wallet`, and require `utm_medium=organic&utm_campaign=guardrail_launch` in files under `docs/marketing/`. `validateLaunchKit` reads the exact file list from the File map, except generated GIF and release notes which are added in later tasks, and returns path-prefixed issues rather than throwing.

The CLI branch must print every issue to stderr and exit `1`; otherwise print `Launch kit checks passed.` and exit `0`:

```js
if (import.meta.url === `file://${process.argv[1]}`) {
  const issues = validateLaunchKit(process.cwd());
  if (issues.length) {
    for (const issue of issues) console.error(issue);
    process.exit(1);
  }
  console.log("Launch kit checks passed.");
}
```

- [ ] **Step 4: Verify validator unit tests pass**

Run: `node --test scripts/launch-kit.test.mjs`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Add the package command and commit**

Add `"test:launch": "node --test scripts/launch-kit.test.mjs && node scripts/launch-kit.mjs"` to `scripts` in `package.json`.

```bash
git add package.json scripts/launch-kit.mjs scripts/launch-kit.test.mjs
git commit -m "test: validate organic launch assets"
```

---

### Task 2: Canonical launch page and repository entry point

**Files:**
- Create: `docs/LAUNCH.md`
- Modify: `README.md:3`
- Modify: `README.md:10`
- Modify: `README.md:170`

**Interfaces:**
- Consumes: canonical origin `https://patronhill.ru` and repository URL `https://github.com/nordpaul/guardrail-wallet`.
- Produces: one public page that every channel draft can cite for facts and limitations.

- [ ] **Step 1: Create the public launch page**

Write `docs/LAUNCH.md` with these exact sections and facts:

```markdown
# Guardrail Wallet early-access launch

Guardrail Wallet is a self-hosted payment firewall for AI agents. An agent may request a purchase; deterministic policy and the owner decide whether it proceeds. The agent never receives owner authority.

> The public demo uses `EXECUTOR=stub` and moves no real money. It records a simulated lifecycle only.

## Try it in 60 seconds
1. Open the [live sandbox](https://patronhill.ru/dashboard).
2. Use the public owner token `guardrail-demo-owner`.
3. Submit the documented request with the public agent token `guardrail-demo-agent`.
4. Inspect the policy reason and approve or reject the request.

## Run it at home
Clone the repository, copy `.env.example`, keep `EXECUTOR=stub`, and start with Docker or `npm run dev`. Never put a mnemonic or payment credential in an agent prompt.

## What we need from early testers
- installation reports with OS, Node or Docker version, and the failing command;
- agent integrations that use the narrow request API;
- household workflows that need explicit limits and approval;
- review of the threat model and fail-closed behavior.

## Current limits
The project is early access. The hosted demo is public and resettable. The TON executor and chain guardrail are experimental and unaudited. Do not place large mainnet balances behind this software.

## Links
- [Live demo](https://patronhill.ru)
- [Documentation](https://patronhill.ru/docs)
- [API reference](https://patronhill.ru/api)
- [Security model](../SECURITY.md)
- [Repository](https://github.com/nordpaul/guardrail-wallet)
```

- [ ] **Step 2: Connect README to the launch page**

Add `Early-access launch` linking to `./docs/LAUNCH.md` in the top navigation. Replace the image CTA's `href="/docs"` with `href="https://patronhill.ru/docs"`. Add a two-sentence early-access CTA under `## Status` that directs testers to `docs/LAUNCH.md` and GitHub issues without leading with donations.

- [ ] **Step 3: Verify public URLs and Markdown whitespace**

Run: `git diff --check`

Run: `curl -fsSI https://patronhill.ru/ && curl -fsSI https://patronhill.ru/docs && curl -fsSI https://patronhill.ru/api`

Expected: diff check exits `0`; every URL returns a successful HTTP response.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/LAUNCH.md
git commit -m "docs: add early-access launch page"
```

---

### Task 3: Structured tester feedback

**Files:**
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/ISSUE_TEMPLATE/install-report.yml`
- Create: `.github/ISSUE_TEMPLATE/integration-proposal.yml`

**Interfaces:**
- Produces: labels `installation`, `integration`, and `early-access`; GitHub creates labels automatically only if they already exist, so create them with `gh label create` before relying on forms.
- Produces: private security-report link to the instructions in `SECURITY.md`.

- [ ] **Step 1: Add issue-form YAML**

`install-report.yml` must require environment, installation method, exact command, expected result, actual result, and confirmation that secrets were removed. `integration-proposal.yml` must require agent framework, payment rail/executor, household use case, requested API boundary, and security assumptions. Neither form may request wallet addresses, mnemonics, tokens, or personal payment data.

Use this contact-link configuration:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/nordpaul/guardrail-wallet/blob/main/SECURITY.md
    about: Read the private reporting instructions. Do not open a public security issue.
  - name: Live demo and documentation
    url: https://patronhill.ru/docs
    about: Verify expected demo behavior before filing an issue.
```

- [ ] **Step 2: Validate YAML using the existing dependency**

Run:

```bash
node -e 'import("yaml").then(async ({parse}) => { const {readFile} = await import("node:fs/promises"); for (const file of [".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/install-report.yml", ".github/ISSUE_TEMPLATE/integration-proposal.yml"]) parse(await readFile(file, "utf8")); })'
```

Expected: exit `0` with no parser errors.

- [ ] **Step 3: Create the labels and commit**

Run `gh label create installation --repo nordpaul/guardrail-wallet --color C9FF45 --description "Early-access installation feedback" --force`, then repeat for `integration` with color `F0643B` and `early-access` with color `172019`.

```bash
git add .github/ISSUE_TEMPLATE
git commit -m "docs: add early-access feedback forms"
```

---

### Task 4: Community-specific organic post kit

**Files:**
- Create: `docs/marketing/show-hn.md`
- Create: `docs/marketing/dev-community.md`
- Create: `docs/marketing/reddit-selfhosted.md`
- Create: `docs/marketing/reddit-localllama.md`
- Create: `docs/marketing/telegram.md`
- Create: `docs/marketing/ton-developers.md`

**Interfaces:**
- Consumes: claims and limitations from `docs/LAUNCH.md` only.
- Produces: one ready-to-preview title/body pair per channel with a unique `utm_source`.

- [ ] **Step 1: Write the developer launch drafts**

Use these titles:

```text
Show HN: Guardrail Wallet - a self-hosted payment firewall for AI agents
DEV: I gave an AI agent a payment request API, not a wallet key
r/selfhosted: Self-hosted guardrails for AI-agent purchase requests
r/LocalLLaMA: A narrow, local payment API for agents that must ask before spending
Telegram: Guardrail Wallet early access: agent requests, owner decides
TON developers: Experimental TON executor behind a self-hosted agent payment firewall
```

Each body must contain: the problem, request-policy-approval flow, one household purchase example, a demo link, repository link, explicit early-access limitation, explicit `EXECUTOR=stub`/no-real-money disclosure, and one request for technical feedback. Keep Show HN and Reddit posts under 220 words, DEV under 700 words, Telegram under 900 characters, and the TON draft under 300 words.

Use these source values exactly: `hacker_news`, `dev_community`, `reddit_selfhosted`, `reddit_localllama`, `telegram`, and `ton_community`.

- [ ] **Step 2: Run the full launch-kit validator**

Run: `npm run test:launch`

Expected: validator unit tests pass and CLI prints `Launch kit checks passed.`

- [ ] **Step 3: Review for channel fit and safety**

Run: `rg -n "real money|EXECUTOR=stub|utm_source=|utm_medium=organic|utm_campaign=guardrail_launch" docs/marketing`

Expected: every file has a stub/no-real-money disclosure and its unique campaign URL. Confirm there is no donation CTA, investment language, audit claim, or GitHub Pages URL.

- [ ] **Step 4: Commit**

```bash
git add docs/marketing package.json scripts/launch-kit.mjs scripts/launch-kit.test.mjs
git commit -m "docs: prepare organic community launch kit"
```

---

### Task 5: Reproducible demo walkthrough

**Files:**
- Create: `scripts/capture-launch-demo.mjs`
- Create: `docs/assets/guardrail-demo-walkthrough.gif` (generated)
- Modify: `package.json`
- Modify: `docs/LAUNCH.md`

**Interfaces:**
- Consumes: `DEMO_BASE_URL` defaulting to `https://patronhill.ru`, public agent token `guardrail-demo-agent`, and public owner token `guardrail-demo-owner`.
- Produces: three 1400x800 PNG frames in a temporary directory and one optimized looping GIF in `docs/assets/`.

- [ ] **Step 1: Add a capture-script smoke test**

Add a `--check` mode that validates Chromium and ImageMagick availability, confirms `/health` returns `{ "ok": true }`, and exits without creating a payment. Run `node scripts/capture-launch-demo.mjs --check` before implementing it and observe the expected missing-file failure.

- [ ] **Step 2: Implement production-demo capture**

The script must:

1. create a temporary directory with `mkdtemp`;
2. open Chromium at 1400x800 and capture the landing page;
3. call `POST /v1/payments/request` with the public agent bearer token, a unique idempotency key, recipient `EQ_DEMO_CAMPAIGN_ONLY`, amount `150 USD`, category `groceries`, and memo `Launch walkthrough / stub only`;
4. require response status `pending_approval` and a `payment_id`;
5. open `/dashboard`, fill `#token` with `guardrail-demo-owner`, click `Save`, wait for the `pending approval` badge, and capture the decision ledger;
6. click `Reject`, wait for the `rejected` badge, and capture the terminal state;
7. close Chromium in `finally` and preserve no credentials beyond the public demo constants;
8. invoke ImageMagick `convert` with delays `140,180,180`, `-layers Optimize`, and output `docs/assets/guardrail-demo-walkthrough.gif`.

- [ ] **Step 3: Expose the command and add the walkthrough**

Add `"capture:launch-demo": "node scripts/capture-launch-demo.mjs"` to `package.json`. Embed the GIF in `docs/LAUNCH.md` with alt text `Guardrail Wallet stub request, owner review, and rejection walkthrough` and a linked text fallback to `https://patronhill.ru/docs`.

- [ ] **Step 4: Verify generated output and campaign checks**

Run: `npm run capture:launch-demo`

Run: `identify docs/assets/guardrail-demo-walkthrough.gif`

Expected: three 1400x800 frames are reported and the final GIF is animated.

Run: `npm run test:e2e && npm run test:launch`

Expected: all browser checks and launch-kit checks pass.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/capture-launch-demo.mjs docs/LAUNCH.md docs/assets/guardrail-demo-walkthrough.gif
git commit -m "docs: add reproducible launch walkthrough"
```

---

### Task 6: Publish the GitHub campaign launch

**Files:**
- Create: `docs/releases/v0.1.0-alpha.1.md`
- Modify: `README.md`

**Interfaces:**
- Produces: tag and GitHub pre-release `v0.1.0-alpha.1`.
- Produces: canonical release link `https://github.com/nordpaul/guardrail-wallet/releases/tag/v0.1.0-alpha.1`.

- [ ] **Step 1: Write exact pre-release notes**

Create `docs/releases/v0.1.0-alpha.1.md` with: the one-sentence positioning, request-policy-owner flow, household purchase example, `EXECUTOR=stub`/no-real-money warning, five-minute local quickstart link, demo and walkthrough links, current TON/audit limitations, and links to both new feedback forms. End with `What we need: installation reports, agent integrations, and threat-model review.` Do not include a donation CTA.

- [ ] **Step 2: Run full pre-publication verification**

Run: `npm test`

Run: `npm run test:e2e`

Run: `npm run test:smoke`

Run: `npm run test:launch`

Run: `git diff --check`

Expected: every command exits `0`; smoke output confirms a stub payment was rejected; launch validator prints `Launch kit checks passed.`

- [ ] **Step 3: Commit and push all launch material**

```bash
git add README.md docs/releases/v0.1.0-alpha.1.md
git commit -m "docs: prepare v0.1.0 alpha launch"
git push origin main
```

- [ ] **Step 4: Create the GitHub pre-release**

Run:

```bash
gh release create v0.1.0-alpha.1 --repo nordpaul/guardrail-wallet --target main --prerelease --title "Guardrail Wallet v0.1.0 alpha - agents request, owners decide" --notes-file docs/releases/v0.1.0-alpha.1.md
```

- [ ] **Step 5: Verify the public campaign state**

Run: `gh release view v0.1.0-alpha.1 --repo nordpaul/guardrail-wallet --json isPrerelease,name,url,tagName`

Expected: `isPrerelease` is `true`, `tagName` is `v0.1.0-alpha.1`, and the URL is public.

Run: `gh api repos/nordpaul/guardrail-wallet/pages`

Expected: HTTP `404`, confirming GitHub Pages remains disabled.

Open every channel draft for owner-account preview. Do not publish through an external account without an authenticated owner session and a final check of that community's current self-promotion rules.
