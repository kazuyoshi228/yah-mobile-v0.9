/**
 * smoke_prod.mjs — 本番デプロイ後スモークチェック（読み取り専用・非破壊）
 *
 * 目的: ユニットテストでは防げない「デプロイ設定/インフラ起因」の障害を機械的に検知する。
 *   - callable の Cloud Run invoker(allUsers) 欠落 → topup 401 の再発防止（[[topup-iam-invoker-401]]）
 *   - OG画像/生HTMLメタ/プリレンダtitle/llms.txt の回帰
 *
 * 使い方: firebase deploy 後に  `node scripts/smoke_prod.mjs`
 *   - 認証: Cloud Run IAM チェックのみ ADC 必要（`gcloud auth application-default login` 済 or firebase-admin ADC）。
 *     ADC が無い/失効時はその項目だけ SKIP し、HTTPチェックは続行する（非ブロッキング）。
 * 終了コード: 全PASS=0 / 1件でもFAIL=1。
 */
const BASE = "https://yah.mobi";
const PROJECT = "yah-mobile-v1-3ed24";
const REGION = "asia-northeast1";

// 公開必須（allUsers invoker）であるべき callable の Cloud Run サービス名（＝関数名の小文字）
const PUBLIC_CALLABLES = [
  "ordersinitcheckout",
  "ordersinittopupcheckout",
  "orderretrypayment",
  "adminrefundorder",
  "submitcontactinquiry",
  "analyticsgetaiinsights",
];

const results = []; // { name, ok, detail }
const rec = (name, ok, detail = "") => results.push({ name, ok, detail });

async function httpGet(path) {
  const res = await fetch(BASE + path, { redirect: "follow" });
  const body = await res.text();
  return { status: res.status, body };
}

// ── 1. HTTP / メタ回帰 ──────────────────────────────────────────────
async function checkHttp() {
  // OG画像 200
  try {
    const r = await fetch(`${BASE}/og_yah_black_v1.png`, { method: "GET" });
    rec("OG画像 200 (og_yah_black_v1.png)", r.status === 200, `HTTP ${r.status}`);
  } catch (e) { rec("OG画像 200", false, String(e)); }

  // /app 生HTML: og:image=黒OG・title/og:titleに価格(¥/990)なし
  try {
    const { status, body } = await httpGet("/app");
    const ogImg = body.match(/og:image" content="([^"]+)"/)?.[1] ?? "";
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const ogTitle = body.match(/og:title" content="([^"]+)"/)?.[1] ?? "";
    rec("/app 200", status === 200, `HTTP ${status}`);
    rec("/app og:image = 黒OG", ogImg.includes("og_yah_black_v1.png"), ogImg);
    rec("/app title に価格なし", !/¥|990/.test(title), `"${title}"`);
    rec("/app og:title に価格なし", !/¥|990/.test(ogTitle), `"${ogTitle}"`);
  } catch (e) { rec("/app メタ", false, String(e)); }

  // 各言語プリレンダ title が200・価格なし
  for (const lang of ["ko", "zh-CN", "zh-TW", "th"]) {
    try {
      const { status, body } = await httpGet(`/${lang}/app`);
      const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      rec(`/${lang}/app 200・価格なし`, status === 200 && !/¥|990|低至|부터|เริ่มต้น ¥/.test(title), `HTTP ${status} "${title}"`);
    } catch (e) { rec(`/${lang}/app`, false, String(e)); }
  }

  // llms.txt 200
  try {
    const r = await fetch(`${BASE}/llms.txt`);
    rec("llms.txt 200", r.status === 200, `HTTP ${r.status}`);
  } catch (e) { rec("llms.txt 200", false, String(e)); }
}

// ── 2. Cloud Run invoker(allUsers) 確認（ADC 必要・失効時SKIP） ─────────
async function checkInvokers() {
  let token;
  try {
    const { applicationDefault } = await import("firebase-admin/app");
    token = (await applicationDefault().getAccessToken()).access_token;
  } catch {
    rec("callable invoker(allUsers) 確認", true, "SKIP: ADC無し（`gcloud auth application-default login` で有効化）");
    return;
  }
  for (const svc of PUBLIC_CALLABLES) {
    try {
      const url = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${svc}:getIamPolicy`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.error) { rec(`invoker ${svc}`, true, `SKIP: ${json.error.message}`); continue; }
      const has = (json.bindings ?? []).some((b) => b.role === "roles/run.invoker" && (b.members ?? []).includes("allUsers"));
      rec(`invoker ${svc} = allUsers`, has, has ? "" : "✗ allUsers 欠落（401リスク）");
    } catch (e) { rec(`invoker ${svc}`, false, String(e)); }
  }
}

// ── 実行 ────────────────────────────────────────────────────────────
await checkHttp();
await checkInvokers();

const fails = results.filter((r) => !r.ok);
console.log(`\n=== 本番スモーク (${BASE}) — ${results.length}項目 ===`);
for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
console.log(fails.length === 0 ? "\n🟢 全PASS" : `\n🔴 FAIL ${fails.length}件`);
process.exit(fails.length === 0 ? 0 : 1);
