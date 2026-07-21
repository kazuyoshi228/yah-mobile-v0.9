# 設計図：まとめ買い P0-lite（数量×ラダー割引・実コード対応版）

対象: `dev` ／ 作成: 2026-07-19 ／ ステータス: **設計（要承認→実装）**
親ドキュメント: まとめ買いプラン設計図（2026-07-17・戦略確定版）。本書はその P0 を「lite」に絞った実施設計。

## スコープ（やる / やらない）

**やる**: 数量セレクタ＋ラダー割引（2枚5%〜5枚20%）＋複数枚発行＋複数QR表示＋`party_size`/`bulk_qty` 計測。フラグで即無効化可能。
**やらない（P0-full 以降・attach rate 実測後）**: 固有リンク配布・開通ステータス追跡・幹事ダッシュボード・返金セルフサービス・**ラインナップ3段化**（ラダーは現行ラインナップの上に載せる。3段化は別意思決定）・ガイドへの焼き込み。

## 設計原則

1. **価格計算はサーバーが正**。クライアントは表示のみ（tiers を公開ドキュメントから読む）。クライアントから価格・割引率は一切受け取らない。
2. **qty=1 の挙動を1ビットも変えない**。単品購入は従来と同一パス・同一 transactionId・同一メール。まとめ買いコードはすべて `quantity >= 2` の分岐内。
3. **既存の防御（2026-07-19 実装）と整合**: in-flight 排他・返金×リトライ競合ガード・部分返金ガードはそのまま活きる形で拡張する。

---

## 1. SSOT — `config/bulkDiscount`（新コレクション）

`system_config` は rules で admin 限定のため、**クライアントが tiers を読める公開コレクションを新設**（`currency_rates` と同型）:

```
config/bulkDiscount: {
  enabled: false,            // ← デプロイ時は false（ダークローンチ）
  tiers: [ {minQty:2, pct:5}, {minQty:3, pct:10}, {minQty:4, pct:15}, {minQty:5, pct:20} ],
  maxQtyPerOrder: 10,
  marginFloorPct: 55,        // 割引後粗利/枚 ≥ 単品粗利×55% を満たさない段はそのプランに適用しない
  updatedAt: <ms>,
}
```

- **firestore.rules 追加**: `match /config/{docId} { allow read: if true; allow write: if isAdmin(); }`（＋rules テスト）
- functions は Admin SDK で読む。`marginFloorPct` 判定には plan の原価が必要 → plans に `costJpy`（admin のみ書込・**rules の hasOnly に追加**）。原価未設定のプランはフロア判定不能として**割引対象外**（安全側）。
- 割引計算ヘルパー `functions/src/bulk.ts`（新規）: `resolveBulkPricing(plan, qty, config) → { unitPriceJpy, discountPct, totalJpy }`。クライアント用に同ロジックを `client/src/lib/bulk.ts` に写し（表示のみ・サーバーが再計算）。**ユニットテストは両方に**（境界: 1枚/2枚/10枚/11枚→拒否/フロア割れプラン→0%）。

## 2. 注文スキーマ（orders への追加フィールド）

```
quantity: number        // 1〜maxQtyPerOrder（既存注文は undefined = 1 扱い）
unitPriceJpy: number    // 割引後単価
discountPct: number     // 0/5/10/15/20
partySize: number|null  // UI選択値（未選択 null）
fulfilledCount: number  // 発行済み枚数（複数枚のみ使用）
amountJpy               // ← 意味変更なし: 「注文合計（割引後）」。qty=1 では従来どおり単価
```
**webhook の金額検証（`amount_subtotal === order.amountJpy`）は無変更で成立**（Stripe line_item を unit_amount=割引後単価 × quantity にするため subtotal=合計）。rules の orders 節は client 書込を許さないので変更不要。

## 3. Checkout（callable ＋ Stripe）

- `shared/schemas.ts` `OrdersInitCheckoutInput` に `quantity: z.number().int().min(1).max(10).nullish()`（nullish→1。topup は対象外なので `OrdersInitTopupCheckoutInput` は不変）。
- `callables/orders.ts`（ordersInitCheckout）: config 読取 → `resolveBulkPricing` → order 作成（§2フィールド）→ `createCheckoutSession` へ `unitAmountJpy`/`quantity` を渡す。
- `stripe.ts` `createCheckoutSession`: `unit_amount: unitAmountJpy, quantity`（現在は `unit_amount: amountJpy, quantity: 1`）。`product_data.name` に `×N` を付記。
- **クーポン併用の遮断**: `allow_promotion_codes: quantity >= 2 ? false : true`（ラダー×promoのスタックでマージンフロア割れを防ぐ）。
- `orderRetryPayment` は order 保存値（unitPriceJpy/quantity）から同条件で再生成（失効チェックは実装済み）。

