# 設計図：アフィリエイト Phase 0 検証最小構成（＋前提修正2件）

- 作成日：2026-07-10
- ステータス：**承認待ち**（承認前にコードは変更しない）
- 元資料：「People's eSIM アフィリエイトプログラム 設計仕様書 v3.0」（Manus AI 作成）
- 方針：v3.0 仕様書の**約1/10の規模**に絞った検証最小構成。目的は「アフィリエイター経由で本当に売れるのか」の1点検証。

---

## 1. 背景・目的

v3.0 仕様書はランク5段階・VAランク制度・VA専用ポータル・各種ボーナス等を含むフル設計だが、
検証フェーズ（手選びの数十人のアフィリエイター）には過剰であり、仕様書内の数値矛盾
（§0 の週50件アウトリーチ vs §11.3 の月3,000〜6,000通、AffiliateFinder Growth Plan の
月500クレジット vs 月6,000通前提）も未解消。そこで本設計では以下の3マイルストーンのみを実装する。

| # | マイルストーン | 種別 | 概要 |
|---|---|---|---|
| M1 | `notifications.isRead` の boolean 統一 | バグ/型修正 | 文字列 `"false"/"true"` と boolean の混在を解消 |
| M2 | AP-06：Stripe Webhook の責務分離 | 堅牢化 | eSIM発行をWebhook同期処理から Firestore トリガーへ移譲 |
| M3 | アフィリエイト検証最小構成 | 新機能 | `?ref=CODE` → 注文紐付け → コンバージョン記録 → 手動支払い |

M1/M2 はアフィリエイトの判断と無関係に価値がある修正。M3 は M2 完了後に着手する
（コンバージョン記録が `status: "fulfilled"` 遷移に依存するため、発行フローを先に安定させる）。

### M3 で作らないもの（明示的スコープ外）

ランク制度・猶予月・コミュニティブースト・各種ボーナス・プロモコード・VA関連一式
（ポータル/ランク/給与）・専用サブドメイン（affiliate.yah.mobi）・Named Database・
アフィリエイター自己登録フロー・CSV自動生成・Wise API・多言語ダッシュボード・
トップアップ注文へのコミッション・USD換算。
これらは「月30本以上売る人が3人出た」等の実績が確認できてから別途設計する。

---

## 2. M1：notifications.isRead の boolean 統一

### 現状（実コード確認済み）

- [functions/src/db/notifications.ts](../functions/src/db/notifications.ts)：`isRead: "false"` / `"true"` を**文字列**で書き込み・クエリ（8, 11, 26, 32, 35, 41行）
- [shared/types.ts:182](../shared/types.ts)：`FsNotification.isRead: "true" | "false"`（文字列型）
- [client/src/components/mypage/Notifications.tsx](../client/src/components/mypage/Notifications.tsx)：
  - クエリは文字列 `where("isRead", "==", "false")`（31, 92行）
  - 一方 `handleMarkRead` は **boolean** `{ isRead: true }` で updateDoc（84行）→ 同一フィールドに文字列と boolean が混在

> 補足（v3.0 仕様書との差異）：仕様書は「既読通知を拾い続けるサイレントバグ」と記述しているが、
> 実際は boolean `true` は `== "false"` にマッチしないため**現時点で機能上の実害はほぼない**。
> ただし型混在は「boolean で未読クエリを書いた瞬間に壊れる」地雷であり、統一する価値がある。

### 変更方針

1. `shared/types.ts`：`isRead: boolean` に変更。
2. `functions/src/db/notifications.ts`：書き込みを `isRead: false` / `true` に、クエリを移行期間対応の
   `where("isRead", "in", [false, "false"])` に変更（41行のフィルタも同様）。
3. `client/src/components/mypage/Notifications.tsx`：クエリを `where("isRead", "in", [false, "false"])` に、
   ローカル型を `boolean` に変更（84行の boolean 書き込みが正となる）。
