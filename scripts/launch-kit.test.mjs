import assert from "node:assert/strict";
import test from "node:test";
import { validateCopy } from "./launch-kit.mjs";

test("rejects copy without the stub disclosure", () => {
  const issues = validateCopy(
    "docs/marketing/show-hn.md",
    "Try https://patronhill.ru/?utm_source=hacker_news&utm_medium=organic&utm_campaign=guardrail_launch"
  );
  assert(issues.some((issue) => issue.includes("stub-executor disclosure")));
});

test("rejects the disabled GitHub Pages origin", () => {
  const issues = validateCopy(
    "docs/LAUNCH.md",
    "EXECUTOR=stub moves no real money. https://nordpaul.github.io/guardrail-wallet/"
  );
  assert(issues.some((issue) => issue.includes("GitHub Pages")));
});

test("accepts canonical campaign copy", () => {
  const copy =
    "The public demo uses EXECUTOR=stub and moves no real money. https://patronhill.ru/?utm_source=hacker_news&utm_medium=organic&utm_campaign=guardrail_launch";
  assert.deepEqual(validateCopy("docs/marketing/show-hn.md", copy), []);
});
