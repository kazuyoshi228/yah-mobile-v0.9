/**
 * buyLinks.ts — 共有用購入リンク /buy/:slug の定義（design_share_links.md）
 *
 * 静的マップは SEO/OG メタ専用（プリレンダ時は App Check の関係で Firestore を読めないため）。
 * 購入時の価格・プラン解決の真実は従来どおり Firestore（AppPage が実プランとマッチング）。
 * プラン改廃時はこのマップと scripts/prerender.mjs の ROUTES を更新する。
 */

export interface BuyLinkMeta {
  gb: string;      // 表示用容量（例 "10GB"）
  days: number;    // 有効期間の上限（最長◯日）
}

export const BUY_LINK_PLANS: Record<string, BuyLinkMeta> = {
  "1gb": { gb: "1GB", days: 7 },
  "3gb": { gb: "3GB", days: 15 },
  "5gb": { gb: "5GB", days: 30 },
  "10gb": { gb: "10GB", days: 30 },
  "20gb": { gb: "20GB", days: 30 },
  "50gb": { gb: "50GB", days: 30 },
};

/** slug（大文字小文字許容）→ メタ。未知の slug は null（呼び出し側は /app 通常表示にフォールバック）。 */
export function resolveBuySlug(slug: string | undefined | null): BuyLinkMeta | null {
  if (!slug) return null;
  return BUY_LINK_PLANS[slug.toLowerCase()] ?? null;
}

/** dataGb（数値）→ 共有リンクの slug（例 10 → "10gb"）。 */
export function buySlugForGb(dataGb: number): string {
  return `${dataGb}gb`;
}

/** /buy ページ用の SEO メタ（en のみ・価格は含めない=既存の価格排除方針と整合）。 */
export function buyPageMeta(slug: string): { title: string; description: string; canonical: string } | null {
  const m = resolveBuySlug(slug);
  if (!m) return null;
  return {
    title: `Japan eSIM ${m.gb} — Valid up to ${m.days} days | yah.mobile`,
    description: `Buy a prepaid Japan eSIM with ${m.gb} of data, valid up to ${m.days} days. Instant QR delivery, no SIM swap, NTT docomo network. Tax included.`,
    canonical: `https://yah.mobi/buy/${slug.toLowerCase()}`,
  };
}