4. **既存データ移行**：本番 `notifications` コレクションの文字列値を boolean に変換する
   ワンショットスクリプト（scratchpad に作成・リポジトリにはコミットしない）。
   運用ルールに従い、**実行前に読み取り専用で対象件数を確認**し、0件なら実行しない。
5. 移行完了確認後、後続コミットで `in` クエリを `== false` に簡素化（任意・急がない）。

デプロイ順序：コード（functions + hosting）を先にデプロイ → 移行スクリプト実行。
この順なら移行後に文字列が新規発生しない。

---

## 3. M2：AP-06 — Stripe Webhook の責務分離

### 現状（実コード確認済み）

[functions/src/webhooks.ts](../functions/src/webhooks.ts) の `handleCheckoutCompleted`（181〜259行）が
`status: "paid"` 更新 → 受付メール → `fulfillEsim()`（eSIM発行 → `status: "fulfilled"` → 発行メール）まで
**Webhook ハンドラ内で同期実行**している。eSIM プロバイダ API が遅延すると Stripe Webhook の
タイムアウト・リトライを誘発する。

既存の安全網（変更しない）：
- `fulfillEsim` は `getEsimLinkByOrderId` による冪等ガードあり（267〜270行）
- 発行失敗時は `status: "pending_retry"` → [esimRetryService.ts](../functions/src/esimRetryService.ts) の
  `esimRetryJob`（scheduled）が回収
- `hungOrderMonitor`（scheduled）が滞留注文を監視

### 変更方針

1. `fulfillEsim` と関連ヘルパを `functions/src/webhooks.ts` から新規モジュール
   `functions/src/fulfillment.ts` へ抽出（ロジック変更なし・移動のみ）。
2. [functions/src/triggers.ts](../functions/src/triggers.ts) に `onOrderPaid` を追加：
   `onDocumentUpdated("orders/{orderId}")` で `before.status !== "paid" && after.status === "paid"`
   のとき `fulfillEsim(order)` を実行。既存トリガー（`onEsimSyncRequested` 等）の実装パターンに合わせる。
3. `handleCheckoutCompleted` は `updateOrder(..., { status: "paid", ... })` と受付メール送信までで終了。
   258行の `await fulfillEsim(order)` を削除。
4. 冪等性：`fulfillEsim` 既存ガード＋トリガー側の遷移条件（before/after 比較）の二重防御。
   Bappy Webhook（`webhooks_bappy.ts`）等が `fulfillEsim` を参照している場合は import 先のみ変更。

### 影響・リスク

- **決済〜発行のクリティカルパスの変更**。発行がトリガー経由になることで数秒の遅延が生じるが許容範囲。
- 万一トリガーが失火しても `hungOrderMonitor` / `esimRetryJob` が回収する（既存安全網）。
- `functions/src` の変更にあたるため、本設計図の承認をもって着手する（CLAUDE.md 準拠）。
  デプロイ（`firebase deploy --only functions`）は実装・テスト後に**別途ユーザー指示**で行う。

---

## 4. M3：アフィリエイト検証最小構成

### 4.1 全体像

```
① 訪問:  yah.mobi/?ref=CODE
      → クライアントが localStorage に {code, expiresAt(+30日)} を保存（last-click 優先）
② 購入:  usePurchaseCheckout → ordersInitCheckout に affiliateCode を同送
      → サーバーで code を検証（実在・active・自己購入でない）→ orders に affiliateCode/affiliateId を保存
      → 無効な code は null 化して購入は継続（アフィリエイト層の不具合で決済を止めない）
③ 発行:  status → "fulfilled"（M2 のフロー）
      → 新トリガーが affiliate_conversions/{orderId} を作成（status: "pending", 14日保留）
④ 確定:  日次スケジューラが 14日経過した pending → "confirmed"
      返金（status → "refunded"）時は conversion を "cancelled"（支払済みなら "flagged"）
⑤ 支払:  管理画面で confirmed 一覧を確認 → Wise 手動送金 → 管理画面で "paid" にマーク
```

