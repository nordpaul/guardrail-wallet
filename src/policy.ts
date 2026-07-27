import { z } from "zod";

// ---------------------------------------------------------------------------
// Policy schema. This is what the self-hoster edits in policy.yaml.
// Parsed from snake_case YAML and exposed as a typed, validated object.
// ---------------------------------------------------------------------------

const ruleConditionSchema = z
  .object({
    category: z.array(z.string()).optional(),
    recipient_age: z.enum(["new", "known"]).optional(),
    velocity_24h_over: z.number().nonnegative().optional(),
    amount_over: z.number().nonnegative().optional(),
    amount_under: z.number().nonnegative().optional(),
    recipient_in: z.enum(["allowlist", "blocklist"]).optional(),
  })
  .strict();

const ruleSchema = z
  .object({
    name: z.string().optional(),
    if: ruleConditionSchema.default({}),
    then: z.enum(["allow", "deny", "require_approval"]),
  })
  .strict();

export const policySchema = z
  .object({
    currency_display: z.string().default("USD"),
    chain: z.string().default("ton"),

    hard_limits: z
      .object({
        per_tx_max: z.number().positive(),
        daily_max: z.number().positive(),
        kill_switch: z.boolean().default(false),
      })
      .strict(),

    auto_approve: z
      .object({
        under: z.number().nonnegative().default(0),
        // Whether a small payment to a brand-new recipient may skip approval.
        // Default false: the first payment to anyone always asks a human.
        allow_new_recipient: z.boolean().default(false),
      })
      .strict()
      .default({ under: 0, allow_new_recipient: false }),

    rules: z.array(ruleSchema).default([]),
    default: z.enum(["allow", "deny", "require_approval"]).default("require_approval"),

    allowlist: z.array(z.string()).default([]),
    blocklist: z.array(z.string()).default([]),

    telegram: z
      .object({
        owner_chat_id: z.number().int(),
        approval_timeout_sec: z.number().positive().default(600),
      })
      .strict(),
  })
  .strict();

export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type Policy = z.infer<typeof policySchema>;
