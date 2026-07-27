import type { Decision, EvalContext, PaymentRequest } from "../types.js";
import type { Policy, Rule, RuleCondition } from "../policy.js";

// ---------------------------------------------------------------------------
// The policy engine. Pure and deterministic: same (request, context, policy)
// always yields the same Decision. No I/O, no clock, no chain. This is the
// security boundary's brain — everything here is unit-testable in isolation.
// ---------------------------------------------------------------------------

function deny(reason: string, rule: string | null): Decision {
  return { action: "deny", reasons: [reason], matchedRule: rule };
}

/** Does a rule's condition match this request? An empty condition matches everything. */
function matches(
  cond: RuleCondition,
  req: PaymentRequest,
  ctx: EvalContext,
  policy: Policy,
): boolean {
  const amount = req.amount.value;

  if (cond.category) {
    if (!req.category || !cond.category.includes(req.category)) return false;
  }
  if (cond.recipient_age) {
    const isNew = !ctx.recipientKnown;
    if (cond.recipient_age === "new" && !isNew) return false;
    if (cond.recipient_age === "known" && isNew) return false;
  }
  if (cond.velocity_24h_over !== undefined) {
    if (!(ctx.rolling24hTotal + amount > cond.velocity_24h_over)) return false;
  }
  if (cond.amount_over !== undefined && !(amount > cond.amount_over)) return false;
  if (cond.amount_under !== undefined && !(amount < cond.amount_under)) return false;
  if (cond.recipient_in === "allowlist" && !policy.allowlist.includes(req.recipient.address)) {
    return false;
  }
  if (cond.recipient_in === "blocklist" && !policy.blocklist.includes(req.recipient.address)) {
    return false;
  }
  return true;
}

function ruleLabel(rule: Rule, index: number): string {
  return rule.name ?? `rule[${index}]`;
}

/**
 * Evaluate a payment request against the policy.
 *
 * Order of checks (fail-closed):
 *   1. Kill switch / hard ceilings — hard limits are enforced by local policy.
 *      We reject early with a clear reason.
 *   2. Blocklist — always denies.
 *   3. Rules in order, first match wins.
 *   4. Default action if nothing matched.
 *   5. Auto-approve downgrade for trivial amounts (never downgrades a deny).
 */
export function evaluate(
  req: PaymentRequest,
  ctx: EvalContext,
  policy: Policy,
): Decision {
  const amount = req.amount.value;

  // 1. Hard ceilings — local policy guardrails. We fail fast to avoid unnecessary work.
  if (!(amount > 0)) return deny("amount must be positive", null);
  if (policy.hard_limits.kill_switch) return deny("kill switch is active", null);
  if (amount > policy.hard_limits.per_tx_max) {
    return deny(
      `amount ${amount} exceeds per_tx_max ${policy.hard_limits.per_tx_max} ` +
        `(raise the limit with the owner key to allow this)`,
      null,
    );
  }
  if (ctx.rolling24hTotal + amount > policy.hard_limits.daily_max) {
    return deny(
      `would exceed daily_max ${policy.hard_limits.daily_max} ` +
        `(spent ${ctx.rolling24hTotal} in the last 24h)`,
      null,
    );
  }

  // 2. Blocklist is absolute.
  if (policy.blocklist.includes(req.recipient.address)) {
    return deny("recipient is blocklisted", "blocklist");
  }

  // 3. First matching rule wins.
  let action = policy.default;
  let matchedRule: string | null = null;
  const reasons: string[] = [];

  for (let i = 0; i < policy.rules.length; i++) {
    const rule = policy.rules[i]!;
    if (matches(rule.if, req, ctx, policy)) {
      action = rule.then;
      matchedRule = ruleLabel(rule, i);
      reasons.push(`matched ${matchedRule} -> ${action}`);
      break;
    }
  }
  if (matchedRule === null) {
    reasons.push(`no rule matched -> default ${action}`);
  }

  // 4. Auto-approve downgrade: trivial amounts skip the human, but ONLY when the
  //    require_approval came from the `default` — never when an explicit rule
  //    (velocity guard, new-recipient, ...) asked for a human. Otherwise a flood
  //    of sub-threshold payments could slip past a security rule. Also never a
  //    deny, and (by default) never a brand-new recipient.
  if (action === "require_approval" && matchedRule === null && amount < policy.auto_approve.under) {
    const newRecipientOk = ctx.recipientKnown || policy.auto_approve.allow_new_recipient;
    if (newRecipientOk) {
      reasons.push(
        `auto-approved: amount ${amount} < auto_approve.under ${policy.auto_approve.under}`,
      );
      action = "allow";
    } else {
      reasons.push("not auto-approved: first payment to a new recipient needs a human");
    }
  }

  return { action, reasons, matchedRule };
}
