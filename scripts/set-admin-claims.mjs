/**
 * Firebase Custom Claims 設定スクリプト
 * 使用方法: node scripts/set-admin-claims.mjs
 *
 * 指定したユーザーに { admin: true } の Custom Claims を付与します。
 * 付与後、ユーザーは次回ログイン時（またはトークン更新時）に管理者権限を取得します。
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const SA_KEY_PATH = process.env.SA_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_KEY_PATH) {
  console.error('サービスアカウント鍵のパスを SA_KEY_PATH または GOOGLE_APPLICATION_CREDENTIALS で指定してください。');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SA_KEY_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();

// 管理者に設定するユーザーの UID
const ADMIN_UID = 'uF9ICxOCqMVYtN69m0NGQOYDxwj2'; // kazuyoshi.yamada@bonfire.co.jp

await auth.setCustomUserClaims(ADMIN_UID, { admin: true });
console.log(`✅ Custom Claims { admin: true } を設定しました: ${ADMIN_UID}`);

// 確認
const user = await auth.getUser(ADMIN_UID);
console.log(`確認: ${user.email} | customClaims: ${JSON.stringify(user.customClaims)}`);
