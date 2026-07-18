# 設計図：view_section イベント＋Microsoft Clarity 導入

対象ブランチ: `dev` ／ 作成: 2026-07-19 ／ ステータス: **設計（要承認→実装）**

## 背景・目的

縦長LPの「どこで注意が死ぬか」を診断する。
- ② `view_section`（GA4）: セクション到達をイベント化 → 既存の `view_item_list` / `begin_checkout` / `login` と繋いでページ内ファネルを完成させる
- ③ Microsoft Clarity: スクロール到達ヒートマップ＋セッション録画 → 「ログイン壁で実際に何をしたか」を推測でなく目撃する

## 提案（作業指示）と実コードの差異

1. **「BaseLayout に20行」→ 実装場所は SPA**。対象セクションは `client/src/pages/AppPage.tsx` と配下コンポーネントにあり、BaseLayout は Astro ガイド側。ガイドページには当該セクションが存在しない。
2. IntersectionObserver の発火パターンは `PlansSection.tsx:60-65`（`view_item_list`）として**既に存在**。同じ作法で作る。
3. セクション id の実名: `plans` / `price-comparison`（compare）/ `compatibility` / `faq`。加えて `chat` / `contact` も同一コストで観測できるため対象に含める（6セクション）。

## ② view_section の実装

- 新規 `client/src/hooks/useSectionViews.ts`（1つの IntersectionObserver・threshold 0.25・発火後 unobserve・pageview につき各1回）:
  ```ts
  const SECTIONS = { plans: "plans", "price-comparison": "compare", compatibility: "compatibility", faq: "faq", chat: "chat", contact: "contact" };
  // 到達時: ga4Event("view_section", { section: <値> })
  ```
- `AppPage.tsx` でフック呼び出し（1行）。
- GA4 は Consent Mode v2 済みなので**同意前でも Cookie なし ping で全訪問者を計測**（既存 ga4Event の挙動どおり）。
- GA4 側の作業（ユーザー・1分）: 管理 → カスタム定義 → **イベントスコープのカスタムディメンション `section` を登録**（探索でセクション別に割れるようにする）。

## ③ Clarity の実装（同意連動＝既存 umami と同型）

- `client/src/lib/analytics.ts` に `loadClarityIfConsented()` を追加 — **`loadUmamiIfConsented()`（S2 で作った同意ゲート）と完全に同じパターン**: 同意「accepted」のときだけ動的 `<script>` 注入。拒否・未回答では一切ロードしない（GDPR/APPI 整合）。
- 呼び出し箇所は umami と同じ2点: 起動時（同意済みユーザー）＋ CookieBanner の Accept ハンドラ。
- プロジェクトID は公開値のため GA 測定ID と同様に定数で保持。**→ ユーザーから Clarity プロジェクトID をもらう必要あり**（clarity.microsoft.com で yah.mobi 用プロジェクトを作成）。
- **マスキング**: 購入ドロワーはログイン後にメールアドレスを表示するため、Clarity ダッシュボードで **Strict masking を推奨**（コード変更不要・録画からテキストが除外される）。Balanced のままにする場合はユーザー情報ブロックに `data-clarity-mask` を付与する（実装に含められる）。
- **Cookie ポリシー表記**: バナーのリンク先 `/cookie-policy`（`client/src/pages/CookiePolicy.tsx`）は英語単一言語のページだったため、Clarity の行（録画・ヒートマップ・_clck/_clsk・同意後のみ・オプトアウト可）を1エントリ追加。

## 影響範囲・リスク

- フロントのみ（hosting デプロイで反映・functions 変更なし）。
- Clarity は第三者スクリプト＝サプライチェーンリスクがあるが、同意後のみロードで S2 の方針と整合。
- パフォーマンス: 同意後の非同期ロードのみ。LCP への影響なし。

## 検証計画

1. `tsc` / eslint / 既存テスト。
2. dev server: スクロールで `/g/collect` に `en=view_section` が6セクション分・各1回だけ飛ぶこと（Network で確認）。
3. 同意なし → clarity.ms へのリクエストが**存在しない**こと。Accept → Clarity スクリプトがロードされること。
4. `dev` コミット → 本番反映は別途指示（hosting のみ）。
