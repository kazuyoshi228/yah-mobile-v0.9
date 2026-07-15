# 設計図：データ層フィールド `bappyPlanId` → `providerPlanId` 改名（＋データ移行）

対象ブランチ: `dev` ／ 作成: 2026-07-15 ／ ステータス: **設計（要承認→実装）**
目的: eSIMAccess 移行後も残る誤解を招く命名（IIJプランなのに `bappyPlanId`）を、プロバイダ非依存の `providerPlanId` に統一する。値は不変（eSIMAccessのpackageCode）。GA直後・実データ最小（56ドキュメント）の今が最も安全な移行タイミング。

## 1. 背景・現状（実測）
- `bappyPlanId` はBappy時代の名残。eSIMAccess移行時、フィールド名は据え置き・値だけpackageCodeに差し替えた。
- **プロバイダ抽象層は既に `providerPlanId` を使用**（`providers/types.ts` CreateEsimParams/TopupParams）。受け皿は既存。FsPlan型にも `providerPlanId?` が既に定義済み（未使用）。
- コード参照: **105箇所 / 33ファイル**。Firestore: **plans 17 + orders 37 + esim_retry_jobs 2 = 56ドキュメント**（esim_links は保持0）。

## 2. 改名対象と除外
- **対象（データ層フィールドと参照）**: `plans`/`orders`/`esim_retry_jobs` の `bappyPlanId` フィールド、および shared/types・schemas、functions（orders/webhooks/stripe/esimRetryService/db/llmsTxt/ga4/infra）、client（PurchaseDrawer/usePurchaseCheckout/PlansSection/types/AppPage/TopupPage/useMyPageData/admin/ga4）の参照。
- **除外（本物のBappy）**: `functions/src/bappy/*`・`providers/bappy.ts` 内のローカル変数名は、休眠Bappyプロバイダ実装の内部表現なので触らない（抽象層から `providerPlanId` を受け取り、内部でBappy APIに渡すだけ）。混乱回避のためコメントを残す。
- **doc ID は変更しない**（B4正規化。IDは packageCode のまま）。

## 3. API契約（client↔callable）の後方互換
- `OrdersInitCheckoutInput` / `OrdersInitTopupCheckoutInput` の入力フィールドを `providerPlanId` に。
- hosting と functions は別デプロイ＝短時間の版ズレが起きる。**移行中は callable が両方を受理**（zod: `providerPlanId` を新、`bappyPlanId` を deprecated optional として受け、`providerPlanId ?? bappyPlanId` で解決）。移行完了後に旧を削除。

## 4. データ移行（読み取り→ドライラン→実行）
- スクリプト `scripts/migrate_bappy_to_provider_plan_id.mjs`（ADC・本番）:
  1. plans/orders/esim_retry_jobs を走査、`bappyPlanId` を持つ各docに `providerPlanId = bappyPlanId` を**追加**（`bappyPlanId` は残す＝後方互換）。
  2. 件数を出力（想定 56）。対象0なら実行しない。
- **段階削除**: E2E成功確認後、別スクリプトで `bappyPlanId` フィールドを FieldValue.delete()（Phase3）。

## 5. 実装手順（段階・ロールバック安全）
1. **移行①（追加）**: `providerPlanId` を全docに追加（bappyPlanid残置）。
2. **コード改名**: 105箇所を `providerPlanId` に（bappy/除外）。callable入力は両受理。型・スキーマ・テスト更新。
3. **検証**: tsc / vitest（client＋functions）/ build / prerender。
4. **デプロイ**: functions（両受理なので先行可）→ hosting。
5. **実発注E2E（必須）**: 本番で1件購入 → **eSIM発券成功**（packageCode正常）・注文の providerPlanId 保存・GA4 purchase を確認。topupも1件確認。
6. **移行②（削除）**: E2E OK後、`bappyPlanId` フィールド削除＋callableの旧受理を撤去（次リリース）。

## 6. リスク・緩和
- 🔴 **発券クリティカルパス**: webhook→provider の packageCode。→ E2Eで実発券確認（手順5）。失敗しても値は不変なので発券ロジック自体は無変更＝リスクは「参照漏れによる undefined」に限定。tsc が大半を捕捉。
- 版ズレ: callable両受理で吸収。
- ロールバック: Phase1は追加のみ（破壊なし）。コードは1コミットで revert 可。旧フィールドは Phase3 まで残すので即時復帰可能。

## 7. 非対象
- doc ID・provider 値・価格・plan名・topupForBase 等は不変。顧客可視表示に影響なし。

## 8. 反映
- functions/hosting デプロイは別途ユーザー指示。データ移行スクリプトはユーザー承認のうえ実行（読み取り→ドライラン→実行）。
