/**
 * set-admin-role.mjs
 * 指定メールアドレスのユーザーの role を admin に設定する。
 * Usage: FIREBASE_SERVICE_ACCOUNT_KEY=... node scripts/set-admin-role.mjs kazuyoshi.yamada@bonfire.co.jp
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin-role.mjs <email>");
  process.exit(1);
}

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY が設定されていません");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function setAdminRole() {
  const snapshot = await db.collection("users").where("email", "==", email).get();
  if (snapshot.empty) {
    console.log(`ユーザーが見つかりません: ${email}`);
    console.log("まだログインしていない可能性があります。一度ログインしてからもう一度実行してください。");
    process.exit(1);
  }
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    console.log(`Found: id=${docSnap.id}, email=${data.email}, current role=${data.role}`);
    await docSnap.ref.update({ role: "admin" });
    console.log(`✓ role を admin に更新しました: ${docSnap.id}`);
  }
}

setAdminRole().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