コミッションは**一律・アフィリエイター個別設定**（`affiliates/{uid}.commissionRate`、初期値 0.20 = 20%）。
ランクなし。金額は円建て（`amountJpy × commissionRate`、円未満切り捨て）。

### 4.2 データ設計（default DB に追加・Named Database は使わない）

```
affiliates/{uid}                     ← Firebase Auth UID をドキュメントID
  code: string            // 一意な紹介コード（英数字とハイフン、4〜32字）。管理者が発行
  displayName: string
  email: string
  commissionRate: number  // 0.20 など。個別調整可
  status: "active" | "suspended"
  createdAt, updatedAt: number

affiliate_conversions/{orderId}      ← 注文IDをそのままIDに（冪等性の担保）
  affiliateId: string     // affiliates の uid
  affiliateCode: string
  orderId: string
  saleAmountJpy: number
  commissionRate: number  // 注文発生時点のレートを凍結
  commissionJpy: number
  status: "pending" | "confirmed" | "cancelled" | "paid" | "flagged"
  createdAt, confirmedAt, paidAt, updatedAt: number | null

orders/{orderId}（既存に追加。shared/types.ts の FsOrder にも追記）
  affiliateCode: string | null
  affiliateId: string | null
```

### 4.3 対象ファイルと変更内容

**クライアント**

| ファイル | 変更 |
|---|---|
| `client/src/lib/affiliateRef.ts`（新規） | `captureRef()`：`window.location.search` から `ref` を読み localStorage 保存（30日期限・last-click 上書き）。`getActiveRef()`：未期限の code を返す。**`/` → `/app` の Redirect でクエリが落ちるため、wouter のルーティング前（App マウント時）に `window.location.search` から捕捉する** |
| [client/src/App.tsx](../client/src/App.tsx) | マウント時に `captureRef()` を1回呼ぶ |
| [usePurchaseCheckout.ts](../client/src/components/app/purchase-drawer/usePurchaseCheckout.ts) | `initCheckout` の payload に `affiliateCode: getActiveRef()` を追加（28〜36, 56〜64行） |
| `client/src/pages/AffiliatePage.tsx`（新規）＋ App.tsx にルート `/affiliate` | ログイン中ユーザーの `affiliates/{uid}` が存在すれば、自分の紹介リンク・コンバージョン一覧・確定/保留/支払済みの集計を表示。英語のみ（Phase 0 の対象は海外アフィリエイター）。affiliate 未登録ユーザーには案内文のみ |
| `client/src/pages/admin`（既存 AdminPage のタブ追加 `/admin/affiliates`） | アフィリエイター作成（code/名前/email/uid/rate）・一覧・conversion の支払マーク（confirmed → paid の一括更新） |

**共有**

| ファイル | 変更 |
|---|---|
| [shared/schemas.ts:53](../shared/schemas.ts) | `OrdersInitCheckoutInput` に `affiliateCode: z.string().min(4).max(32).regex(/^[a-zA-Z0-9-]+$/).nullish()` を追加 |
| `shared/types.ts` | `FsOrder` に `affiliateCode` / `affiliateId`、新規 `FsAffiliate` / `FsAffiliateConversion` を追加 |

**Functions（承認後に着手・デプロイは別途指示）**

