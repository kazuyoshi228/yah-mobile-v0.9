# Firebase Cloud Functions 移行レポート

**作業日:** 2026-06-29  
**対象プロジェクト:** yah.mobile (yah-mobile-v2)  
**TypeScript:** 0 エラー確認済み

---

## 概要

バックエンドを Manus ホスティング上の Express サーバーから **Firebase Cloud Functions（東京リージョン）** に移行した。フロントエンドは Manus ホスティングのまま維持し、tRPC の通信先 URL のみ切り替える設計とした。

```
移行前:
  フロント（Manus） → /api/trpc → Express（Manus サーバー）

移行後:
  フロント（Manus） → VITE_FUNCTIONS_URL/api/trpc → Cloud Functions（asia-northeast1）
```

---

## 新規作成ファイル一覧

### 設定ファイル

| ファイル | 内容 |
|---|---|
| `firebase.json` | Firebase プロジェクト設定（functions ソースを `functions/` に指定） |
| `.firebaserc` | Firebase プロジェクト ID（`yah-mobile-v1-3ed24`）を紐付け |
| `functions/package.json` | Cloud Functions 用依存関係（Node 20、firebase-functions v6、tRPC v11 等） |
| `functions/tsconfig.json` | Cloud Functions 用 TypeScript 設定（CommonJS、ES2020、`shared/` を include） |

### コアインフラ（`functions/src/`）

| ファイル | 内容 | 主な変更点（server/ との差異） |
|---|---|---|
| `env.ts` | 環境変数管理 | `process.env` から直接読み取る（`server/_core/env.ts` の ENV オブジェクト方式を踏襲しつつ、`forgeApiUrl`/`forgeApiKey` を追加） |
| `firebase.ts` | Firebase Admin SDK 初期化 | Cloud Functions 環境では ADC（Application Default Credentials）を自動使用。ローカル開発では `FIREBASE_SERVICE_ACCOUNT_KEY` 環境変数を参照 |
| `context.ts` | tRPC コンテキスト（認証） | `Authorization: Bearer <Firebase ID Token>` を `verifyIdToken()` で検証。Cookie/セッション方式を完全廃止 |
| `trpc.ts` | tRPC サーバー設定 | `server/_core/trpc.ts` と同等。`publicProcedure`/`protectedProcedure`/`adminProcedure` を定義 |
| `router.ts` | AppRouter の組み立て | 全 15 ルーターを束ねて `AppRouter` 型をエクスポート |
| `index.ts` | Cloud Functions エントリーポイント | Express アプリを `functions.onRequest()` でラップ。東京リージョン（`asia-northeast1`）、512MiB、120秒タイムアウト、最大 10 インスタンスに設定 |

### DB 層（`functions/src/db/`）

`server/db/` をコピーし、import パスを修正した。

| ファイル | 変更内容 |
|---|---|
| `core.ts` | `import { getFirebaseDb } from "../firebase"` に変更（`server/firebase.ts` → `../firebase`） |
| `types.ts` | `export type { FsUser } from "../../../shared/userTypes"` に変更（相対パスの深さが 1 段増加） |
| `users.ts` | `import { ENV } from "../env"` に変更（`../\_core/env` → `../env`） |
| `orders.ts` | 変更なし（`./core` 参照のみで差異なし） |
| `esim.ts` | 変更なし（`./core` 参照のみで差異なし） |
| `admin.ts` | 変更なし（`./core` 参照のみで差異なし） |
| `index.ts` | 新規作成。全 DB ヘルパーを一箇所から re-export するバレルファイル |

### Bappy API クライアント（`functions/src/bappy/`）

`server/bappy/` をコピーし、import パスを修正した。

| ファイル | 変更内容 |
|---|---|
| `auth.ts` | `import { getBappyTokenCached, setBappyTokenCached } from "../db/esim"` に変更（`../firestoreDb` → `../db/esim`） |
| `client.ts` | 変更なし |
| `links.ts` | 変更なし |
| `topup.ts` | 変更なし |
| `types.ts` | 変更なし |
| `index.ts` | 変更なし |

