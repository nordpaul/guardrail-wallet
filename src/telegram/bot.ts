import { Bot, InlineKeyboard } from "grammy";
import type { Notifier } from "../service.js";
import type { PaymentService } from "../service.js";
import type { Policy } from "../policy.js";
import type { EvalContext, PaymentRecord } from "../types.js";

// ---------------------------------------------------------------------------
// The human-in-the-loop layer. Posts an approval card to the owner's chat and
// turns button taps into decisions. Locked to a single owner chat id — no one
// else can approve, even if they find the bot.
// ---------------------------------------------------------------------------

function money(rec: PaymentRecord): string {
  return `${rec.amount} ${rec.currency}`;
}

export class TelegramNotifier implements Notifier {
  private readonly bot: Bot;
  private readonly ownerChatId: number;

  constructor(
    botToken: string,
    private readonly policy: Policy,
    private readonly service: PaymentService,
  ) {
    this.bot = new Bot(botToken);
    this.ownerChatId = policy.telegram.owner_chat_id;

    // Only the owner chat may drive decisions.
    this.bot.on("callback_query:data", async (ctx) => {
      if (ctx.chat?.id !== this.ownerChatId) {
        await ctx.answerCallbackQuery({ text: "Not authorized." });
        return;
      }
      const data = ctx.callbackQuery.data; // "approve:<id>" | "reject:<id>"
      const [action, paymentId] = data.split(":");
      const approved = action === "approve";

      const ok = this.service.resolveApproval(paymentId!, approved);
      await ctx.answerCallbackQuery({
        text: ok ? (approved ? "Approved" : "Rejected") : "Already resolved or expired.",
      });
      if (ok) {
        await ctx.editMessageText(
          `${approved ? "✅ Approved" : "❌ Rejected"} — ${paymentId}`,
        ).catch(() => {});
      }
    });
  }

  async start(): Promise<void> {
    // Long polling. For production behind a domain you'd switch to webhooks.
    void this.bot.start();
  }

  async notifyApprovalNeeded(rec: PaymentRecord, ctx: EvalContext): Promise<void> {
    const newRecipient = !ctx.recipientKnown;
    const remaining = this.policy.hard_limits.daily_max - ctx.rolling24hTotal;

    const lines = [
      "🧾 *Payment needs your approval*",
      "",
      `*Amount:* ${money(rec)}`,
      `*To:* \`${rec.recipientAddress}\`${rec.merchantId ? ` (${rec.merchantId})` : ""}`,
      newRecipient ? "🔴 *NEW recipient — never paid before*" : "🟢 known recipient",
      rec.category ? `*Category:* ${rec.category}` : null,
      rec.memo ? `*Memo:* ${rec.memo}` : null,
      "",
      `_Daily budget left:_ ${remaining} ${this.policy.currency_display}`,
      `_Reason:_ ${rec.decision.reasons.join("; ")}`,
    ].filter(Boolean) as string[];

    const keyboard = new InlineKeyboard()
      .text("✅ Approve", `approve:${rec.id}`)
      .text("❌ Reject", `reject:${rec.id}`);

    await this.bot.api.sendMessage(this.ownerChatId, lines.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }

  async notifyResolved(rec: PaymentRecord): Promise<void> {
    const status =
      rec.status === "executed"
        ? `✅ Sent (${rec.txHash})`
        : rec.status === "failed"
          ? "⚠️ Failed to settle on-chain"
          : "❌ Rejected";
    await this.bot.api
      .sendMessage(this.ownerChatId, `Payment ${rec.id}: ${status}`)
      .catch(() => {});
  }
}
