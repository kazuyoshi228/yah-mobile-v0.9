import * as logger from "firebase-functions/logger";
/**
 * callables/refunds.ts — 返金 Callable（P3・callables.ts から無編集移動）
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin, zodError } from "../_helpers";
import { executeRefund } from "../refund";
import { stripeSecretKey, esimAccessCode, esimSecretKey, gmailUser, gmailPass, ownerEmail, forgeApiKey, slackWebhookUrl } from "../secrets";
import { AdminRefundOrderInput } from "../../../shared/schemas";

const REGION = "asia-northeast1";

// ─── adminRefundOrder（Lane B・管理画面の返金ボタン） ──────────────────────────────
// /admin 返金タブの「返金する」ボタンから呼ぶ。App Check ＋ admin claims 必須。
// 実際の返金は executeRefund → Stripe。確定/顧客通知/返金メールは charge.refunded webhook。
// キルスイッチ（Lane A自動）の対象外＝人間の判断なので常に実行できる。
export const adminRefundOrder = onCall(
  // 通知系secrets: 返金失敗時の notifyOwner（メールフォールバック含む）に必須
  { region: REGION, enforceAppCheck: true, secrets: [stripeSecretKey, esimAccessCode, esimSecretKey, gmailUser, gmailPass, ownerEmail, forgeApiKey, slackWebhookUrl] },
  async (request) => {
    await requireAdmin(request);

    const parsed = AdminRefundOrderInput.safeParse(request.data ?? {});
    if (!parsed.success) throw zodError(parsed.error.message);
    const { orderId, reason } = parsed.data;

    const result = await executeRefund(orderId, reason || "manual");
    if (!result.ok) {
      throw new HttpsError("internal", `返金に失敗しました: ${result.error ?? "unknown"}`);
    }
    logger.info(`[adminRefundOrder] Refund triggered for order ${orderId} by admin`);
    return { ok: true };
  }
);
