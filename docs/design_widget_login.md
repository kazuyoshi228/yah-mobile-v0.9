# 設計図 — ウィジェットのお客様ログイン（D）

対象: 訪問者ウィジェットにログイン導線を追加し、ログイン後は個別対応（注文/eSIM参照）を可能にする
状態: **設計（実装前・承認待ち）**
方式: **yah.mobi と同一 = Google ＋ メール/パスワード**（Firebase Auth 共有プロジェクト）

---

## 1. 目的
- 匿名のままだと RAG 一般案内のみ。**ログインすると `uid` 一致で `buildCustomerContext` が注文/eSIM状態を参照**でき、個別サポートが可能になる。
- ログイン方式は **お客様が yah.mobi で使うものと同一**でないと `uid` が一致しない → **Google ＋ メール/パスワード**。

## 2. 🔑 技術的な肝（uid の扱い）
- お客様は**既に yah.mobi アカウントを保有**（＝注文が `userId==uid_real` で存在）。
- ウィジェットは最初 **匿名（uid_anon）**。ここでそのまま `linkWithCredential`（匿名昇格）すると：
  - **新規ユーザー**: 匿名に資格情報が紐付き、uid_anon のまま永続化（可）。
  - **既存顧客**: そのメール/Googleは既に uid_real にあるため `auth/credential-already-in-use` で**リンク失敗** → 正しくは**既存アカウントにサインイン**して `uid_real` に切り替える。
- 標準パターン:
  ```
  try {
    await linkWithPopup(anonUser, googleProvider);      // 新規: 匿名昇格
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use') {  // 既存顧客
      const cred = GoogleAuthProvider.credentialFromError(e);
      await signInWithCredential(auth, cred);            // uid_real にサインイン
    }
  }
  ```
  メール/パスワードも同様（`linkWithCredential(EmailAuthProvider.credential(...))` → 失敗時 `signInWithEmailAndPassword`）。

## 3. セッションの扱い（会話を引き継ぐ・確定）
**要件: ログインしても進行中の会話をそのまま引き継ぐ。**

- **新規登録／新規ユーザー**: 匿名アカウントを `linkWithCredential`/`linkWithPopup` で**昇格** → **uid は uid_anon のまま** → セッション所有者も不変 → **会話は完全に継続**（移行不要）。新規登録もこれで実現。
- **既存顧客のログイン**: そのメール/Googleは既に uid_real にあり昇格は失敗 → `signInWithCredential` で **uid_real にサインイン**（uid が変わる）。このとき進行中セッション（visitorId=uid_anon）を継続するため、**サーバ側でセッションの所有者を付け替える**。
  - **新 Callable `claimSession({ sessionId, anonIdToken })`**（Admin SDK・chat）:
    1. `anonIdToken` を `verifyIdToken` → `uid_anon` を得る（＝呼び出し元が匿名アカウントを保有していた証明）。
    2. セッションを読み、`session.visitorId === uid_anon` を確認（他人のセッションを乗っ取れない）。
    3. `session.visitorId = context.auth.uid`（= uid_real）に更新。
  - クライアントは**サインイン前に匿名の IDトークンを取得** → サインイン → `claimSession` 呼び出し。**同じ sessionId のまま会話継続**、以後は uid_real で個別参照が効く。
  - トークン失効等で claim 失敗時のみ、フォールバックで新セッション開始（稀）。
- ⚠ セキュリティ: `claimSession` は**匿名トークンが当該セッションの所有者であることを検証**するため、任意セッションの乗っ取り（IDOR）は不可。

## 4. UI（ミニマル・ログイン＋新規登録）
- **ヘッダに「Sign in」**（ログイン中は名前/メール＋サインアウト）。
- 押すと小パネル:
  - **「Continue with Google」**（ログイン/新規どちらも自動処理）。
  - **メール/パスワード フォーム**＋**「ログイン / 新規登録」トグル**。
    - 新規登録: `linkWithCredential`（匿名昇格＝新規アカウント作成）。
    - ログイン: 昇格失敗（既存）→ `signInWithEmailAndPassword` ＋ `claimSession`。
- 多言語ラベル（ja/en/zh/ko/th/vi）。
- アカウント個別が要る質問（注文/eSIM/ログイン等）で、AIが「ログインすると確認できます」と促し、このパネルへ誘導。

## 5. 対象ファイル
1. **`functions/src/callables/claimSession.ts`（新規・chat）** … 匿名トークン検証＋所有者付け替え（§3）。`onCall`・region asia-northeast1。`index.ts` に登録。
2. `client/src/hooks/useFirebaseAuth.ts` … 認証関数を追加:
   - `signInWithGoogle()` … `linkWithPopup`→失敗時 `signInWithCredential`＋`claimSession`。
   - `registerWithEmail(email,pass)` … `linkWithCredential`（新規）。
   - `signInWithEmail(email,pass)` … 昇格失敗時 `signInWithEmailAndPassword`＋`claimSession`。
   - `signOutUser()`。
   - claim 用に**サインイン前の匿名 IDトークン取得**を内包。
3. `client/src/components/ChatWidgetFirebase.tsx` … ヘッダに Sign in/ユーザー表示、ログイン＋新規登録パネル、**同一 sessionId で会話継続**（成功後に再購読が必要なら再subscribe）。
4. `client/src/lib/firebase.ts` … 既存 `googleProvider` を利用（追加設定不要）。
- **ルール変更なし**: `claimSession` は Admin SDK でルールをバイパス。付け替え後の session は `visitorId==uid_real` となり、ログイン顧客が `isOwner` で継続アクセス可。**管理者にはならない**（`isAdmin` は `email_verified`＋`google.com`＋許可ドメイン限定）。

## 6. セキュリティ確認
- 一般顧客（gmail.com Google / 任意メール）は **admin にならない**（ドメイン不一致）。権限昇格なし。
- `(default)` 参照は従来どおり **`userId==uid` にスコープ**。他人のデータは取得不可。
- 機微情報（決済ID等）は AI コンテキストに載せない（既存方針）。

## 7. 検証
- 既存顧客アカウント（Google／メール）でログイン → **注文/eSIM が回答に反映**されるか。
- 匿名のまま → 従来どおり RAG のみ。
- ログイン顧客が管理画面に入れない（`/admin` は弾かれる）こと。
- `tsc`（client）＋ `vite build`。dev ウィジェットで目視。

## 8. 確定した仕様（ユーザー回答反映）
- **会話は引き継ぐ**（リセットしない）→ §3 の `claimSession` で所有者付け替え。同一 sessionId 継続。
- **新規登録も行う** → メール/パスワードは「ログイン / 新規登録」トグル。Google は自動。登録＝匿名昇格（`linkWithCredential`）。

## 9. 補足・留意
- Google 新規（yah.mobi 未登録の Google アカウント）→ 匿名昇格で新規作成（uid 継続）。
- 既存 Google → サインイン＋claim。
- メール新規 → 昇格で作成（uid 継続）。既存メール → サインイン＋claim。パスワード誤りは明確なエラー表示。
- claim 後、onSnapshot リスナーが一瞬権限を失う可能性 → 成功後に sessionId を再セットして再購読。
- yah.mobi 側の登録直後（メール確認前）でも Firebase 上はアカウント存在 → ログイン可（`email_verified` は admin 判定にのみ影響、顧客参照には不要）。
