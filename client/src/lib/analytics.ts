/**
 * analytics.ts — yah.mobile フロントエンドイベントトラッカー
 *
 * 使い方:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("plan_tab_click", { planId: "3day-1gb", tab: "3days" });
 *
 * セッションIDはsessionStorageに保存し、タブを閉じるまで維持する。
 * イベントはバッチ送信（最大10件 or 3秒ごと）でサーバーへ送る。
 */

const SESSION_KEY = "yah_session_id";

/** UUID v4 を生成する */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** セッションIDを取得（なければ生成して保存） */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export interface AnalyticsEventPayload {
  eventName: string;
  properties?: Record<string, unknown>;
  page?: string;
}

interface QueuedEvent extends AnalyticsEventPayload {
  sessionId: string;
  referrer: string;
  userAgent: string;
  language: string;
  timestamp: number;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 3000;

function hasCookieConsent(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const stored = localStorage.getItem("yah_cookie_consent");
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.value === "accepted" && parsed.version === "1";
  } catch {
    return false;
  }
}

let umamiLoaded = false;
/**
 * サードパーティ解析(umami)スクリプトを Cookie 同意後にのみ動的ロードする。
 * 同意前・拒否時には一切ロードしない（GDPR/APPI・サプライチェーンリスク低減）。
 * 同意済みユーザーのために起動時、および同意ボタン押下時に呼ぶ。
 */
export function loadUmamiIfConsented(): void {
  if (umamiLoaded) return;
  if (typeof document === "undefined") return;
  if (!hasCookieConsent()) return;

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;
  if (!endpoint || !websiteId) return; // 未設定なら読み込まない

  umamiLoaded = true;
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/$/, "")}/umami`;
  script.setAttribute("data-website-id", websiteId);
  document.head.appendChild(script);
}

// Clarity プロジェクトID は GA 測定ID と同様の公開値（シークレットではない）
const CLARITY_PROJECT_ID = "xog2mdmmmn";

let clarityLoaded = false;
/**
 * Microsoft Clarity（セッション録画・スクロールヒートマップ）を Cookie 同意後にのみ
 * 動的ロードする。同意前・拒否時には一切ロードしない（umami と同じ方針）。
 * 画面上の個人情報はダッシュボード側の Strict masking ＋ data-clarity-mask で除外する。
 */
export function loadClarityIfConsented(): void {
  if (clarityLoaded) return;
  if (typeof document === "undefined") return;
  if (!hasCookieConsent()) return;

  clarityLoaded = true;
  // 公式スニペット同等: ロード完了前の呼び出しをキューする stub を先に用意
  type ClarityFn = { (...args: unknown[]): void; q?: unknown[][] };
  const w = window as unknown as { clarity?: ClarityFn };
  if (!w.clarity) {
    const stub: ClarityFn = (...args: unknown[]) => {
      (stub.q = stub.q || []).push(args);
    };
    w.clarity = stub;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
  document.head.appendChild(script);
}

/** イベントをキューに追加し、バッチ送信をスケジュールする */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  page?: string,
): void {
  if (!hasCookieConsent()) return;

  const event: QueuedEvent = {
    eventName,
    properties: properties ?? {},
    page: page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    sessionId: getSessionId(),
    referrer: typeof document !== "undefined" ? document.referrer : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language:
      typeof navigator !== "undefined"
        ? (navigator.language ?? "").slice(0, 16)
        : "",
    timestamp: Date.now(),
  };

  queue.push(event);

  if (queue.length >= BATCH_SIZE) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
  }
}

/** キューのイベントをサーバーへ送信する */
async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  const batch = queue.splice(0, BATCH_SIZE);

  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ events: batch }),
      // keepalive: ページ離脱時にも送信を完了させる
      keepalive: true,
    });
  } catch {
    // ネットワークエラーは無視（分析データの欠落は許容）
  }
}

/** ページ離脱前に残りのイベントを送信する */
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  }, { passive: true });
  window.addEventListener("beforeunload", () => {
    flush();
  }, { passive: true });
}

/** UTMパラメータをURLから取得する */
export function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

/** referrerとUTMからチャネルを分類する */
export function classifyChannel(referrer: string, utmSource?: string): string {
  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (["google", "bing", "yahoo", "duckduckgo"].some((s) => src.includes(s))) return "paid_search";
    if (["instagram", "facebook", "twitter", "tiktok", "linkedin", "youtube"].some((s) => src.includes(s))) return "paid_social";
    if (["newsletter", "email", "mailchimp", "sendgrid"].some((s) => src.includes(s))) return "email";
    return "other_paid";
  }
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (["google", "bing", "yahoo", "duckduckgo", "baidu", "naver"].some((s) => host.includes(s))) return "organic_search";
    if (["instagram", "facebook", "twitter", "t.co", "tiktok", "linkedin", "youtube", "youtu.be"].some((s) => host.includes(s))) return "social";
    if (["yah.mobi", "yah.mobile"].some((s) => host.includes(s))) return "internal";
    return "referral";
  } catch {
    return "direct";
  }
}

/** ページビューを自動トラッキングする（UTM・チャネル情報を含む） */
export function trackPageView(page?: string): void {
  const utm = getUtmParams();
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const channel = classifyChannel(referrer, utm.utm_source);
  trackEvent("page_view", { ...utm, channel }, page);
}
