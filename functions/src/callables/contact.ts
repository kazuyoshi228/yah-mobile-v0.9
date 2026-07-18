import * as logger from "firebase-functions/logger";
/**
 * callables/contact.ts — 問い合わせ Callable（P3・callables.ts から無編集移動）
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { zodError } from "../_helpers";
import { collections, getOrderById } from "../db";
import { SubmitContactInquiryInput } from "../../../shared/schemas";

const REGION = "asia-northeast1";

export const submitContactInquiry = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  logger.info("[Contact] Start parsing input");
  const parsed = SubmitContactInquiryInput.safeParse(request.data ?? {});
  if (!parsed.success) {
    // 不正/ボットのペイロード拒否は正常動作。Error Reporting のノイズを避けるため warn に留める。
    logger.warn("[Contact] Zod parse failed (rejected malformed input):", parsed.error.message);
    throw zodError(parsed.error.message);
  }

  const data = parsed.data;
  // PII（氏名・メール・本文）はログに残さない
  logger.info("[Contact] Input parsed successfully", { category: data.category, language: data.language });

  // 1. Honeypot Check
  if (data._hp && data._hp.length > 0) {
    logger.warn(`[Contact] Honeypot triggered. IP: ${request.rawRequest?.ip}`);
    throw new HttpsError("invalid-argument", "Spam detected.");
  }

  // 2. Submission Interval Check
  const now = Date.now();
  if (now - data.formStartTime < 1000) {
    logger.warn(`[Contact] Form submitted too fast (${now - data.formStartTime}ms). IP: ${request.rawRequest?.ip}`);
    throw new HttpsError("invalid-argument", "Spam detected.");
  }

  // 3. Rate Limiting Check (IP based, max 3 per hour)
  const ipAddress = request.rawRequest?.ip ?? "unknown";
  logger.info("[Contact] Checking rate limit");
  if (ipAddress !== "unknown") {
    // 件数取得だけを try/catch する。超過時の throw を catch の外に置かないと、
    // resource-exhausted が自分の catch に捕まって internal(500) に化ける。
    let recentCount: number;
    try {
      const oneHourAgo = now - 60 * 60 * 1000;
      const snap = await collections.contactInquiries
        .where("ipAddress", "==", ipAddress)
        .where("createdAt", ">=", oneHourAgo)
        .get();
      recentCount = snap.size;
    } catch (dbErr) {
      logger.error("[Contact] Rate limiting DB check failed", dbErr);
      throw new HttpsError("internal", "Rate limit check failed");
    }

    if (recentCount >= 3) {
      logger.warn(`[Contact] Rate limit exceeded. IP: ${ipAddress}`);
      throw new HttpsError("resource-exhausted", "Too many requests. Please try again later.");
    }
  }

  // 4. 注文スナップショット（refund等の対応用）: orderId が本人の注文なら
  //    プラン名/金額等をサーバ側で確定して保存する（クライアント値は信用しない）。
  let orderSnapshot: Record<string, unknown> | null = null;
  if (data.orderId && request.auth?.uid) {
    try {
      const order = await getOrderById(data.orderId, request.auth.uid); // 所有者不一致は null
      if (order) {
        orderSnapshot = {
          planName: order.planName ?? null,
          amountJpy: order.amountJpy ?? null,
          status: order.status ?? null,
          orderType: order.orderType ?? null,
          createdAt: order.createdAt ?? null,
        };
      }
    } catch (err) {
      logger.warn("[Contact] orderSnapshot lookup failed (continuing without it)", err);
    }
  }

  // 5. Save to Firestore
  logger.info("[Contact] Preparing to save to Firestore");
  try {
    const payload = {
      name: data.name || null,
      email: data.email,
      location: data.location || null,
      category: data.category || null,
      detail: data.detail || null,
      message: data.message,
      status: "pending",
      userId: request.auth?.uid || null,
      orderId: data.orderId || null,
      orderSnapshot, // 本人所有が確認できた注文のみ（admin/inquiries で表示）
      language: data.language || null, // 自動返信メールの言語判定（onContactCreated が参照）
      ipAddress,
      createdAt: now,
      updatedAt: now,
    };
    // PII（氏名・メール・本文・IP）を含む payload 全体はログに残さない
    logger.info("[Contact] Saving inquiry", { category: payload.category, language: payload.language });

    await collections.contactInquiries.add(payload);

    logger.info("[Contact] Successfully saved to Firestore");
    return { success: true };
  } catch (err: any) {
    logger.error("[Contact] Failed to save inquiry to Firestore", err);
    throw new HttpsError("internal", "Failed to save inquiry.");
  }
});
