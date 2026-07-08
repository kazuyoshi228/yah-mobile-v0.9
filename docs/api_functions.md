# Cloud Functions API 仕様（yah.mobile）

最終更新: 2026-07-09（現行実装に整合。プロバイダは **eSIMAccess 単一**、Bappy は休眠）。
Firebase Cloud Functions v2。リージョンは特記なき限り `asia-northeast1`。
種別は **Callable**（`onCall`・App Check 必須）／ **HTTP**（`onRequest`・Webhook 等）／ **Scheduled**（`onSchedule`）／ **Firestore Trigger**。

入力スキーマの実体は `shared/schemas.ts`（zod）。Callable は undefined→null 変換のため任意項目は `.nullish()`。

## 現行関数一覧（21・2026-07-09）
- **Callable(6)**: `ordersInitCheckout` `ordersInitTopupCheckout` `orderRetryPayment` `adminRefundOrder` `submitContactInquiry` `analyticsGetAiInsights`
- **HTTP(6)**: `stripeWebhook` `esimaccessWebhook` `bappyWebhook`(休眠) `analyticsEvents` `clientErrorLog` `llmsTxt`
- **Scheduled(4)**: `esimRetryJob` `hungOrderMonitor` `providerHealthCheck`(15分・残高/死活) `updateCurrencyRates`
- **Trigger(5)**: `onEsimSyncRequested` `onContactCreated` `onAllowedEmailWritten` `onInquiryUpdated` `onUserUpdated`

> 発行/同期/topup/cancel は **Provider抽象**（`functions/src/providers/*`・`getProvider(order.provider)`）経由。新規販売は eSIMAccess。返金は `adminRefundOrder`/自動(Lane A)→`executeRefund`→Stripe＋`charge.refunded` webhook確定。詳細は各節。

---

## Callable Functions（クライアントから `httpsCallable` 経由）

クライアント側ラッパー：`client/src/lib/callable.ts`（`CALLABLE` 定数 / `callFunction` / `useCallableMutation`）。
全 Callable は `enforceAppCheck: true`。認証必須のものは `request.auth` を検証する。

### `ordersInitCheckout` — 初回購入のチェックアウト作成
`functions/src/callables.ts:403`

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| bappyPlanId | string(min1) | ✅ | 購入プランの Bappy プランID |
| origin | string(url) | ✅ | Stripe 戻りURLの生成元 |
| termsConsented | boolean | ✅ | 利用規約同意 |
| privacyConsented | boolean | ✅ | プライバシー同意 |
| marketingConsented | boolean | ✅ | マーケティング同意 |
| timezone | string(max100) | – | 端末タイムゾーン |

**出力**: `{ checkoutUrl, orderId }`（Stripe Checkout へリダイレクト）。
**副作用**: `orders` に `status:"pending"` の注文を作成（`planName` 保存済み）。レート制限あり。

### `ordersInitTopupCheckout` — トップアップのチェックアウト作成
`functions/src/callables.ts:509`

| 項目 | 型 | 必須 |
|---|---|---|
| esimLinkUuid | string(min1) | ✅ |
| bappyPlanId | string(min1) | ✅ |
| origin | string(url) | ✅ |
| timezone | string(max100) | – |

**副作用**: 対象 eSIM の所有者検証（IDOR 対策）後、トップアップ注文を作成。

### `orderRetryPayment` — 失敗注文の支払いリトライ
`functions/src/callables.ts:250`

| 項目 | 型 | 必須 |
|---|---|---|
| orderId | string(min1) | ✅ |
| origin | string(url) | ✅ |

**出力**: 新しい `checkoutUrl`。所有者検証あり。

### `submitContactInquiry` — お問い合わせ送信
`functions/src/callables.ts:322`

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| name | string(max100) | – | |
| email | string(email,max254) | ✅ | |
| location | string | – | |
| category | string | – | |
| detail | string | – | |
| message | string(max2000) | ✅ | |
| orderId | string | – | |
| formStartTime | number | ✅ | 送信までの経過時間（ボット検出） |
| _hp | string | – | ハニーポット（値が入っていれば拒否） |

