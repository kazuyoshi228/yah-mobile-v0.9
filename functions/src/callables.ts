import * as logger from "firebase-functions/logger";
/**
 * functions/src/callables.ts — Consolidated Firebase HTTPS Callable Functions (APIs)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth, requireAdmin, zodError } from "./_helpers";
import {
  collections,
  db,
  getEsimLinkByUuid,
  getOrderById,
  updateOrder,
  getUserByUid,
} from "./db";
import { invokeLLM } from "./llm";
import { createCheckoutSession, validateOrigin } from "./stripe";
import { enforceRateLimit } from "./rateLimit";

// シークレット宣言は secrets.ts に一元化（P1-1）
import {
  stripeSecretKey,
  stripeWebhookSecret,
  omaxClientId,
  omaxClientSecret,
  forgeApiKey,
} from "./secrets";

const REGION = "asia-northeast1";

// ─── Zod Input Schemas ──────────────────────────────────────────────────────────

import {
  GetAiInsightsInput,
  OrderRetryPaymentInput,
  SubmitContactInquiryInput,
  OrdersInitCheckoutInput,
  OrdersInitTopupCheckoutInput,
  AdminRefundOrderInput
} from "../../shared/schemas";
import { executeRefund } from "./refund";
import { assertProviderAvailable } from "./salesStopGuard";
import { esimAccessCode, esimSecretKey } from "./secrets";

// Admin APIs are fully removed and replaced by direct BaaS + Firestore Rules

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const PERIOD_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

function periodSinceMs(period: string): number {
  const hours = PERIOD_HOURS[period] ?? 720;
  return Date.now() - hours * 60 * 60 * 1000;
}

interface AnalyticsEventDoc {
  id: string;
  eventName: string;
  sessionId?: string | null;
  userId?: string | null;
  page?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  language?: string | null;
  properties?: Record<string, unknown>;
  createdAt: number;
}

// ─── Auth Callables (Removed: pure BaaS) ──────────────────────────────────────


// ─── Admin APIs ──────────────────────────────────────────────────────────────
// (All Admin Callable Functions have been removed in favor of BaaS First architecture
// combined with Firestore security rules and background triggers)

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsGetAiInsights = onCall({ region: REGION, enforceAppCheck: true, timeoutSeconds: 120, secrets: [forgeApiKey] }, async (request) => {
  const { uid } = await requireAdmin(request);
  // LLM課金の暴走防止: 管理者UID単位で1時間20回まで
  await enforceRateLimit(`aiinsights:${uid}`, 20, 3600);
  const parsed = GetAiInsightsInput.safeParse(request.data ?? {});
  if (!parsed.success) throw zodError(parsed.error.message);
  const period = parsed.data.period;
  const sinceMs = periodSinceMs(period);

  const [eventsSnap, aiLogsSnap, recLogsSnap] = await Promise.all([
    collections.analyticsEvents.where("createdAt", ">=", sinceMs).get(),
    collections.aiReferrerLogs.where("createdAt", ">=", sinceMs).get(),
    collections.recommendLogs.where("createdAt", ">=", sinceMs).get(),
  ]);
  const events: AnalyticsEventDoc[] = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEventDoc));
  const aiLogs = aiLogsSnap.docs.map((d) => ({ botName: d.data().botName as string }));
  const recLogs = recLogsSnap.docs;

  const totalEvents = events.length;
  const pageViews = events.filter((e) => e.eventName === "page_view").length;
  const planSelects = events.filter((e) => e.eventName === "plan_select").length;
  const orders = events.filter((e) => e.eventName === "order_complete").length;
  const uniqueVisitors = new Set(events.map((e) => e.sessionId).filter(Boolean)).size;
  const cvr = uniqueVisitors > 0 ? ((orders / uniqueVisitors) * 100).toFixed(2) : "0.00";
  const aiBotVisits = aiLogs.length;
  const uniqueBots = new Set(aiLogs.map((l) => l.botName)).size;
  const recommendCalls = recLogs.length;

  const channelCounts: Record<string, number> = {};
  for (const ev of events.filter((e) => e.eventName === "page_view")) {
    const ref = ev.referrer ?? "";
    let ch = "Direct";
    if (/google\./i.test(ref)) ch = "Google";
    else if (/instagram/i.test(ref)) ch = "Instagram";
    else if (/t\.co|twitter|x\.com/i.test(ref)) ch = "Twitter/X";
    else if (/facebook|fb\.com/i.test(ref)) ch = "Facebook";
    else if (ref) ch = "Other";
    channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
  }
  const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";

  const summaryText = `
yah.mobile Analytics Summary (${period}):
- Total Events: ${totalEvents}
- Page Views: ${pageViews}
- Unique Visitors: ${uniqueVisitors}
- Plan Selects: ${planSelects}
- Orders: ${orders}
- CVR: ${cvr}%
- Top Traffic Channel: ${topChannel}
- AI Bot Visits: ${aiBotVisits} (${uniqueBots} unique bots)
- Recommend API Calls: ${recommendCalls}
`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a data analyst for yah.mobile, a Japan eSIM service. Analyze the provided analytics data and give actionable insights in 3-5 bullet points. Focus on: conversion opportunities, traffic patterns, AI bot engagement, and specific recommendations. Be concise and specific. Respond in Japanese.",
      },
      { role: "user", content: summaryText },
    ],
  });
  // LLM 出力は長さ制限（異常に長い応答が Firestore 保存/UI に影響しないよう上限5000文字）
  const insight = (response.choices?.[0]?.message?.content ?? "インサイトを生成できませんでした。").slice(0, 5000);

  const last24hMs = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = events.filter((e) => e.createdAt > last24hMs).length;
  const dailyCounts: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const dayStart = Date.now() - i * 24 * 60 * 60 * 1000;
    const dayEnd = Date.now() - (i - 1) * 24 * 60 * 60 * 1000;
    dailyCounts.push(events.filter((e) => e.createdAt >= dayStart && e.createdAt < dayEnd).length);
  }
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / (dailyCounts.length || 1);
  const variance = dailyCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (dailyCounts.length || 1);
  const stdDev = Math.sqrt(variance);
  const anomaly =
    stdDev > 0 && last24h > mean + 2 * stdDev
      ? {
          detected: true,
          message: `直近24hのイベント数(${last24h})が通常の2σを超えています（平均: ${mean.toFixed(1)}, σ: ${stdDev.toFixed(1)}）`,
        }
      : { detected: false, message: null };

  return { insight, anomaly, summaryText, generatedAt: new Date().toISOString() };
});

// (analyticsLogAiReferrer removed in favor of BaaS)

// ─── AI First ─────────────────────────────────────────────────────────────────

// ─── Exchange Rates (Removed: pure BaaS) ──────────────────────────────────────

// ─── Incident（P1-3 で incidentRunRetryNow を削除）────────────────────────────
// 手動リトライUI（旧 /admin/incident）は廃止。リトライは esimRetryJob（5分毎）が自動実行する。
// 一回限りの移行 adminMigrateIsActiveToBoolean も移行完了により削除（P1-2）。

// ─── orderRetryPayment ────────────────────────────────────────────────────────
// pending状態の注文に対して新しいStripe Checkoutセッションを発行し、
// checkoutUrlを返す。フロントエンドはそのURLに遷移して再決済を行う。



export const orderRetryPayment = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 120,
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (request) => {
    const { uid } = await requireAuth(request);

    const parsed = OrderRetryPaymentInput.safeParse(request.data ?? {});
    if (!parsed.success) throw zodError(parsed.error.message);
    const { orderId, origin } = parsed.data;

    try {
      // 注文取得 & 所有者確認
      const order = await getOrderById(orderId, uid);
      if (!order) {
        throw new HttpsError("not-found", "注文が見つかりません。");
      }
      if (order.userId !== uid) {
        throw new HttpsError("permission-denied", "この注文へのアクセス権限がありません。");
      }
      if (order.status !== "pending") {
        throw new HttpsError("failed-precondition", `この注文は再決済できません（status: ${order.status}）。`);
      }

      // ユーザー情報取得
      const user = await getUserByUid(uid);
      const userEmail = user?.email ?? "";
      const userName = user?.name ?? "";

      // 既存のStripeセッションが有効かチェック（あれば再利用）
      if (order.checkoutUrl && order.stripeSessionId) {
        logger.info(`[orderRetryPayment] Reusing existing checkout URL for order: ${orderId}`);
        return { checkoutUrl: order.checkoutUrl };
      }

      // 新しいStripe Checkoutセッションを作成
      const validatedOrigin = validateOrigin(origin);
      const { sessionId, checkoutUrl } = await createCheckoutSession({
        orderId,
        planId: order.planId,
        bappyPlanId: order.bappyPlanId,
        amountJpy: order.amountJpy,
        planName: order.planName ?? "Japan eSIM",
        userId: uid,
        userEmail,
        userName,
        stripeCustomerId: user?.stripeCustomerId ?? undefined,
        origin: validatedOrigin,
        ...(order.orderType === "topup" && order.esimLinkUuid
          ? { extraMetadata: { order_type: "topup", esim_link_uuid: order.esimLinkUuid } }
          : {}),
      });

      // Firestoreの注文にセッション情報を更新
      await updateOrder(orderId, { stripeSessionId: sessionId, checkoutUrl });

      logger.info(`[orderRetryPayment] New checkout session created for order: ${orderId}, url: ${checkoutUrl}`);
      return { checkoutUrl };
    } catch (e: any) {
      logger.error("[orderRetryPayment] Error:", e);
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "内部サーバーエラーが発生しました。");
    }
  }
);
// ─── Contact Inquiries ────────────────────────────────────────────────────────



export const submitContactInquiry = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  logger.info("[Contact] Start parsing input");
  const parsed = SubmitContactInquiryInput.safeParse(request.data ?? {});
  if (!parsed.success) {
    // 不正/ボットのペイロード拒否は正常動作。Error Reporting のノイズを避けるため warn に留める。
    logger.warn("[Contact] Zod parse failed (rejected malformed input):", parsed.error.message);
    throw zodError(parsed.error.message);
  }
  
  const data = parsed.data;
  logger.info("[Contact] Input parsed successfully", data);
  
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
  logger.info(`[Contact] Checking rate limit for IP: ${ipAddress}`);
  if (ipAddress !== "unknown") {
    try {
      const oneHourAgo = now - 60 * 60 * 1000;
      const snap = await collections.contactInquiries
        .where("ipAddress", "==", ipAddress)
        .where("createdAt", ">=", oneHourAgo)
        .get();
        
      if (snap.size >= 3) {
        logger.warn(`[Contact] Rate limit exceeded. IP: ${ipAddress}`);
        throw new HttpsError("resource-exhausted", "Too many requests. Please try again later.");
      }
    } catch (dbErr) {
      logger.error("[Contact] Rate limiting DB check failed", dbErr);
      throw new HttpsError("internal", "Rate limit check failed");
    }
  }

  // 4. Save to Firestore
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
      ipAddress,
      createdAt: now,
      updatedAt: now,
    };
    logger.info("[Contact] Firestore payload:", payload);
    
    await collections.contactInquiries.add(payload);
    
    logger.info("[Contact] Successfully saved to Firestore");
    return { success: true };
  } catch (err: any) {
    logger.error("[Contact] Failed to save inquiry to Firestore", err);
    throw new HttpsError("internal", "Failed to save inquiry.");
  }
});

// ─── ordersInitCheckout ───────────────────────────────────────────────────────
// 購入フロー高速化: Firestoreトリガー（間接通信）の代わりに
// Callable Function（直接通信）で注文作成 + Stripe Checkout Session を一括生成。
// 所要時間: 3〜10秒+ → 1〜3秒 に短縮。



export const ordersInitCheckout = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 120,
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (request) => {
    // 1. 認証チェック（ログイン必須 + メールホワイトリスト検証済み）
    const { uid, user } = await requireAuth(request);
    // クレカマスター/クラウド破産対策: UID単位で1時間10回まで
    await enforceRateLimit(`checkout:${uid}`, 10, 3600);
    const userEmail = user.email ?? "";
    const userName = user.name ?? "";

    // 2. 入力バリデーション
    const parsed = OrdersInitCheckoutInput.safeParse(request.data ?? {});
    if (!parsed.success) throw zodError(parsed.error.message);
    const { bappyPlanId, origin, termsConsented, privacyConsented, marketingConsented, timezone, language } = parsed.data;

    // 3. プラン取得・検証（Firestoreから直接）
    const plansSnap = await db.collection("plans")
      .where("bappyPlanId", "==", bappyPlanId)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (plansSnap.empty) {
      throw new HttpsError("not-found", "指定されたプランが見つかりません。");
    }
    const planDoc = plansSnap.docs[0];
    const plan = planDoc.data();

    // 3.5 販売停止ガード（柱2）：発行元プロバイダがダウン中なら課金前に弾く。
    await assertProviderAvailable(plan.provider ?? "bappy");

    // 4. Firestoreに注文レコードを作成（status: "pending"）
    const now = Date.now();
    const orderRef = await db.collection("orders").add({
      userId: uid,
      planId: planDoc.id,
      bappyPlanId: plan.bappyPlanId,
      // 柱2: プラン由来のプロバイダで発注を routing（未設定の既存Bappyプランは "bappy"）
      provider: plan.provider ?? "bappy",
      status: "pending",
      amountJpy: plan.priceJpy,
      planName: plan.name,
      hiddenByUser: false,
      orderType: "initial",
      origin,
      purchaseTimezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: language || null,
      termsConsented,
      privacyConsented,
      marketingConsented,
      createdAt: now,
      updatedAt: now,
    });
    const orderId = orderRef.id;

    // 5. Stripe Checkout Session を作成
    try {
      const validatedOrigin = validateOrigin(origin);
      const { sessionId, checkoutUrl } = await createCheckoutSession({
        orderId,
        planId: planDoc.id,
        bappyPlanId: plan.bappyPlanId,
        amountJpy: plan.priceJpy,
        planName: plan.name,
        userId: uid,
        userEmail,
        userName,
        stripeCustomerId: user.stripeCustomerId ?? undefined,
        origin: validatedOrigin,
      });

      // 6. 注文にStripeセッション情報を書き込み
      await updateOrder(orderId, { stripeSessionId: sessionId, checkoutUrl });

      // 7. 同意記録の保存（APPI/GDPR対応）
      const ipAddress = request.rawRequest?.ip ?? undefined;
      const userAgent = request.rawRequest?.headers?.["user-agent"] ?? undefined;
      await collections.userConsents.add({
        userId: uid,
        consentType: "purchase",
        version: "2026-07-02",
        granted: true,
        termsGranted: termsConsented,
        privacyGranted: privacyConsented,
        marketingGranted: marketingConsented,
        ipAddress: ipAddress ?? null,
        userAgent: (Array.isArray(userAgent) ? userAgent[0] : userAgent) ?? null,
        consentedAt: now,
      });

      logger.info(`[ordersInitCheckout] Checkout session created for order: ${orderId}, url: ${checkoutUrl}`);
      return { checkoutUrl, orderId };
    } catch (err: any) {
      // Stripe失敗時は注文をcancelledに更新
      await updateOrder(orderId, { status: "cancelled" });
      logger.error(`[ordersInitCheckout] Failed for order: ${orderId}`, err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "決済の初期化に失敗しました。");
    }
  }
);

// ─── ordersInitTopupCheckout ──────────────────────────────────────────────────
// トップアップ注文の作成とStripe Checkout Sessionの一括生成



export const ordersInitTopupCheckout = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 120,
    secrets: [stripeSecretKey, stripeWebhookSecret, omaxClientId, omaxClientSecret],
  },
  async (request) => {
    const { uid, user } = await requireAuth(request);
    // クレカマスター/クラウド破産対策: UID単位で1時間10回まで
    await enforceRateLimit(`topup:${uid}`, 10, 3600);
    const userEmail = user.email ?? "";
    const userName = user.name ?? "";

    const parsed = OrdersInitTopupCheckoutInput.safeParse(request.data ?? {});
    if (!parsed.success) throw zodError(parsed.error.message);
    const { esimLinkUuid, bappyPlanId, origin, timezone, language } = parsed.data;

    // 所有権チェック（IDOR防止）: 対象のeSIMが本人のものであることを検証する。
    // これがないと他人のesimLinkUuidを指定して他ユーザーのeSIMにデータを追加できてしまう。
    const targetEsim = await getEsimLinkByUuid(esimLinkUuid);
    if (!targetEsim || targetEsim.userId !== uid) {
      throw new HttpsError("permission-denied", "この eSIM へのトップアップ権限がありません。");
    }

    // Firestore からプラン取得
    const planSnap = await collections.plans.where("bappyPlanId", "==", bappyPlanId).where("planType", "==", "topup").limit(1).get();
    if (planSnap.empty) {
      throw new HttpsError("not-found", "トップアッププランが見つかりません。");
    }
    
    const topupPlan = planSnap.docs[0].data();
    const planDocId = planSnap.docs[0].id;
    const amountJpy = topupPlan.priceJpy;
    const planName = topupPlan.name;

    // 販売停止ガード（柱2）：対象eSIMのプロバイダがダウン中なら課金前に弾く。
    await assertProviderAvailable(targetEsim.provider ?? topupPlan.provider ?? "bappy");

    // Firestoreに注文レコードを作成
    const now = Date.now();
    const orderRef = await db.collection("orders").add({
      userId: uid,
      planId: planDocId,
      bappyPlanId: bappyPlanId,
      esimLinkUuid,
      // 柱2: topup は対象eSIMのプロバイダに合わせる（無ければプラン→bappy の順でフォールバック）
      provider: targetEsim.provider ?? topupPlan.provider ?? "bappy",
      status: "pending",
      amountJpy,
      planName,
      hiddenByUser: false,
      orderType: "topup",
      origin,
      purchaseTimezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: language || null,
      createdAt: now,
      updatedAt: now,
    });
    const orderId = orderRef.id;

    // Stripe Checkout Session を作成
    try {
      const validatedOrigin = validateOrigin(origin);
      const { sessionId, checkoutUrl } = await createCheckoutSession({
        orderId,
        planId: planDocId,
        bappyPlanId,
        amountJpy,
        planName,
        userId: uid,
        userEmail,
        userName,
        stripeCustomerId: user.stripeCustomerId ?? undefined,
        origin: validatedOrigin,
        extraMetadata: { order_type: "topup", esim_link_uuid: esimLinkUuid },
      });

      // 注文にStripeセッション情報を書き込み
      await updateOrder(orderId, { stripeSessionId: sessionId, checkoutUrl });

      logger.info(`[ordersInitTopupCheckout] Checkout session created for order: ${orderId}, url: ${checkoutUrl}`);
      return { checkoutUrl, orderId };
    } catch (err: any) {
      await updateOrder(orderId, { status: "cancelled" });
      logger.error(`[ordersInitTopupCheckout] Failed for order: ${orderId}`, err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "決済の初期化に失敗しました。");
    }
  }
);

// ─── adminRefundOrder（Lane B・管理画面の返金ボタン） ──────────────────────────────
// /admin 返金タブの「返金する」ボタンから呼ぶ。App Check ＋ admin claims 必須。
// 実際の返金は executeRefund → Stripe。確定/顧客通知/返金メールは charge.refunded webhook。
// キルスイッチ（Lane A自動）の対象外＝人間の判断なので常に実行できる。
export const adminRefundOrder = onCall(
  { region: REGION, enforceAppCheck: true, secrets: [stripeSecretKey, esimAccessCode, esimSecretKey] },
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
