# 設計図：公開前QA（1.0-2）発見事項の修正一式

対象ブランチ: `dev` ／ 作成: 2026-07-09 ／ ステータス: ✅ 承認済み（「全て修正」）→ 実装
発見経緯: [qa_launch_checklist](./qa_launch_checklist.md) の QA-1（言語×導線・PC 5言語）を本番 yah.mobi で実施。

## 修正項目

### A. 🔴 `esim_links` 複合インデックス欠落（本番バグ・最優先）
- **症状**: MyPage の eSIM ステータス/期限が全ユーザーで非表示。console に `failed-precondition: The query requires an index`。
- **原因**: `useMyPageData.ts` の `where(userId)+orderBy(createdAt desc)` に対し、`firestore.indexes.json` は `esim_links(userId,status)` しか定義がない。
- **影響限定**: QR は注文詳細（`where(orderId)`＝単一フィールド）とメール経由で正常。
- **修正**: `firestore.indexes.json` に `esim_links(userId ASC, createdAt DESC)` を追加。
- **反映**: `firebase deploy --only firestore:indexes`（ユーザー実行・コードデプロイ不要・構築数分）。

### B. 🔴 chat SSO（`ssoExchange`）500 — chat側リポジトリ
- **症状**: ログイン済みでも chat iframe への SSO が `INTERNAL`。チャット自体は匿名で動作。
- **推定原因**: `createCustomToken` に必要な `roles/iam.serviceAccountTokenCreator`（signBlob）が実行SAに無い（verifyIdToken は通過している）。
- **対応**: ①ログで確定（`firebase functions:log --only ssoExchange`）→ ②IAM付与（gcloud 1コマンド・ユーザー実行）。コード変更なしの見込み。

### C. 🟡 問い合わせレート制限の応答が 500/internal に化ける
- **原因**: `functions/src/callables/contact.ts` L41-55 — 制限超過の `throw HttpsError("resource-exhausted")` が**自分の catch に捕まり** `internal: Rate limit check failed` に変換される。
- **修正**: 件数取得だけ try/catch し、超過判定は catch の外へ。
- **クライアント**: `ContactSection.tsx` の catch が `err.message`（英語）を生表示 → `functions/resource-exhausted` は i18n キー `contact.errorTooMany`、その他は `contact.errorGeneric` に（5言語追加）。
- **反映**: functions デプロイ（`submitContactInquiry`）＋次回 hosting リリース。

### D. 🟡 プリレンダに chat widget DOM が焼き込まれる
- **症状**: 本番 `/app` 等に死んだ `#yah-chat-btn`＋`origin=localhost:5051` の iframe が焼き込まれ、実行時の widget.js と二重化。
- **修正**: `scripts/prerender.mjs` — ①`chat.yah.mobi` へのリクエストをプリレンダ中は abort（widget を発火させない）②ダンプ前の DOM 掃除に `#yah-chat-btn` / `iframe[src*="chat.yah.mobi"]` / widget 注入 style を追加（保険）。
- **反映**: 次回 hosting リリース時のビルドから。

### E. ⚠️ Cookie 同意バナー英語固定
- **修正**: `CookieBanner.tsx` を `useTranslation` 化。キー `cookie.{message,policyLink,decline,acceptAll}` を5言語に追加。

### F. ⚠️ chat widget の UI 言語が `data-lang="en"` 固定
- **修正**: `client/index.html` — widget script に id を付与し、直後のインライン script で URLパス（/ko/ 等）→ localStorage(i18nextLng) の順に判定して `data-lang` を上書き（widget.js は defer なので実行前に反映される）。

### 取り下げ
- zh-TW「設置」問題 → grep 0件。「裝置（デバイス）」の誤検出。対応不要。

## 検証
1. `npx tsc --noEmit` ＋ `npx vitest run --config vitest.client.config.ts` ＋ `cd functions && npm run build && npm test`。
2. `npm run build` → prerender 出力に `yah-chat-btn` が無いこと（grep）。
3. A: インデックスデプロイ後、本番 MyPage で eSIM ステータス表示を Playwright で再確認。
4. C: レート制限窓が明けたら問い合わせ再送信（résource-exhausted → 当該言語メッセージ）。

## 反映経路
- dev コミット → A はインデックスのみ即デプロイ可（ユーザー）。C の functions は次回 functions デプロイ、D/E/F は次回 hosting リリースに同乗。
