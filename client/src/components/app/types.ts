// ─── 共有型・定数・ユーティリティ ───────────────────────────────────────────

import type { FsPlan } from "../../../../shared/types";

export type PlanOption = {
  gb: string;
  priceJpy: number;
  popular?: boolean;
  providerPlanId: string;
  planId: string;
};

/** DBのアクティブプランから存在する日数を昇順で返す（重複なし） */
export function getPlanDays(dbPlans: FsPlan[]): number[] {
  const days = new Set<number>();
  for (const p of dbPlans) {
    if (p.isActive) days.add(p.validityDays);
  }
  return Array.from(days).sort((a, b) => a - b);
}

export function groupPlansByDays(dbPlans: FsPlan[]): Record<number, PlanOption[]> {
  const result: Record<number, PlanOption[]> = {};
  for (const p of dbPlans) {
    if (!p.isActive) continue;
    const d = p.validityDays;
    if (!result[d]) result[d] = [];
    result[d].push({
      gb: `${p.dataGb}GB`,
      priceJpy: p.priceJpy,
      providerPlanId: p.providerPlanId,
      planId: p.id,
    });
  }
  // 各日数グループで最も高いGBを popular にする（並び順はFirestoreのsortOrderに従う）
  for (const d of Object.keys(result).map(Number)) {
    const opts = result[d];
    if (opts.length > 0) {
      const maxGb = Math.max(...opts.map((o) => parseInt(o.gb)));
      opts.forEach((o) => {
        if (parseInt(o.gb) === maxGb) o.popular = true;
      });
    }
  }
  return result;
}

export type FlatPlanOption = PlanOption & { days: number };

/**
 * 全プランをフラットな1リストに（価格昇順）。
 * 日数ファーストの2段選択を廃止した単一リストUI用（plan-selector改修）。
 * popular は「容量が10GBに最も近いプラン」1件のみ（同率は安い方）。
 * ※この商材の validityDays は「有効期限の上限」であり旅程との一致条件ではないため、
 *   全プランを常に見せて "Valid up to N days" と表現する。
 */
export function flattenPlanOptions(planOptions: Record<number, PlanOption[]>): FlatPlanOption[] {
  const flat: FlatPlanOption[] = [];
  for (const d of Object.keys(planOptions).map(Number)) {
    for (const o of planOptions[d]) flat.push({ ...o, days: d, popular: false });
  }
  flat.sort((a, b) => a.priceJpy - b.priceJpy);
  if (flat.length > 0) {
    const TARGET_GB = 10;
    let best = flat[0];
    for (const p of flat) {
      const diff = Math.abs(parseInt(p.gb) - TARGET_GB);
      const bestDiff = Math.abs(parseInt(best.gb) - TARGET_GB);
      if (diff < bestDiff || (diff === bestDiff && p.priceJpy < best.priceJpy)) best = p;
    }
    best.popular = true;
  }
  return flat;
}

export function parsePlanId(
  providerPlanId?: string,
  planOptions?: Record<number, PlanOption[]>,
): { days: number | null; gb: string | null } {
  if (!providerPlanId || !planOptions) return { days: null, gb: null };
  for (const d of Object.keys(planOptions).map(Number)) {
    const found = planOptions[d].find((o) => o.providerPlanId === providerPlanId);
    if (found) return { days: d, gb: found.gb };
  }
  return { days: null, gb: null };
}

// ─── 共有スタイル定数 ─────────────────────────────────────────────────────────

export const labelStyle = {
  fontFamily: "'National2', system-ui, sans-serif",
  fontSize: "0.6875rem",
  fontWeight: 500,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
};

export const serif = (size: string, weight = 300) => ({
  fontFamily: "'National2', system-ui, sans-serif",
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.12,
  letterSpacing: "-0.02em",
});

export const bodyStyle = {
  fontFamily: "'National2', system-ui, sans-serif",
  fontSize: "0.9375rem",
  lineHeight: 1.75,
};
