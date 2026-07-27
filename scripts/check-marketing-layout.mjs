#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function boxesFor(file) {
  const output = execFileSync("inkscape", [file, "--query-all"], {
    cwd: root,
    encoding: "utf8",
  });

  return new Map(
    output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [id, x, y, width, height] = line.split(",");
        return [id, { x: +x, y: +y, width: +width, height: +height }];
      }),
  );
}

function requireBox(boxes, id) {
  assert(boxes.has(id), `missing SVG layout anchor: ${id}`);
  return boxes.get(id);
}

function assertLeftOf(left, right, gap, message) {
  assert(
    left.x + left.width + gap <= right.x,
    `${message}: right edge ${left.x + left.width}, next block starts ${right.x}`,
  );
}

function assertAbove(top, bottom, gap, message) {
  assert(
    top.y + top.height + gap <= bottom.y,
    `${message}: bottom edge ${top.y + top.height}, next block starts ${bottom.y}`,
  );
}

const banner = boxesFor("docs/assets/guardrail-banner-v2.svg");
const bannerCopy = requireBox(banner, "banner-copy");
const bannerPanel = requireBox(banner, "banner-panel");
const bannerSteps = requireBox(banner, "banner-panel-steps");
const bannerPolicy = requireBox(banner, "banner-panel-policy");
const bannerExecutor = requireBox(banner, "banner-panel-executor");
const bannerFooter = requireBox(banner, "banner-footer");

assertLeftOf(bannerCopy, bannerPanel, 36, "banner columns overlap");
assertAbove(bannerSteps, bannerPolicy, 16, "banner panel steps overlap policy");
assertAbove(bannerPolicy, bannerExecutor, 16, "banner panel policy overlaps executor");
assertAbove(bannerPanel, bannerFooter, 28, "banner panel overlaps footer");

const donate = boxesFor("docs/assets/guardrail-donate-v2.svg");
const donateCopy = requireBox(donate, "donate-copy");
const donatePanel = requireBox(donate, "donate-panel");
const donateFooter = requireBox(donate, "donate-footer");

assertLeftOf(donateCopy, donatePanel, 44, "support card columns overlap");
assertAbove(donatePanel, donateFooter, 24, "support panel overlaps footer");

console.log("Marketing SVG layout checks passed.");
