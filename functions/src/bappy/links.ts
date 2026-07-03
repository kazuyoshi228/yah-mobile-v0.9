import * as logger from "firebase-functions/logger";
/**
 * server/bappy/links.ts — eSIM Link 作成・取得
 */

import { isBappyConfigured } from "./auth";
import { bappyFetch, mapBappyStatus } from "./client";
import type { BappyLink, RawLinkDetail, RawCreateLinkResponse } from "./types";

// ─── モックデータ ─────────────────────────────────────────────────────────────

function mockLink(planId: string, orderId: string): BappyLink {
  const iccid = `8981100${orderId.slice(-10).padStart(10, "0")}`;
  const lpa = `LPA:1$smdp.example.com$${Buffer.from(`${planId}-${orderId}`)
    .toString("base64")
    .slice(0, 32)}`;
  return {
    uuid: `mock-uuid-${orderId.slice(-8)}`,
    iccid,
    lpaProfile: lpa,
    appleActivationUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`,
    androidActivationUrl: `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`,
    status: "active",
    dataRemainingMb: 1024,
    dataTotalMb: 1024,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function mockLinkDetail(uuid: string): BappyLink {
  const remaining = Math.floor(Math.random() * 800) + 100;
  const lpa = "LPA:1$smdp.example.com$MOCKPROFILE";
  return {
    uuid,
    iccid: "89811000000000000001",
    lpaProfile: lpa,
    appleActivationUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`,
    androidActivationUrl: `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`,
    status: "active",
    dataRemainingMb: remaining,
    dataTotalMb: 1024,
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * eSIM Link を作成（eSIM発行）
 * Stripe決済完了後の Webhook から呼び出す。
 */
export async function createLink(params: {
  bappyPlanId: string;
  orderId: string;
}): Promise<BappyLink> {
  if (!isBappyConfigured()) {
    logger.warn("[Bappy] MOCK: createLink", params);
    return mockLink(params.bappyPlanId, params.orderId);
  }

  const raw = await bappyFetch<RawCreateLinkResponse>("/links", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.bappyPlanId,
      name: `Order #${params.orderId}`,
    }),
  });

  const lpa = raw.lpa_profile;
  // Bappy API returns activation_url (Apple eSIM setup URL)
  const appleUrl =
    raw.activation_url ??
    (lpa ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}` : null);
  return {
    uuid: raw.id,
    iccid: raw.iccid,
    lpaProfile: lpa,
    appleActivationUrl: appleUrl,
    androidActivationUrl: lpa
      ? `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`
      : null,
    status: "active",
    dataRemainingMb: 0,
    dataTotalMb: 0,
    expiryDate: null,
  };
}

/**
 * eSIM Link の詳細を取得（データ残量・有効期限）
 */
export async function getLinkDetail(identifier: string): Promise<BappyLink> {
  if (!isBappyConfigured()) {
    logger.warn("[Bappy] MOCK: getLinkDetail", identifier);
    return mockLinkDetail(identifier);
  }

  const raw = await bappyFetch<RawLinkDetail>(`/links/${identifier}`);

  const activeActivation = raw.activations?.find((a) => a.status === "active");
  const expiryDate = activeActivation?.expiry_date ?? null;

  const dataRemainingMb = raw.data_remaining_mb ?? 0;
  const dataUsedMb = raw.data_used_mb ?? 0;
  const dataTotalMb = dataRemainingMb + dataUsedMb;

  const lpa = raw.lpa_profile;
  return {
    uuid: raw.id,
    iccid: raw.iccid,
    lpaProfile: lpa,
    appleActivationUrl:
      raw.apple_activation_url ??
      (lpa
        ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`
        : null),
    androidActivationUrl:
      raw.android_activation_url ??
      (lpa
        ? `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}`
        : null),
    status: mapBappyStatus(raw.status),
    dataRemainingMb,
    dataTotalMb,
    expiryDate,
  };
}
