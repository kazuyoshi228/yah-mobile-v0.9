/**
 * migrate_bappy_to_provider_plan_id.mjs — Phase1: providerPlanId を追加（非破壊）
 *
 * plans / orders / esim_retry_jobs の各ドキュメントに providerPlanId = bappyPlanId を
 * コピーする（bappyPlanId は残す＝後方互換）。コード切替の前提として全docに providerPlanId
 * を存在させる。旧フィールド削除は E2E 成功後の Phase3 で別スクリプト。
 *
 * 使い方:
 *   node scripts/migrate_bappy_to_provider_plan_id.mjs         # ドライラン（書き込みなし）
 *   node scripts/migrate_bappy_to_provider_plan_id.mjs --exec  # 実行
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const EXEC = process.argv.includes("--exec");
initializeApp({ credential: applicationDefault(), projectId: "yah-mobile-v1-3ed24" });
const db = getFirestore();

const COLLECTIONS = ["plans", "orders", "esim_retry_jobs"];
let totalToWrite = 0;

for (const col of COLLECTIONS) {
  const snap = await db.collection(col).get();
  let toWrite = 0, alreadyOk = 0, noBappy = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    const d = doc.data();
    const bappy = d.bappyPlanId;
    if (bappy === undefined || bappy === null) { noBappy++; continue; }
    if (d.providerPlanId === bappy) { alreadyOk++; continue; } // 冪等
    toWrite++;
    if (EXEC) batch.update(doc.ref, { providerPlanId: bappy });
  }
  console.log(`[${col}] 全${snap.size} / 追加対象=${toWrite} / 既にOK=${alreadyOk} / bappyPlanId無=${noBappy}`);
  totalToWrite += toWrite;
  if (EXEC && toWrite > 0) { await batch.commit(); console.log(`  → ${toWrite}件 commit`); }
}

console.log(EXEC ? `\n✅ 実行完了（合計 ${totalToWrite}件に providerPlanId 追加）` : `\n(ドライラン) 実行時に ${totalToWrite}件へ providerPlanId を追加します。--exec で実行。`);
process.exit(0);
