# 設計図：アクセシビリティ点検・改善（0.9-1）

対象ブランチ: `dev` ／ 作成: 2026-07-09 ／ ステータス: **設計（要承認→実装）**
対象: **購入ドロワー**（`PurchaseDrawer` + `steps/*`）と **問い合わせフォーム**（`ContactSection`）を優先。フロントのみ・挙動不変（aria/role 付与＋live region）。

## 1. 点検結果（現状・良い点）
- **モーダル基本は vaul（Radix）で自動担保**：フォーカストラップ・`aria-modal`・`role=dialog`・Escape・フォーカス返却。`DrawerTitle`(sr-only) と Close の `aria-label` も設定済。
- **フォーカス表示は良好**：`index.css` に `:focus-visible`（2px アウトライン・黒背景で白）実装済。
- フォームの name/email は `<label htmlFor>` 紐付け済。パンくずボタンに `aria-label`。

→ 大きな欠陥はなし。以下は**仕上げの付与**（中リスクなし）。

## 2. 改善項目（実コード確認済み）

### A. 問い合わせフォーム（ContactSection.tsx）
1. **選択ボタン群に `aria-pressed`**：location / category / detail の各ボタンは `<button>` だが選択状態がSRに伝わらない → 選択中に `aria-pressed={true}`。各グループを `role="group"` ＋ `aria-label`（ラベル文言）で囲む。
2. **エラーの読み上げ**：`formError` の `<p>`（L356）に `role="alert"`（＝assertive live region）。送信失敗が即読み上げられる。
3. **送信中の通知**：送信ボタンに `aria-busy={isPending}`。文言変化（Sending…）に加え状態を伝える。
4. **ハニーポット**：非表示入力（`_hp`）に `aria-hidden="true"`（既に `display:none`＋`tabIndex=-1`。SRからも確実に隠す）。
5. **成功メッセージ**（送信完了ブロック）に `role="status"`（polite）。

### B. 購入ドロワー（PurchaseDrawer.tsx + steps/*）
6. **`DrawerDescription`(sr-only) を追加**：Radix は `aria-describedby` 用の Description が無いと警告。ステップ概要を sr-only で付与（例「eSIM購入 {n}/{total} ステップ」）。
7. **選択カード/ボタンに `aria-pressed`**：Step0Duration / Step1Data / プラン選択の選択中に付与。
8. **発行/決済の待機表示**：Step4Payment・Step6Esim のスピナー領域に `role="status"` ＋ `aria-live="polite"`（「eSIMを準備中…」等がSRに届く）。装飾SVGは `aria-hidden`。
9. ステップ内の入力があれば `label`/`aria-label` 確認（ほぼボタン選択のため軽微）。

### C. ナビ（Nav.tsx・軽微）
10. **アカウントドロップダウンのトグル**（L120・アバター/イニシャルのみ）に `aria-label`（例「Account menu」）＋ `aria-expanded={dropdownOpen}`。他のアイコンボタンも `aria-label` 有無を確認して付与（メニュートグルは設定済）。

### D. 装飾要素の共通処理
11. 情報を持たない装飾 `<svg>` に `aria-hidden="true"`（チェックマーク・矢印等）。ラベル代替が必要なものは `aria-label`。

## 3. 非対象（今回スコープ外）
- 全画面の網羅監査（マイページ/管理画面）は GA後バックログ。今回は**購入・問い合わせの2導線**に集中（ロードマップ 0.9-1 の定義）。
- カラーコントラストの全面見直しは別途（黒地×白系で概ね良好）。

## 4. 検証計画
1. `npx tsc --noEmit`／`npx vitest run --config vitest.client.config.ts`（既存40 green維持）／`npm run build`。
2. **キーボードのみで通し**：Tabで購入ドロワー全操作→Escで閉じフォーカス返却／問い合わせフォーム送信まで。
3. プレビューで `preview_snapshot`（アクセシビリティツリー）＋主要要素の role/label を確認。
4. Console に Radix の Description 警告が出ないこと。
5. `dev` にコミット（本番反映は別途指示）。

## 5. リスク
- 付与のみで挙動不変。既存テストは role/label 追加で壊れない想定（Step2/Step4 テストは文言・遷移ベース）。壊れたらセレクタを合わせる。
