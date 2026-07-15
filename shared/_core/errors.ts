/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Convenience constructors
export const BadRequestError = (msg: string) => new HttpError(400, msg);
export const UnauthorizedError = (msg: string) => new HttpError(401, msg);
export const ForbiddenError = (msg: string) => new HttpError(403, msg);
export const NotFoundError = (msg: string) => new HttpError(404, msg);

// ─────────────────────────────────────────────────────────────────────────
// AI-First: 機械可読エラーコード
//
// AIエージェントはこのコードを見て自動的に代替案を提示したり
// ユーザーへの説明文を生成したりできる。
//
// 使い方（server/routers.ts）:
//   throw new TRPCError({
//     code: "BAD_REQUEST",
//     message: "Plan is no longer available",
//     cause: {
//       code: AppErrorCode.PLAN_NOT_AVAILABLE,
//       alternatives: [{ providerPlanId: "JP_7D_5GB", ... }],
//     },
//   });
// ─────────────────────────────────────────────────────────────────────────
export const AppErrorCode = {
  // Plans
  PLAN_NOT_AVAILABLE: "PLAN_NOT_AVAILABLE",       // プランが無効化・削除された
  PLAN_NOT_FOUND:     "PLAN_NOT_FOUND",           // 指定IDのプランが存在しない
  NO_PLANS_AVAILABLE: "NO_PLANS_AVAILABLE",       // アクティブなプランが0件

  // Orders / Checkout
  ORDER_NOT_FOUND:         "ORDER_NOT_FOUND",     // 注文IDが見つからない
  ORDER_ALREADY_PAID:      "ORDER_ALREADY_PAID",  // 既に決済済みの注文
  PAYMENT_FAILED:          "PAYMENT_FAILED",      // 決済失敗
  ESIM_PROVISIONING_FAILED:"ESIM_PROVISIONING_FAILED", // eSIM発行失敗

  // Auth
  AUTH_REQUIRED: "AUTH_REQUIRED",                 // ログインが必要
  FORBIDDEN:     "FORBIDDEN",                     // 権限不足

  // General
  RATE_LIMITED:  "RATE_LIMITED",                  // レートリミット超過
  INTERNAL:      "INTERNAL",                      // サーバー内部エラー
} as const;

export type AppErrorCode = typeof AppErrorCode[keyof typeof AppErrorCode];

/**
 * AIエージェント向けエラーレスポンス型
 * tRPC の cause フィールドに含める
 */
export interface AiErrorPayload {
  /** 機械可読エラーコード */
  code: AppErrorCode;
  /** 代替プランの提案（PLAN_NOT_AVAILABLE 時など） */
  alternatives?: Array<{
    providerPlanId: string;
    name: string;
    dataGb: string;
    validityDays: number;
    priceJpy: number;
    deepLinkUrl: string;
  }>;
  /** AIがユーザーに伝えるべき追加情報 */
  hint?: string;
}
