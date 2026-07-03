# yah.mobi → chat.yah.mobi Webhook 連携仕様書

**作成日:** 2026-06-27  
**送信元:** yah.mobi（`https://yah.mobi`）  
**送信先:** chat.yah.mobi（`https://chat.yah.mobi`）  
**バージョン:** v1.1

---

## 概要

yah.mobi は購入・プラン変更・eSIM 状態変化などのイベントが発生した際に、chat.yah.mobi の Webhook エンドポイントへ POST リクエストを送信します。chat.yah.mobi はこれらのイベントを受信し、AI チャットサポートの文脈情報（購入履歴・eSIM 状態・返金処理など）に活用します。

---

## 認証

すべてのリクエストに以下のヘッダーを付与します。

```
X-Webhook-Secret: <共有シークレット>
Content-Type: application/json
```

**シークレットの共有方法:** `YAH_CHAT_WEBHOOK_SECRET` の値は Slack DM または 1Password などの安全な経路で別途共有します。このドキュメントには記載しません。

---

## エンドポイント一覧

| # | エンドポイント | メソッド | 送信タイミング |
|---|---|---|---|
| 1 | `/api/webhooks/plans-updated` | POST | 自社プランの追加・変更・廃止時 |
| 2 | `/api/webhooks/competitor-plans-updated` | POST | 競合プラン情報の週次更新時 |
| 3 | `/api/webhooks/customer-profile` | POST | ユーザー新規登録時・プロファイル変更時 |
| 4 | `/api/webhooks/purchase-created` | POST | Stripe 決済完了時（eSIM 発行後） |
| 5 | `/api/webhooks/esim-status` | POST | eSIM インストール確認時・データ使用量更新時（1時間ごと） |
| 6 | `/api/webhooks/health` | GET | 疎通確認 |

---

## エンドポイント詳細

### 1. 自社プラン同期 — `POST /api/webhooks/plans-updated`

**送信タイミング:** 管理画面でプランを追加・変更・廃止したとき

**ペイロード:**

