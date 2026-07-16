/**
 * esimGuides.ts — magazine の eSIM feed をビルド時に取得（design_astro_geo_p1.md）
 * feed = メタデータ＋translations（title/body(MD)/directAnswer/metaTitle/metaDescription/faq）。
 */
import { assertGuidesIntegrity } from "./integrity";

const FEED_URL = "https://magazine.yah.mobi/feeds/esim.json";

export interface FaqItem { q: string; a: string; }
export interface GuideAuthor { id?: string; name: string; title?: string; photoUrl?: string; }
export interface GuideTranslation {
  title: string;
  excerpt?: string;
  body: string; // Markdown
  directAnswer?: string;
  metaTitle?: string;
  metaDescription?: string;
  faq?: FaqItem[];
}
export interface EsimGuide {
  slug: string;
  categorySlug: string;
  schemaType?: string;
  languages: string[];
  priceBindings?: string[]; // plan docID（= providerPlanId / packageCode）
  showCompetitorTable?: boolean;
  fieldReport?: string | null; // 実地レポート（一次データ・Markdown・画像含む）。空ならnull
  fieldReportMode?: "field" | "assumed" | null; // "field"=実測 / "assumed"=想定・実測前
  canonical: string; // 例 /esim/ja/esim-chatgpt
  confirmedDate?: string;
  publishedAt?: number;
  updatedAt?: number;
  author?: GuideAuthor;
  translations: Record<string, GuideTranslation>;
}

let _cache: EsimGuide[] | null = null;

/** ビルド時に feed を1回取得（キャッシュ回避クエリ付き）。 */
export async function getEsimGuides(): Promise<EsimGuide[]> {
  if (_cache) return _cache;
  const res = await fetch(`${FEED_URL}?ts=${Math.floor(Date.now() / 60000)}`);
  if (!res.ok) throw new Error(`[esimGuides] feed fetch failed: ${res.status}`);
  _cache = (await res.json()) as EsimGuide[];
  assertGuidesIntegrity(_cache); // 消えてはいけないデータ（author等）の欠落で公開をブロック
  return _cache;
}

/** title の "W1-03｜" 等のワークオーダー接頭辞を表示から除去。 */
export function stripTitlePrefix(title: string): string {
  return title.replace(/^W\d+-\d+\s*[｜|]\s*/, "");
}