## 4. 複数枚発行 — 状態機械（本丸）

**共通ヘルパー `issueMissingUnits(order)` を新設し、webhook 本流とリトライの両方が同じ実装を使う**（現在の本流 set とリトライ createEsimLink の非対称を今回で一本化）。

```
transactionId 規約:
  qty=1            → orderId               （従来と完全同一＝挙動不変）
  qty>=2 の unit i → `${orderId}#u${i}`    （eSIMAccess 冪等キー・i は 0..qty-1）

esim_links 追加フィールド: unitIndex: number（qty=1 は 0）

issueMissingUnits(order):
  links = esim_links where orderId == order.id        // 既存 unitIndex の集合
  missing = {0..qty-1} − links.unitIndex
  for i in missing:                                    // 逐次（レート・順序の単純化）
    detail = provider.createEsim({ transactionId: tx(i), ... })
    esim_links.doc(detail.providerRef).set({ ..., unitIndex: i })  // 本流と同一フィールド一式
  return { issued: qty − |missing残|, failedAt: 最初の失敗 or null }
```

**状態遷移**:

```
paid
 └─ issueMissingUnits
     ├─ 全枚成功 ──────────────→ fulfilled（fulfilledCount=qty・発行メール1通「N枚」）
     ├─ 一部/全部失敗 ─────────→ pending_retry（fulfilledCount=n を保存）
     │                            └─ esimRetryJob（5分毎）→ issueMissingUnits を再実行
     │                               冪等性: 既存 unitIndex はスキップ＝二重発行なし
     │                               ├─ 残り全部成功 → fulfilled
     │                               └─ maxRetries 到達:
     │                                   ├─ fulfilledCount == 0 → failed ＋ Lane A 全額自動返金（従来どおり）
     │                                   └─ fulfilledCount > 0 → failed ＋ 🚨自動返金はしない。
     │                                       オーナー緊急通知（発行済n/未発行m・手動で部分返金判断）
     └─ （返金/取消済みは既存ガードが発行前に遮断）