### アダプター（`functions/src/adapters/`）

`server/_core/notification.ts` と `server/mailer.ts` を再設計した。

| ファイル | 内容 | 主な変更点 |
|---|---|---|
| `notify.ts` | オーナー通知（Forge API / Slack） | `server/_core/notification.ts` を `process.env` 直接参照に書き直し。`NOTIFY_PROVIDER` 環境変数で Forge/Slack を切り替え可能に |
| `mail.ts` | メール送信（Resend API） | `server/mailer.ts` の Resend 送信部分を `process.env` 直接参照に書き直し |

### ユーティリティ（`functions/src/`）

| ファイル | 内容 | 主な変更点 |
|---|---|---|
| `stripe.ts` | Stripe 初期化・Checkout Session 作成・Webhook 検証 | `server/stripe.ts` をそのままコピー（`process.env` 直接参照で差異なし） |
| `geoip.ts` | IP ジオロケーション | `geoip-lite` パッケージが Cloud Functions 環境で使用不可のため、`getGeoFromIp()` は常に `null` を返すスタブに変更。`getClientIp()` は Cloudflare ヘッダー/`X-Forwarded-For` から IP を取得する実装を維持 |
| `llm.ts` | LLM 呼び出しヘルパー | `server/_core/llm.ts` をコピーし、`import { ENV } from "./env"` に変更 |
| `mailer.ts` | メール送信（Gmail MCP） | `server/mailer.ts` をそのままコピー（`process.env` 直接参照で差異なし） |
| `firestoreSync.ts` | Firestore 共有データバス | `server/firestoreSync.ts` をコピーし、`import { getFirebaseDb } from "./firebase"` に変更 |
| `incidentDb.ts` | インシデント・リトライジョブ DB 操作 | `server/incidentDb.ts` をコピーし、`from "./firestoreDb"` → `from "./db"` に変更 |
| `esimRetryService.ts` | eSIM 再試行サービス | `server/esimRetryService.ts` をコピーし、`from "./firestoreDb"` → `from "./db"` に変更 |

### ルーター（`functions/src/routers/`）

全ルーターで共通の変更パターン：

- `from "../_core/trpc"` → `from "../trpc"`
- `from "../firestoreDb"` → `from "../db"`
- `from "../_core/notification"` → `from "../adapters/notify"`
- `from "../_core/llm"` → `from "../llm"`
- `../../shared/...` → `../../../shared/...`

| ファイル | 主な変更点 |
|---|---|
| `auth.ts` | import パスのみ変更 |
| `plans.ts` | import パスのみ変更 |
| `user.ts` | `getUserById` → `getUserByUid` に変更（`ctx.user!.id` は Firebase UID） |
| `contact.ts` | import パスのみ変更 |
| `notifications.ts` | import パスのみ変更 |
| `exchangeRates.ts` | import パスのみ変更 |
| `esim.ts` | import パスのみ変更 |
| `orders.ts` | import パスのみ変更 |
| `admin.ts` | `getActivePlans` の import を削除（`getAllPlans` のみ使用） |
| `analytics.ts` | `from "../_core/llm"` → `from "../llm"`。`collections` を `../db` から import |
| `aiFirst.ts` | import パスのみ変更 |
| `comparison.ts` | import パスのみ変更 |
| `incident.ts` | import パスのみ変更 |
| `testing.ts` | import パスのみ変更 |
| `system.ts` | `server/_core/systemRouter.ts` を移植。`from "../adapters/notify"` に変更 |

### Webhook（`functions/src/webhooks/`）

| ファイル | 内容 | 主な変更点 |
|---|---|---|
| `stripe.ts` | Stripe Webhook ハンドラー | `server/webhooks/stripe.ts` をコピーし、import パスを `../db`/`../bappy`/`../adapters/notify` 等に変更。`express.raw()` ミドルウェアを Router レベルで適用 |

---

## 変更ファイル（既存ファイルの修正）

### `client/src/lib/trpc.ts`

