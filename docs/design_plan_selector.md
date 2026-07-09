# 設計記録：プラン選択UIのフラット化（日数ファースト廃止）

対象ブランチ: `dev` ／ 作成: 2026-07-09 ／ ステータス: ✅ 実装済み（口頭承認「そのまま実装で進めましょう」）

## 背景・判断
- 実カタログ（6 SKU）は 7日=1GBのみ／15日=3GBのみ／30日=5·10·20·50GB と**30日側に偏在**。
- 旧UI「Step1 日数 → Step2 容量」では、ボリュームゾーンの短期旅行者（4〜10日滞在）が「7日」を選ぶと **6 SKU中1つ（1GB）しか見えず**、品揃えの厚い30日棚が隠れていた。
- 本質：この商材の `validityDays` は**有効期限の上限**であり旅程との一致条件ではない。7日旅行者が30日/10GBを買うのが正解になり得るが、「How long is your trip?」という質問がそれを封じていた。
- → **全プランを1画面のフラットリスト**（価格昇順）で提示。日数は「最長◯日利用可（Valid up to N days）」の属性表示に変更。6枚なら選択肢過多にはならない（競合Airalo等も国別フラットリスト）。

## 実装
- `types.ts`: `flattenPlanOptions()` 追加（価格昇順・popular=容量10GBに最も近い1件）。
- ドロワー: `Step0Duration`+`Step1Data` を削除し **`Step0Plan`（統合・新規）** に。ステップは 7→6（0=Plan 1=Price 2=Login 3=Payment 4=Complete 5=eSIM）。旧ファイル名の数字は残置（テストchurn回避・本体にコメント）。
- 数値ステップ参照の更新: PurchaseDrawer（switch/esim enabled/開始ステップ判定/インジケータclickable）、Step2Confirm・Step3Login・Step4Payment の setStep、AppPage の決済完了 `setDrawerInitialStep(6→5)`、各テスト。
- `PlansSection`: 2段選択→フラットリスト（`grid-cols-2 sm:3 lg:6`）。カード=容量(主役)+最長日数+価格+POPULARバッジ。価格パネル/通貨切替/Buy CTAは維持。`plan_tab_click`→`plan_card_click`。
- i18n×5: `drawer.stepLabels`(6→5)・`drawer.planTitle/planDesc`・`plans.allPlans/validUpTo/usageHint`（目安=約1GB/日）。
- 容量ガイド1行を両所に表示（買い過ぎ/不足の不安解消・大容量への自然な誘導）。

## 検証
- tsc / vitest client 39 green（ステップ番号のテスト期待値を更新）／ vite build ✓。
- dev サーバ＋可視ブラウザで実確認：フラットリスト表示（6枚・昇順・POPULAR=10GB）／10GB選択→「STEP 2 OF 2・30days・10GB・¥2,600」→CONTINUE TO PAYMENT。
- 注意: 非表示タブでは framer-motion の遷移が一時停止する（プレビュー検証時の既知アーティファクト・実害なし）。

## 影響・残タスク
- 購入クリティカルパスの変更のため、**dev チャンネルでの購入導線再QA（5言語）を GA 前に実施**。
- 旧 i18n キー（`plans.step1/step2`・`drawer.durationTitle/dataTitle` 等）は未使用のまま残置（害なし・任意クリーンアップ）。