```

- **部分成功時に自動返金しない**のが安全設計の要（発行済み分まで返すと二重損失、未発行分だけの自動部分返金は 90a1146 の部分返金ガードと連携が必要で P0-full 送り）。オーナー通知には Stripe ダッシュボードでの部分返金額（m×unitPriceJpy）を明記する。
- `esimRetryService`: job に `quantity` を追加。処理は `issueMissingUnits` 呼び出しに置換（既存の order-status ガード・成功後通知の隔離はそのまま）。
- Lane A 自動返金の発火条件に `fulfilledCount === 0` を追加。

## 5. 購入UI（ドロワー）

- **新ステップは追加しない**（step index が deep link `/buy/{gb}`→setStep(1) 等に焼き付いているため）。
  - `Step0Plan` 冒頭に party_size チップ `[1][2][3][4][5+]`（1タップ・スキップ可）。選択で価格表示を「1人あたり ¥X（N人でP%OFF）」に切替。flow context に `partySize` 追加。
  - `Step4Payment` に数量セレクタ（初期値=partySize・1〜10・自由編集）＋割引後合計表示＋「必要な枚数だけでもOK」。
- config.enabled=false または未取得時は**セレクタ自体を出さない**（現行UIと同一表示＝ダークローンチ）。
- `Step6Esim`: `esimLinks` を全件リスト表示（unitIndex 順・「1枚目/2枚目…」ラベル＋各QR）。
- i18n 新キー ×5言語（約8キー: partySizeQuestion / perPersonPrice / bulkBadge / qtyLabel / qtyFreeNote / unitLabel 等）。

## 6. 表示系（購入後）

- `OrderDetailPage`: esim_links 購読を全件化（現在 docs[0] のみ）→ 複数QRをアコーディオン/リストで。
- `useMyPageData`: `esimByOrderId` を `Map<orderId, EsimPreview[]>` に（OrderList のプレビューは先頭1枚＋「他N枚」）。
- `buildEsimReadyEmail`: `quantity` を受けて件名・本文に「N枚」を付記（CTA は従来どおりマイページ）。qty=1 は文言不変。

## 7. 計測

- client: `begin_checkout` / `add_payment_info` に `party_size`・`quantity` を付与。
- server: `sendGa4Purchase` に `quantity`/`partySize` を追加（items[0].quantity=N・params `party_size`/`bulk_qty`）。
- **ユーザー作業（デプロイ前・遡及しないため）**: GA4 カスタムディメンション `party_size`・`bulk_qty`（イベントスコープ）を登録。

## 8. テスト計画

- unit（functions）: `resolveBulkPricing` 境界一式／`issueMissingUnits` の冪等（既存2枚→残り3枚のみ発行）／部分最終失敗で自動返金が走らないこと／qty=1 で transactionId が従来形式のままであること。
- unit（client）: `lib/bulk.ts` 境界／Step4 の数量→合計表示。
- rules: `config/*` 公開読取・admin書込のみ／plans `costJpy` 追加後の既存テスト回帰。
- webhooks.test.ts: quantity 付き注文の金額検証（unit×qty=subtotal）。
- 手動QA（dev チャンネル・**非adminアカウント**）: 2枚購入→Step6に2QR→マイページ/注文詳細2枚→メール「2枚」→ GA4 リアルタイムで bulk_qty=2。

## 9. ロールアウト

1. 実装 → 全テスト → `dev` コミット → **enabled:false のまま本番デプロイ**（挙動不変を本番で確認）
2. `config/bulkDiscount` を seed（enabled:false）→ dev チャンネルで enabled:true にして QA（※devはバックエンド本番共有のため、QA購入は最小額プラン×2枚・終了後に返金）
3. GA4 ディメンション登録確認 → 本番 enabled:true
4. 8週間の判定ライン（事前固定）: **2枚以上率 <5% かつ party_size 2+ 選択率 <20% → P0-full は建てない**／実測CVR <1.5% のうちは広告予算を上げない

## 10. 見積り

§1-2: 3h ／ §3: 3h ／ §4: 8h（状態機械＋リトライ統合＋テスト）／ §5: 5h ／ §6: 3h ／ §7: 1h ／ 誤配対策①②③: 5h ／ §8-9 検証・QA・デプロイ: 4h ＝ **計 約32h（セッション3〜4日）**

## 複数枚特有のリスクと手当て（2026-07-19 追記）

1. **発行時間とwebhookタイムアウト**: 実測1枚≈2〜3秒×10枚=25〜35秒 ＜ `stripeWebhook` timeoutSeconds:120。処理中の Stripe 再送は in-flight 排他（claimedAt）が 500 で退け、二重発行しない。途中クラッシュは unitIndex 冪等で再開。
2. **残高の瞬間蒸発**: 最大注文原価 ≈ $170超（50GB×10）。オートチャージ「≤$100補充」だと1注文で$0付近→販売停止ガード発動の恐れ。**ローンチ前に eSIMAccess ポータルでオートチャージ閾値/補充額を「最大注文原価＋余裕」へ引き上げる（ユーザー作業）**。
3. **transactionId 文字制約**: `#` が eSIMAccess API で通るか実装前に確認。不可なら `-u0` 形式へ。
4. **チャージバック高額化**: 最大¥57,600/注文（50GB×10×20%OFF）。上限はユーザー決定で **10**（config 1フィールドでいつでも変更可・デプロイ不要）。
5. **QR誤配（人的・最重要UX穴）→ 3段構えで lite 内解決（+約5h）**:
   - **①リンク主動線化**: 各枚に「リンクをコピー」ボタン（既存の appleActivationUrl/androidActivationUrl ＋ラベル入り定型文・5言語）。幹事は1人1本のテキスト送付、QRは同席時フォールバック。
   - **②開通ステータス**: `esimaccessWebhook` に `ESIM_STATUS` ハンドラを追加し `esim_links.smdpStatus` を更新（webhookは既着信・API実査済み: docs/esimaccess_api_notes.md:72）。注文詳細に枚ごと「インストール済み✅/未⏳」→ 誤配時も未使用枚が見えて自己解決。
   - **③ラベル＋注意書き**: 「N枚目」番号＋「1つのQR/リンクは1台のみ」（5言語）。
   - 限界: 使われた枚の救済は不可（プロファイル再発行不能）。P0-full の残存価値は専用受取ページ（受取人言語・メール送付・未開封追跡・失効）に純化。

## リスクと逃げ道

- 最大リスクは §4。`issueMissingUnits` への一本化で本流・リトライの分岐を消し、qty=1 パスを不変に保つことで爆発半径を限定。
- 全体は `config.enabled` で即時 OFF（再デプロイ不要）。OFF 時は購入UIが現行と完全同一。
- eSIMAccess の連続 createEsim レート制限は未知 → 逐次発行＋失敗時リトライで吸収（8枚上限が天井）。
