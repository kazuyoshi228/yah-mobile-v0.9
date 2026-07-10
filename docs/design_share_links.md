# 設計図：共有用購入リンク（プラン確定済みディープリンク）

対象ブランチ: `dev` ／ 作成: 2026-07-10 ／ ステータス: **設計（要承認→実装）**
目的: 「リンクを踏む → プラン選択済みの価格確認 → 決済」の最短導線を、**人間（SNS/QR/口頭）とAI（LLM検索/エージェント）の両方が拡散できる形**で提供する。

## 1. 現状（すでに動く部分）

`/app?open=true&days=30&gb=10GB` で購入ドロワーが**価格確認ステップ直開**になることを dev で実証済み（AppPage の `handleOpenParam` ＋ plan-selector改修の `days&&gb→確認ステップ` による）。言語版 `/ko/app?...` 等も可。

残る課題：
- URLが長く、SNS共有時のプレビュー（OGカード）が汎用のまま＝**人間向けの拡散力が弱い**
- AI が引用できる「プラン単位の購入URL」が llms.txt / 構造化データに存在しない

## 2. 変更内容

### A. 短縮購入ルート `/buy/:slug`（クライアント＋プリレンダ）
- **URL**: `/buy/1gb` `/buy/3gb` `/buy/5gb` `/buy/10gb` `/buy/20gb` `/buy/50gb`（6プラン分）
- **ルーティング**: `App.tsx` に `Route path="/buy/:slug"` を追加し **AppPage を slug 付きで描画**（リダイレクトなし・URLは綺麗なまま・戻るボタン自然）。
- **挙動**: AppPage が plans（Firestore）ロード後、slug（例 `10gb`）に一致するプランを解決し `days/gb` を設定してドロワーを確認ステップで自動オープン。一致プランが無い/販売停止中は通常の `/app` 表示にフォールバック（エラーは出さない）。
- **SEO/OGメタ**: slug ごとに専用 title/description/OG を設定。
  - 例: `Japan eSIM 10GB — Valid up to 30 days | yah.mobile`
  - **価格はメタに含めない**（既存方針＝title/descからの価格排除と整合。価格改定時のOGキャッシュ陳腐化も回避。価格はリンク先ドロワーで即表示される）
  - メタ用のプラン諸元（gb/days）は**コード内の静的マップ**を使用（プリレンダ時は App Check の関係で Firestore が読めないため。購入時の価格・在庫の真実は従来どおり Firestore）。
  - `robots` は index 許可・canonical は self。hreflang は付けない（v1は en メタのみ。多言語メタは需要を見て拡張）。
- **プリレンダ**: `scripts/prerender.mjs` の ROUTES に6ルートを追加（既存機構のまま）。SNSクローラーにプラン専用OGカードが返る。
- **sitemap**: `client/public/sitemap.xml`（存在すれば）に6URLを追記。

### B. AI向け配信（llms.txt ＋ JSON-LD）
- **llms.txt（functions・🔴要承認対象）**: 動的生成に各プランの行を拡張し、**購入直行URLを併記**。
  例: `- 10GB / up to 30 days / ¥2,600 (tax incl.) — Buy: https://yah.mobi/buy/10gb`
  ※価格は Firestore から動的に出るため陳腐化しない。変更は llms.txt ハンドラのみ・他の関数に影響なし。
- **JSON-LD Product スキーマ（クライアント）**: AppPage の既存 Product/offers 生成に `offers[].url = https://yah.mobi/buy/<slug>` を追加。Google・AIエージェントがプラン単位でディープリンク可能に。

### C. 計測
- `/buy/:slug` 経由のドロワー自動オープン時に既存 `trackEvent` で `share_link_open {slug}` を送信（流入計測・将来のA/B判定にも使用）。

## 3. 影響範囲・リスク
- クライアント: `App.tsx`（ルート1行）／`AppPage.tsx`（slug解決＋自動オープン＋メタ）／静的マップ（`types.ts` 近傍）／prerender ROUTES／sitemap。
- functions: **llmsTxt ハンドラのみ**（要承認・デプロイは次回 functions リリースに同乗）。
- 購入フロー本体・決済・Rules は**無変更**。ログイン必須も維持（QR納品先の紐付けに必要）。
- リスク: プラン改廃時に静的マップ・prerender ROUTES の更新が必要（→ 静的マップに「カタログと不一致なら /app フォールバック」を実装し、壊れはしない設計に）。
- 招待制ゲート中は外部者が踏んでもログインで止まる → **実装は今・拡散はGA後**。

## 4. 検証計画
1. `tsc` ＋ client テスト（slug解決のユニットテスト追加）＋ functions build/test。
2. ビルド→プリレンダ後、`dist/public/buy/10gb/index.html` に専用 title/OG が焼けていること（grep）。
3. dev チャンネルで `/buy/10gb` → ドロワーが10GB確認ステップで自動オープン（5言語のうち en+1言語で確認）。
4. 存在しない slug（`/buy/99gb`）→ 通常 /app 表示にフォールバック。
5. llms.txt に Buy URL が出ること（functions デプロイ後・本番で確認）。

## 5. 手順
1. （承認後）A/C 実装 → dev コミット → dev チャンネルで確認。
2. B の functions 変更も同コミット群に含め、**デプロイは GA リリース（main）に同乗**。
3. GA後: 共有リンク集（6URL＋言語版の作り方）を README/運用ドキュメントに掲載 → 拡散開始。
