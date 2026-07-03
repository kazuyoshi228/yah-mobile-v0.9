/**
 * firebase.ts — クライアント側 Firebase Auth
 *
 * 設計:
 *   ログインは signInWithPopup のみ（Redirect は使用しない）。
 *   Popup はページ遷移しないため redirectUrl の問題が発生しない。
 *   Firebase が保持する ID Token を tRPC 呼び出しの `Authorization: Bearer` に載せる。
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function buildFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDlX00FbPP_Ij709LN0Xtrc26VjFh-57Js",
    authDomain: "yah-mobile-v1-3ed24.firebaseapp.com",
    projectId: "yah-mobile-v1-3ed24",
    storageBucket: "yah-mobile-v1-3ed24.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "904818392772",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:904818392772:web:db8ebf07f4552712801391",
  };
}

let app: FirebaseApp;
let auth: Auth;
let firestoreDb: Firestore;
let storageInstance: FirebaseStorage;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(buildFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = getFirebaseApp();
    auth = getAuth(app);
    void setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!firestoreDb) {
    firestoreDb = getFirestore(getFirebaseApp());
  }
  return firestoreDb;
}

export const db = { get current(): Firestore { return getFirebaseDb(); } };

/**
 * Firebase Storage インスタンスを取得する（シングルトン）。
 * ユーザーアップロード機能を実装する際はこの関数を使用する。
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Google サインイン（Popup 方式）。
 * ページ遷移しないため redirectUrl の問題が発生しない。
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
  return result.user;
}

/** サインアウト。 */
export async function signOutFirebase(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * 現在のユーザーの Firebase ID Token を取得する（未ログインなら null）。
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** 認証状態の購読。useAuth から利用する。 */
export function subscribeAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export type { User as FirebaseUser };
