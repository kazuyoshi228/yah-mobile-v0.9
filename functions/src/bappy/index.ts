/**
 * server/bappy/index.ts — 後方互換バレル
 *
 * 既存コードは `import { ... } from "./bappy"` でそのまま動作する。
 */

// 型定義
export type { BappyLink, BappyActivation, BappyPlan } from "./types";

// 認証ユーティリティ
export { isBappyConfigured } from "./auth";

// eSIM Link
export { createLink, getLinkDetail } from "./links";

// トップアップ
export { getTopupPlans, addTopupPlan } from "./topup";
