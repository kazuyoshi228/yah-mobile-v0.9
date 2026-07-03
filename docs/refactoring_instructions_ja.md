# リファクタリング指示書：極限フラット・サーバーレスモデルへの移行（決定版）

このドキュメントは、`yah-mobile-v3` リポジトリを「フロント ➡️ Firebase Auth ➡️ Firestore」の直線モデル（Pure BaaS）へ移行し、バックエンドのプログラム構成を起動タイプ別の5つのフラットファイルに完全集約するためのMANUS向け開発指示書です。

---

## 1. 整理・削除するファイルとフォルダ階層

### 1.1 バックエンド（`functions/src/`）のフォルダ完全廃止
以下の既存サブディレクトリをすべて削除し、ファイルを整理・統合してください。
* [DELETE] `functions/src/callables/` フォルダ（中身は `callables.ts` に集約）
* [DELETE] `functions/src/triggers/` フォルダ（中身は `triggers.ts` に集約）
* [DELETE] `functions/src/webhooks/` フォルダ（中身は `webhooks.ts` に集約）
* [DELETE] `functions/src/db/` フォルダ（単純なFirestore読み書きクエリは呼び出し側に直接インライン化）

### 1.2 共有ファイルの削除
* [DELETE] `client/src/lib/callable.ts`（Callable APIクライアントヘルパー）
* [DELETE] `shared/callableSchemas.ts`（Zodスキーマは `callables.ts` に移動。定数は `callables.ts` と `useAuth.ts` などで直接参照または縮小定義）

### 1.3 フロントエンドの不要パッケージ削除
* [DELETE] `@stripe/react-stripe-js`, `@stripe/stripe-js`（フロントでの埋め込みが不要なため）

---

## 2. 移行後の5ファイル構成（`functions/src/` 直下）

### 2.1 `functions/src/callables.ts`（API用）
* **役割**: アプリ画面から呼び出されるすべてのAPIハンドラ（`onCall`）を定義します。
* **格納される関数**:
  * `esimGetTopupPlans`（トップアップ用のプラン取得）
  * `adminListPlans`, `adminCreatePlan`, `adminUpdatePlan`, `adminDeletePlan` などの全管理者専用API
* **実装仕様**:
  * 管理者APIに必要なZodバリデーションスキーマ（`CreatePlanInput` 等）は、外部ファイルからインポートせず、このファイル内に直接インラインで定義してください。

### 2.2 `functions/src/triggers.ts`（データベース連動用）
* **役割**: Firestoreのドキュメントの変更（作成・更新）を検知して自動で動くトリガー関数を一括定義します。
* **格納される関数**:
  * `onOrderCreated`（注文書作成時に、orderTypeに応じてプラン価格を解決し、Stripe URLを発行）
  * `onUserCreated`（新規ログイン発生時に、サーバー側で安全・確実に `/users/{uid}` 初期プロフィールを作成）
  * `onEsimSyncRequested`（残量更新リクエスト検知時にBappy APIからデータ使用量を同期）

### 2.3 `functions/src/webhooks.ts`（Stripe決済通知用）
* **役割**: Stripeからの決済成功イベントを受信し、直接eSIMを発券してDBに書き込む処理を記述します。
* **処理フロー**:
  1. Stripeの決済成功Webhookを検知。
  2. Stripeのセッションメタデータから情報を取り出し、**その場で直接 Bappy API を呼び出して eSIM を発券**する。
  3. データベースの `/esim_links` にQRコード情報を新規書き込みし、同時に `/orders/{orderId}` のステータスを `"paid"` に更新する。

### 2.4 `functions/src/_helpers.ts`（共通ヘルパー）
* **役割**: 認証チェックや管理者バッジの検証など、各関数から使われるユーティリティを記述します。
* **格納される関数**:
  * `requireAuth`（ログインチェック）
  * `requireAdmin`（Custom Claimsの `admin: true` の有無をチェックする関数。`admin.ts` からここに集約）

### 2.5 `functions/src/index.ts`（エントリーポイント）
* **役割**: 上記の `callables.ts`, `triggers.ts`, `webhooks.ts` からエクスポートされたすべての関数をインポートし、Google Cloudへ公開（export）します。

---

## 3. その他の実装調整

### 3.1 Googleログインのリダイレクト化
* **ファイル**: `client/src/_core/hooks/useAuth.ts`
* **内容**: `signInWithPopup` を廃止し、`signInWithRedirect` および `getRedirectResult` によるリダイレクト方式に変更してください。

### 3.2 購入制限（Firestoreセキュリティルール）
* **ファイル**: `firestore.rules`
* **内容**: `/orders/{orderId}` の create ルールに、ユーザーのメールが `allowed_emails` に存在することを条件として追加し、未招待ユーザーからの書き込みをDBレベルでブロックしてください。