| ファイル | 変更 |
|---|---|
| [functions/src/callables/orders.ts](../functions/src/callables/orders.ts) | `ordersInitCheckout` で `affiliateCode` を受領 → `affiliates` を `where("code","==",code)` で照合。有効（存在・`status=="active"`・`affiliate.uid !== 購入者uid`〔自己購入排除〕）なら orders 作成時（137〜156行）に `affiliateCode`/`affiliateId` を保存。無効なら両方 `null`（エラーにしない） |
| [functions/src/triggers.ts](../functions/src/triggers.ts) | `onOrderAffiliateStatusChanged`（`onDocumentUpdated("orders/{orderId}")`）を追加：<br>・`→ "fulfilled"` 遷移 かつ `affiliateId` あり → `affiliate_conversions/{orderId}` を create（存在すれば何もしない）<br>・`→ "refunded"` 遷移 → conversion が `pending/confirmed` なら `cancelled`、`paid` なら `flagged`（手動確認） |
| [functions/src/scheduled.ts](../functions/src/scheduled.ts) | `confirmAffiliateConversions`（日次 00:00 UTC）：`status=="pending"` かつ `createdAt <= now - 14日` を `confirmed` に |
| `functions/src/db/affiliates.ts`（新規） | affiliates / affiliate_conversions のアクセサ（既存 `db/` パターンに合わせる） |

**セキュリティルール（承認後に着手・デプロイは別途指示）**

[firestore.rules](../firestore.rules) に追加：

```
match /affiliates/{affiliateId} {
  allow read: if isAdmin() || (isAuthenticated() && request.auth.uid == affiliateId);
  allow write: if isAdmin();   // 作成・レート変更は管理者のみ。一般ユーザー書き込み不可
}
match /affiliate_conversions/{conversionId} {
  allow read: if isAdmin() || (isAuthenticated() && resource.data.affiliateId == request.auth.uid);
  allow update: if isAdmin()   // 支払マーク（confirmed → paid, paidAt 付与）のみ管理画面から
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','paidAt','updatedAt']);
  allow create, delete: if false;  // 作成は Functions（Admin SDK）のみ
}
```

orders への `affiliateCode` 後付け改ざんは、既存ルール（update は `hiddenByUser`/`updatedAt` のみ許可）で
構造的に不可能（変更不要）。

### 4.4 不正対策（Phase 0 で入れるもののみ）

- **自己購入排除**：checkout 時に `affiliate.uid == 購入者uid` なら紐付けない（サーバーサイド）。
- **冪等性**：conversion のドキュメントID = orderId。重複計上が構造的に不可能。
- **返金対応**：`refunded` 遷移で自動 cancel（§4.3 トリガー）。
- **レート凍結**：conversion に注文時点の rate を保存。後からのレート変更が過去に波及しない。
- 自動フラグ（CVR異常・同一IP等）は Phase 0 では**入れない**。手選びの数十人＋管理画面での目視で足りる。

### 4.5 v3.0 仕様書との差異（CLAUDE.md 運用ルール3に基づく明記）

| 項目 | v3.0 仕様書 | 本設計 | 理由 |
|---|---|---|---|
| ランク制度 | 5段階＋猶予月＋ブースト | なし（個別レートのみ） | 単発購入商材に対して過剰。実績確認後に再設計 |
| データベース | Named Database `affiliate-db` | default DB に collection 追加 | SDK設定・ルールデプロイの二重化を回避。規模的に不要 |
| ドメイン | affiliate.yah.mobi 別サイト | yah.mobi 内ルート `/affiliate` | Hosting 追加設定・App Check ドメイン許可の追加作業を回避 |
| 登録フロー | 自己登録＋審査 | 管理者手動発行 | Phase 0 は手選びの数十人のみ |
| 通貨 | USD 基準 | JPY 基準 | 実データ（amountJpy）と一致。換算層を持たない |
| Cookie 30日 | Cookie | localStorage（30日期限つき） | 実装が単純でサードパーティCookie規制の影響もない |
| isRead バグの説明 | 「既読を拾い続けるサイレントバグ」 | 実害は現状ほぼなし・型統一として実施 | 実コード確認の結果（§2 補足） |
| 支払CSV自動生成 | Phase 1 で実装 | なし（管理画面の集計表示のみ） | 数十人規模なら手動で足りる |
| 源泉徴収の組み込み | 加重平均10.32%をモデル計上 | **実装しない**（支払いは全額、税務は保留） | 仕様書の税制理解に疑義あり（台湾20%は台湾側支払者の制度）。**税理士確認が完了するまで海外アフィリエイターへの支払い運用は開始しない** |

