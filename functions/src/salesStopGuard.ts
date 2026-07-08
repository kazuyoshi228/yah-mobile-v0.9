/**
 * salesStopGuard.ts — 販売停止ガード（柱2 §5）
 *
 * providerHealthCheck（15分毎）が system_config/provider_health.<provider>.status="down"
 * を立てると、そのプロバイダの購入を発行前に弾く（＝課金しない）。
 * 未設定 / "ok" は通す（既存Bappyプランや初期状態で誤って止めないため）。
 */
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./db";

export async function assertProviderAvailable(provider: string): Promise<void> {
  const snap = await db.collection("system_config").doc("provider_health").get();
  const status = snap.exists ? (snap.data()?.[provider]?.status as string | undefined) : undefined;
  if (status === "down") {
    logger.warn(`[assertProviderAvailable] provider=${provider} is down — blocking purchase.`);
    throw new HttpsError("unavailable", "只今、購入を一時停止しています。しばらくしてから再度お試しください。");
  }
}
