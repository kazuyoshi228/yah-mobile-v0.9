/**
 * functions/src/firebase.ts — Firebase Admin SDK 初期化
 *
 * Cloud Functions 環境では ADC（Application Default Credentials）が自動的に使われる。
 * ローカル開発では FIREBASE_SERVICE_ACCOUNT_KEY 環境変数を使用する。
 */
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App;
let db: Firestore;
let auth: Auth;

function getFirebaseApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    let serviceAccount: object;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
    }
    return initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      projectId: "yah-mobile-v1-3ed24",
    });
  }
  // Cloud Functions 環境: ADC を使用
  return initializeApp({
    credential: applicationDefault(),
    projectId: "yah-mobile-v1-3ed24",
  });
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    app = getFirebaseApp();
    db = getFirestore(app);
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = getFirebaseApp();
    auth = getAuth(app);
  }
  return auth;
}

export { getFirebaseApp };