```json
{
  "plans": [
    {
      "externalId": "plan_jp_3day",
      "name": "Japan 3-Day Plan",
      "dataGb": 3,
      "durationDays": 3,
      "priceYen": 1500,
      "bestFor": "Short trips",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `externalId` | string | ✅ | yah.mobi 側のプラン識別子 |
| `name` | string | ✅ | プラン表示名 |
| `dataGb` | number | ✅ | データ容量（GB） |
| `durationDays` | number | ✅ | 有効日数 |
| `priceYen` | number | ✅ | 価格（円） |
| `bestFor` | string | ✅ | 推奨用途の説明文 |
| `isActive` | boolean | ✅ | 販売中かどうか |
| `sortOrder` | number | ✅ | 表示順 |

---

### 2. 競合プラン同期 — `POST /api/webhooks/competitor-plans-updated`

**送信タイミング:** 週次バッチで競合他社のプラン情報を更新したとき

**ペイロード:**

```json
{
  "plans": [
    {
      "externalId": "competitor_a_3day",
      "competitorName": "Competitor A",
      "planName": "3-Day Japan",
      "dataGb": 3,
      "durationDays": 3,
      "priceYen": 1800,
      "sourceUrl": "https://example.com/plans"
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `externalId` | string | ✅ | 競合プランの識別子 |
| `competitorName` | string | ✅ | 競合他社名 |
| `planName` | string | ✅ | 競合プラン名 |
| `dataGb` | number | ✅ | データ容量（GB） |
| `durationDays` | number | ✅ | 有効日数 |
| `priceYen` | number | ✅ | 価格（円） |
| `sourceUrl` | string | — | 情報取得元 URL |

---

### 3. 顧客プロファイル — `POST /api/webhooks/customer-profile`

**送信タイミング:** ユーザーが新規登録したとき、またはプロファイルを変更したとき

> **重要:** `email` フィールドがチャットサポートとユーザーを紐付けるキーです。

**ペイロード:**

```json
{
  "externalUserId": "openid_abc123",
  "email": "user@example.com",
  "name": "Taro Yamada",
  "language": "ja",
  "registeredAt": "2026-06-27T05:00:00.000Z"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `externalUserId` | string | ✅ | yah.mobi のユーザー識別子（Manus OpenID） |
| `email` | string | ✅ | メールアドレス（チャット紐付けキー） |
| `name` | string | ✅ | 表示名 |
| `language` | string | ✅ | 言語コード（`ja` / `en` / `zh-TW` / `ko` / `th`） |
| `registeredAt` | string | ✅ | 登録日時（ISO 8601 UTC） |

---

### 4. 購入完了 — `POST /api/webhooks/purchase-created`

**送信タイミング:** Stripe 決済が完了し、eSIM が発行された直後

> **重要:** `stripePaymentIntentId` と `email` は OMAX 自動返金処理に使用します。

**ペイロード:**

```json
{
  "orderId": "123",
  "planId": "plan_jp_3day",
  "amount": 1500,
  "stripePaymentIntentId": "pi_3Qx...",
  "email": "user@example.com",
  "externalUserId": "openid_abc123",
  "planName": "plan_jp_3day",
  "dataGb": 0,
  "durationDays": 0,
  "status": "active",
  "purchasedAt": "2026-06-27T05:40:00.000Z",
  "expiresAt": "2026-06-27T05:40:00.000Z"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `orderId` | string | ✅ | yah.mobi の注文 ID |
| `planId` | string | ✅ | Bappy プラン ID（例: `plan_jp_3day`） |
| `amount` | number | ✅ | 実際の支払い金額（円・クーポン適用後） |
| `stripePaymentIntentId` | string | ✅ | Stripe Payment Intent ID（`pi_` で始まる）。OMAX 自動返金に必要 |
| `email` | string | ✅ | 購入者メールアドレス。返金通知メール送信に必要 |
| `externalUserId` | string | — | yah.mobi のユーザー識別子 |
| `planName` | string | — | プラン名（Bappy プラン ID と同値） |
| `dataGb` | number | — | データ容量（現時点では `0`。`plans-updated` で補完） |
| `durationDays` | number | — | 有効日数（現時点では `0`。`plans-updated` で補完） |
| `status` | string | — | `"active"` 固定（発行直後） |
| `purchasedAt` | string | — | 購入日時（ISO 8601 UTC） |
| `expiresAt` | string | — | 有効期限（ISO 8601 UTC・`esim-status` で上書き） |

> **補足:** `dataGb` / `durationDays` は現時点で `0` が送信されます。正確な値は `plans-updated` Webhook で同期済みのプランデータから補完してください。`expiresAt` は `esim-status` Webhook で正確な値に更新されます。

---

### 5. eSIM 状態更新 — `POST /api/webhooks/esim-status`

**送信タイミング:** eSIM のインストール確認時、データ使用量更新時（1時間ごと推奨）

**ペイロード:**

```json
{
  "externalOrderId": "123",
  "externalUserId": "openid_abc123",
  "iccid": "8981100012345678901",
  "status": "active",
  "activatedAt": "2026-06-27T06:00:00.000Z",
  "expiresAt": "2026-06-30T06:00:00.000Z",
  "dataUsedMb": 512,
  "dataTotalMb": 3072
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `externalOrderId` | string | ✅ | yah.mobi の注文 ID |
| `externalUserId` | string | ✅ | yah.mobi のユーザー識別子 |
| `iccid` | string | — | eSIM の ICCID |
| `status` | string | ✅ | `not_installed` / `installed` / `active` / `expired` / `error` |
| `activatedAt` | string | — | アクティベート日時（ISO 8601 UTC） |
| `expiresAt` | string | — | 有効期限（ISO 8601 UTC） |
| `dataUsedMb` | number | — | 使用済みデータ量（MB） |
| `dataTotalMb` | number | — | 総データ容量（MB） |

---

### 6. 疎通確認 — `GET /api/webhooks/health`

**送信タイミング:** 任意（システム起動時・監視用）

**期待するレスポンス:**

```json
{ "ok": true }
```

---

## レスポンス仕様

| HTTP ステータス | 意味 |
|---|---|
| `200 OK` | 受信成功 |
| `4xx` | リクエスト不正（シークレット不一致など） |
| `5xx` | chat.yah.mobi 側のエラー |

yah.mobi 側は `200` 以外のレスポンスをエラーとしてログに記録します。リトライは行いません（fire-and-forget）。

---

## セキュリティ注意事項

- `YAH_CHAT_WEBHOOK_SECRET` の値はこのドキュメントに記載しません。Slack DM または 1Password などの安全な経路で共有してください。
- chat.yah.mobi 側では `X-Webhook-Secret` ヘッダーの値を検証し、一致しない場合は `401` または `403` を返してください。
- HTTPS 通信のみ使用します。

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| v1.0 | 2026-06-20 | 初版作成 |
| v1.1 | 2026-06-27 | `purchase-created` に `stripePaymentIntentId`（必須）・`email`（必須）を追加。フィールド名を `orderId` / `planId` / `amount` に統一 |
