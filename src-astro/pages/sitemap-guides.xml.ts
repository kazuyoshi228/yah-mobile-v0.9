/**
 * /sitemap-guides.xml — ガイド（/guides/**）のサイトマップをビルド時に生成。
 *
 * SPA用の静的 sitemap.xml（client/public/sitemap.xml）とは別建てにし、robots.txt で両方を宣言する
 * （crawler は Sitemap 行を複数解釈できる）。feed に記事/言語が増えれば自動で載る＝手動更新不要。
 * hreflang 相互リンクも入れて多言語クラスタを明示（GEO/SEOの発見性）。
 */
import type { APIRoute } from "astro";
import { getEsimGuides } from "../lib/esimGuides";

const SITE = "https://yah.mobi";

export const GET: APIRoute = async () => {
  const guides = await getEsimGuides();
  const entries: string[] = [];

  for (const g of guides) {
    const section = g.categorySlug || "esim";
    const langs = (g.languages ?? []).filter((l) => g.translations?.[l]);
    const lastmod = g.updatedAt ? new Date(g.updatedAt).toISOString() : null;

    for (const lang of langs) {
      const loc = `${SITE}/guides/${section}/${lang}/${g.slug}`;
      const alts = langs
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/guides/${section}/${l}/${g.slug}"/>`)
        .join("\n");
      entries.push(
        `  <url>\n    <loc>${loc}</loc>` +
          (lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "") +
          `\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n${alts}\n  </url>`,
      );
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${entries.join("\n")}\n` +
    `</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
