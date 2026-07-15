/**
 * merge_astro_dist.mjs — Astro出力(dist/astro)を SPA配信ディレクトリ(dist/public)へマージ。
 *
 * Astro は衝突回避のため隔離 outDir(dist/astro) に吐く（astro.config.mjs）。
 * Firebase Hosting の public は dist/public のため、ビルド後にここへ重ねる。
 * - dist/astro/esim/**   → dist/public/esim/**（GEO静的ページ）
 * - dist/astro/_astro/** → dist/public/_astro/**（島用アセット。現状は未参照だが将来のP2向けに込みで移送）
 * マージ（既存を消さない）なので、先行の vite build 成果物（SPA）は保持される。
 * ルート index.html は Astro が吐かない（/esim/* のみ）ため SPA の index.html を上書きしない。
 */
import { cpSync, existsSync } from "node:fs";

const SRC = "dist/astro";
const DEST = "dist/public";

if (!existsSync(SRC)) {
  console.error(`[merge] ${SRC} がありません。先に \`astro build\` を実行してください。`);
  process.exit(1);
}
if (!existsSync(DEST)) {
  console.error(`[merge] ${DEST} がありません。先に \`vite build\` を実行してください。`);
  process.exit(1);
}

cpSync(SRC, DEST, { recursive: true });
console.log(`[merge] ${SRC} → ${DEST} にマージしました（esim/・_astro/）。`);