**変更箇所:** `AppRouter` の import 元

```typescript
// 変更前
import type { AppRouter } from "../../../server/routers";

// 変更後
import type { AppRouter } from "../../../functions/src/router";
```

フロントエンドの型情報を Cloud Functions の `AppRouter` 型から取得するように変更。これにより、tRPC の型安全性が Cloud Functions のルーター定義に基づくようになる。

### `client/src/main.tsx`

**変更箇所:** tRPC クライアントの URL 設定

```typescript
// 追加されたロジック
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_URL ?? "";
const TRPC_URL = FUNCTIONS_BASE_URL
  ? `${FUNCTIONS_BASE_URL}/api/trpc`
  : "/api/trpc";
```

`VITE_FUNCTIONS_URL` 環境変数が設定されている場合は Cloud Functions の URL を使用し、未設定の場合は従来の同一オリジン（`/api/trpc`）にフォールバックする。これにより、**移行期間中は Manus の Express サーバーをそのまま使い続けることができ**、デプロイ後に環境変数を設定するだけで切り替えが完了する。

---

## 依存関係（`functions/package.json`）

| パッケージ | バージョン | 用途 |
|---|---|---|
| `firebase-functions` | ^6.3.2 | Cloud Functions ランタイム |
| `firebase-admin` | ^14.1.0 | Firestore・Auth アクセス |
| `@trpc/server` | ^11.18.0 | tRPC サーバー |
| `express` | ^4.21.2 | HTTP サーバー |
| `cors` | ^2.8.5 | CORS ミドルウェア |
| `superjson` | ^1.13.3 | tRPC シリアライザー |
| `stripe` | ^22.2.1 | Stripe 決済 |
| `resend` | ^6.12.4 | メール送信 |
| `zod` | ^4.1.12 | バリデーション |
| `axios` | ^1.18.1 | HTTP クライアント（Bappy API） |
| `nanoid` | ^5.1.5 | ID 生成 |
| `qrcode` | ^1.5.4 | QR コード生成 |

---

## デプロイ手順

### 1. Firebase CLI でログイン

```bash
firebase login
```

### 2. 環境変数（シークレット）を設定

```bash
cd /home/ubuntu/yah-mobile-v2
firebase functions:secrets:set BAPPY_CLIENT_ID
firebase functions:secrets:set BAPPY_CLIENT_SECRET
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set BUILT_IN_FORGE_API_KEY
firebase functions:secrets:set BUILT_IN_FORGE_API_URL
```

### 3. Cloud Functions をデプロイ

```bash
firebase deploy --only functions
```

デプロイ完了後、以下のような URL が表示される：

```
https://api-xxxxxxxx-an.a.run.app
```

### 4. フロントエンドの接続先を切り替え

Manus のシークレット設定で `VITE_FUNCTIONS_URL` に上記 URL を設定する。

### 5. Stripe Webhook URL を変更

[Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) で既存の Webhook URL を変更：

```
https://api-xxxxxxxx-an.a.run.app/api/stripe/webhook
```

---

## 注意事項

### geoip-lite の非対応

Cloud Functions 環境では `geoip-lite` パッケージが使用できないため、`getGeoFromIp()` は常に `{ country: null, city: null, timezone: null }` を返す。購入場所の記録機能（`purchaseCountry`/`purchaseCity`/`purchaseTimezone`）は Cloud Functions 移行後は記録されなくなる。

将来的に IP ジオロケーションが必要な場合は、[ipapi.co](https://ipapi.co) や [MaxMind GeoIP2 API](https://www.maxmind.com) 等の外部 API を利用することを検討する。

### 移行期間中の並行稼働

`VITE_FUNCTIONS_URL` が未設定の間は、フロントエンドは従来の Manus Express サーバーに接続し続ける。Cloud Functions のデプロイ・動作確認が完了してから環境変数を設定することで、安全に切り替えができる。

### Firebase Blaze プランが必要

Cloud Functions のデプロイには Firebase Blaze（従量課金）プランが必要。少量の使用であれば無料枠内に収まる。
