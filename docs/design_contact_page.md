# 設計書：問い合わせ専用ページ `/contact`（AIチャット直リンク用）

作成: 2026-07-07 ／ 対象ブランチ: `dev` ／ ステータス: **承認済み（チャットで合意）→実装**

## 背景・目的
AIチャット（別オリジン `chat-yah-mobi-v2`）から yah.mobi の問い合わせフォームへ、**確実・軽量・綺麗なURLで直行**させたい。既存の `/app#contact`（アンカー）は lazy ロード＋スクロールのタイミング依存で、外部コールドロード時に着地が不確実。→ **フォーム専用の独立ページ `/contact` を追加**する。

## 対象ファイルと変更方針（実コード確認済み）
1. `client/src/pages/ContactPage.tsx`（新規・約20行）
   - `<div min-h-screen flex-col><Nav/><main flex-1><ContactSection/></main><Footer/></div>`。
   - `ContactSection`（`@/components/app/ContactSection`・`id="contact"`・`py-24`）を**そのまま再利用**（フォームは `/app` と完全同一）。
   - `Nav` は `/contact` では `isDarkHero=false` により白背景・黒文字で表示（Terms等と同じ）。fixed Nav の高さは ContactSection の `py-24`（6rem>navの5rem）でクリアするため main に追加paddingは不要。
2. `client/src/App.tsx`（2行）
   - `const ContactPage = lazy(() => import("./pages/ContactPage"));`
   - `<Route path="/contact" component={ContactPage} />` を Switch に追加。
   - 言語プレフィックス（`/ko/contact` 等）は既存 `I18nRouter` の `base` で**自動対応**（`/terms`/`/privacy` と同じ）。

## 据え置き（変更しない）
- **Nav / Footer の「Contact」導線は `/app#contact` のまま**（サイト内スクロール）。`/contact` はチャット等の外部直リンク専用に追加するだけ。
- `/app` ページ・`ContactSection` 本体・functions・rules は**無変更**。

## 影響範囲・リスク
- フロントのみ（新規ページ＋1ルート）。バックエンド無関係。
- リスク極小。ロールバックはルート削除のみ。

## チャット側（別プロジェクト）に渡す確定URL
- `https://yah.mobi/contact`（既定=英語）／ 言語別は `https://yah.mobi/{lang}/contact`。
- 将来拡張：`?category=refund&orderId=...` でフォーム自動入力（今回はスコープ外・`/contact` 側だけで後日追加可）。

## 検証計画
- `npx tsc --noEmit`／プレビューで `/contact` をリロード（=新規ロード相当）→ フォーム表示・Nav/Footer 正常・送信動作。
- `/app#contact`（Nav/Footer 経由）に回帰が無いこと。
- `dev` コミット（本番反映は別途ユーザー指示）。
