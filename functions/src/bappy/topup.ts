import * as logger from "firebase-functions/logger";
/**
 * server/bappy/topup.ts — トップアッププラン取得・実行
 */

import { isBappyConfigured } from "./auth";
import { bappyFetch } from "./client";
import type { BappyActivation, BappyPlan, RawLinkDetail, RawPlansPage, RawTopupPlan } from "./types";

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * トップアップ対応プランを取得（日本カバレッジのみ）
 */
export async function getTopupPlans(_identifier: string): Promise<BappyPlan[]> {
  if (!isBappyConfigured()) {
    logger.warn("[Bappy] MOCK: getTopupPlans");
    return [
      { id: "mock-plan-3d-1gb", name: "3-Day 1GB", dataGb: 1, validityDays: 3, priceUsd: 6.5, sponsorProfile: "mock-sponsor" },
      { id: "mock-plan-7d-3gb", name: "7-Day 3GB", dataGb: 3, validityDays: 7, priceUsd: 9.5, sponsorProfile: "mock-sponsor" },
    ];
  }

  // 全プランをページネーションで取得
  const allPlans: RawTopupPlan[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await bappyFetch<RawPlansPage>(`/plans?per_page=${perPage}&page=${page}`);
    allPlans.push(...result.data);
    if (page >= result.meta.last_page) break;
    page++;
  }

  // 日本（JP）をカバーするプランのみフィルタ
  const japanPlans = allPlans.filter((p) => {
    const countries = p.coverage?.countries ?? [];
    return countries.includes("JP");
  });

  return japanPlans.map((p) => ({
    id: String(p.id),
    name: p.name,
    dataGb: p.data_gb,
    validityDays: p.validity_days,
    priceUsd: parseFloat(p.partner_cost),
    sponsorProfile: p.sponsor_profiles?.[0]?.id ?? "",
  }));
}

/**
 * トップアップ実行（プラン追加）
 */
export async function addTopupPlan(params: {
  identifier: string; // UUID または ICCID
  planId: string;
}): Promise<BappyActivation> {
  if (!isBappyConfigured()) {
    logger.warn("[Bappy] MOCK: addTopupPlan", params);
    return {
      uuid: `mock-activation-${Date.now()}`,
      planId: params.planId,
      dataRemainingMb: 1024,
      dataTotalMb: 1024,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };
  }

  // PUT /v1/links/{identifier}/plans  { add: ["plan-id"] }
  await bappyFetch<unknown>(`/links/${params.identifier}/plans`, {
    method: "PUT",
    body: JSON.stringify({ add: [params.planId] }),
  });

  // プラン追加後に GET /v1/links/{identifier} で最新アクティベーション情報を取得
  const raw = await bappyFetch<RawLinkDetail>(`/links/${params.identifier}`);

  const activations = raw.activations ?? [];
  const matchingActivation = activations
    .filter((a) => a.plan_id === params.planId && a.status === "active")
    .sort((a, b) => new Date(b.activation_date).getTime() - new Date(a.activation_date).getTime())[0];

  const activationUuid = matchingActivation?.id ?? `activation-${params.identifier}-${Date.now()}`;
  if (!matchingActivation) {
    logger.warn(`[Bappy] addTopupPlan: Could not find matching activation for planId=${params.planId} in link=${params.identifier}. Using fallback UUID.`);
  }

  const dataRemainingMb = raw.data_remaining_mb ?? 0;
  const dataUsedMb = raw.data_used_mb ?? 0;
  const dataTotalMb = dataRemainingMb + dataUsedMb;

  return {
    uuid: activationUuid,
    planId: params.planId,
    dataRemainingMb,
    dataTotalMb,
    expiryDate: matchingActivation?.expiry_date ?? null,
    status: "active",
  };
}
