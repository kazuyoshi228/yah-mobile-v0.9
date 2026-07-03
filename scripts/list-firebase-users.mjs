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
const result = await auth.listUsers(20);

console.log('=== Firebase Users ===');
result.users.forEach(u => {
  console.log(`uid: ${u.uid} | email: ${u.email} | name: ${u.displayName} | admin: ${u.customClaims?.admin ?? false}`);
});