### 4.6 実装前に必要な非エンジニアリング作業（実装と並行可・ブロッカーではない）

- アフィリエイト規約（コミッション条件・支払条件・禁止事項）の簡易版作成 → `/affiliate` に掲載
- 非居住者へのコミッション支払いに関する税理士確認（§4.5 最終行）
- 特商法・景表法の観点は、進行中の弁護士相談（電気通信事業法）に論点追加を推奨

---

## 5. テスト・検証計画

| 対象 | 方法 |
|---|---|
| 型チェック | `npx tsc --noEmit -p tsconfig.json`＋`functions/` 内 `npm run build` |
| M1 | クライアント：`vitest run --config vitest.client.config.ts`。functions：`npm test`（notifications 関連）。移行スクリプトは実行前に対象件数を読み取り専用で確認 |
| M2 | `functions/` の `webhooks.test.ts` を責務分離後の形に更新＋`onOrderPaid` トリガーのユニットテスト追加。Firestore エミュレータ（Java `~/jdk21`）で paid→fulfilled 遷移を確認 |
| M3 callable | `orders.ts` のユニットテスト：有効コード付与・無効コード null 化・自己購入排除 |
| M3 トリガー | fulfilled→conversion 作成（冪等）・refunded→cancel をエミュレータで確認 |
| M3 ルール | `vitest.rules.config.ts` に affiliates / affiliate_conversions のテスト追加（本人以外読めない・一般ユーザー書けない・admin の paid マークは指定キーのみ） |
| UI | プレビュー（Node22 dev server）で `?ref=CODE` → localStorage 保存 → checkout payload 同送を Network で確認。`/affiliate`・`/admin/affiliates` の表示確認 |
| コミット | 各マイルストーン完了ごとに `dev` へ分割コミット（M1 → M2 → M3） |

デプロイ（functions / rules / hosting いずれも）は実装・検証完了後、**別途ユーザーの明示指示**で行う。
dev チャンネル確認時の注意：バックエンドは本番共有のため、購入テストは行わない
（`?ref` 捕捉と payload 送信の確認まで。トリガー検証はエミュレータで行う）。

---

## 6. リスクと代替案

| リスク | 対応 |
|---|---|
| M2 が決済クリティカルパスに触れる | 冪等ガード既存＋トリガー遷移条件の二重防御。安全網（retryJob/hungOrderMonitor）は無変更。M2 単独でコミット・デプロイし、M3 前に本番で数日観察する選択肢を推奨 |
| トリガー失火で conversion が作られない | 注文側に `affiliateId` が残るため、管理画面で突合可能（後追い作成も可能） |
| 無効コードの拡散（typo等） | 購入は止めず null 化。コンバージョンが付かないだけ |
| 支払い済み後の返金 | conversion を `flagged` にして手動確認（自動相殺は Phase 0 ではしない） |
| 代替案A：conversion 記録もスプレッドシート手動 | 実装ゼロだが購入との突合が属人化・即時性なし → 不採用（トリガー1本の実装コストは低い） |
| 代替案B：M2 をスキップし conversion トリガーだけ追加 | 可能（conversion は fulfilled 遷移だけ見るため技術的には独立）。ただし Webhook タイムアウトリスクが残置される → M2 実施を推奨。ユーザー判断でスキップ可 |

---

## 7. 承認をお願いする事項

1. 本設計（M1〜M3）の実装着手
2. `functions/src` および `firestore.rules` への変更（内容は §3・§4.3 のとおり）
3. デフォルトコミッションレート **20%**（個別調整可）でよいか
4. M2 を M3 と切り離して先行コミットするか（推奨）、一括で進めるか