**副作用**: `contact_inquiries` へ作成 → `onContactCreated` トリガでオーナー通知。

### 管理者向け Callable
| 関数 | 位置 | 用途 |
|---|---|---|
| `analyticsGetAiInsights` | callables.ts:76 | 期間集計を LLM で要約（`period: 24h/7d/30d/90d`、出力は5000字にクランプ）。`forgeApiKey` 使用 |
| `incidentRunRetryNow` | callables.ts:175 | eSIM 発行リトライを即時実行 |
| `adminMigrateIsActiveToBoolean` | callables.ts:185 | 移行用（`plans.isActive` の boolean 正規化） |

---

## HTTP Functions（`onRequest`）

| 関数 | 位置 | 用途 | 認証 |
|---|---|---|---|
| `stripeWebhook` | webhooks.ts | Stripe 決済イベント受信 → eSIM 発行（Provider抽象）／`charge.refunded`→返金確定 | Stripe 署名検証 |
| `esimaccessWebhook` | webhooks_esimaccess.ts | eSIMAccess 状態通知（ORDER/ESIM_STATUS/DATA/VALIDITY_USAGE）→ 裏取りで esim_links 更新・IN_USEで lastActiveAt 記録 | **多層防御**：秘密トークンURL＋送信元IP許可＋/esim/query裏取り＋notifyId冪等 |
| `bappyWebhook`（休眠） | webhooks_bappy.ts | 旧Bappy eSIM 状態受信（表示状態のみ・非財務）。新規販売はeSIMAccessのため休眠 | **OMAX側で認証**（当方変更しない・[design_bappy_webhook_dormant.md](./design_bappy_webhook_dormant.md)） |
| `analyticsEvents` | analytics.ts | フロントの解析イベント収集（同意連動） | – |
| `clientErrorLog` | clientErrors.ts | フロント実行時エラー収集（S1b・PII非送信） | – |
| `llmsTxt` | llmsTxt.ts | `/llms.txt` を動的生成（AI エージェント向け） | 公開 |

---

## Scheduled Functions（`onSchedule`）

| 関数 | 位置 | スケジュール | 用途 |
|---|---|---|---|
| `esimRetryJob` | scheduled.ts | 定期 | `esim_retry_jobs` を処理して eSIM 発行を再試行（最大3回・最終失敗で自動返金Lane A） |
| `hungOrderMonitor` | scheduled.ts | 定期 | `orders status=="provisioning"` の滞留を検知しオーナー通知 |
| `providerHealthCheck` | scheduled.ts | every 15 minutes | eSIMAccess 疎通＋**残高**確認。API down→販売停止ガード自動ON／残高 < $20 で警告。回復で自動解除通知 |
| `updateCurrencyRates` | currencyRates.ts | 定期 | 為替レート更新 |

---

## Firestore Triggers

| 関数 | 位置 | トリガ | 用途 |
|---|---|---|---|
| `onEsimSyncRequested` | triggers.ts | onDocumentUpdated `esim_links` | `syncRequestedAt` 更新で **Provider（eSIMAccess）** から使用量/期限を同期＋IN_USEで lastActiveAt 記録 |
| `onContactCreated` | triggers.ts:124 | onDocumentCreated `contact_inquiries` | オーナー通知 |
| `onAllowedEmailWritten` | triggers.ts:193 | onDocumentWritten `allowed_emails` | 招待制メールの整合 |
| `onInquiryUpdated` | triggers.ts:210 | onDocumentUpdated `contact_inquiries` | ステータス変更処理 |
| `onUserUpdated` | triggers.ts:222 | onDocumentUpdated `users` | プロフィール変更処理 |

---

## Secrets（Secret Manager）

`defineSecret` で参照。主なもの：`BUILT_IN_FORGE_API_KEY`（LLM）、`SLACK_WEBHOOK_URL`（通知）、`GMAIL_USER` / `GMAIL_PASS`（メール）、Stripe 系。
🚨 シークレット値はコード/ドキュメントに記載しない。
