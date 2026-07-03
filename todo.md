# yah.mobile — Project TODO

- [x] PLANSセクションのインタラクティブUI実装（日数選択→GB選択→価格表示）
- [x] 価格の円表記（¥3,000）
- [x] ドル換算・ユーロ換算ボタン実装（当日レート取得）
- [x] 換算価格の注意書き（あくまで目安）
- [x] 為替レートAPI（exchangeRates.get tRPC procedure）実装
- [x] コンタクトフォームAIファースト設計リニューアル（Location/Category/Detail選択式、インラインヒント）
- [x] Location自動検出（タイムゾーン・ブラウザ言語から推定）
- [x] Google Sheets同期ヘルパー実装（appendContactToSheet）
- [x] DBスキーマ更新（location/category/detailフィールド追加）
- [x] tRPC contact.submit procedureを新フィールド対応に更新
- [x] Google Service Account シークレット登録（GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_SHEETS_CONTACT_ID）
- [x] contactInquiriesテーブルにstatusフィールドを追加（pending/in_progress/resolved/closed）
- [x] admin.listInquiries tRPC procedure実装（adminProcedure）
- [x] admin.updateInquiryStatus tRPC procedure実装
- [x] /adminページ（AdminPage.tsx）の実装（問い合わせ一覧・ステータス管理・詳細表示）
- [x] App.tsxに/adminルートを追加（admin roleのみアクセス可）
- [x] Resend APIキーをシークレットに登録（RESEND_API_KEY）
- [x] server/mailer.tsを作成（Resend自動返信メール送信ヘルパー）
- [x] contact.submit procedureに自動返信メール送信を追加

## DBスキーマ Blueprint完全移行

- [x] drizzle/schema.ts を Blueprint仕様の11テーブルに完全書き換え（plans, esim_links, esim_activations, bappy_token_cache, stripe_events, passkeys, audit_logs, notifications）
- [x] orders.status ENUM を Blueprint正規定義（pending/paid/provisioning/fulfilled/failed/refunded/cancelled）に修正
- [x] orders テーブルに bappyPlanId, stripePaymentIntentId, amountJpy フィールドを追加
- [x] drizzle/relations.ts を新テーブルに対応させ更新
- [x] server/db.ts のクエリヘルパーをスキーマ変更に対応させ更新
- [x] server/routers.ts の orders.create を新スキーマに対応させ修正
- [x] 手動SQLマイグレーション適用・動作確認（drizzle-kit generate成功、ALTER TABLEで既存テーブルも更新、SHOW TABLESで全てのテーブル確認済）
- [x] Vitest テストを新スキーマに対応させ更新（schema.test.ts新規作成、全16テストpass）

## ナビゲーション・DB化・デッドコード整理

- [x] デッドコード削除：AppPage.tsx / Law.tsx / Support.tsx の3ファイルを削除
- [x] Nav.tsx修正：/app以外のページからアンカーリンクをクリックした場合は /app#section へ遷移
- [x] plansテーブルに実データ投入（Airalo競合価格を参考に設定）
- [x] フロントエンドのPlansSection・PurchaseDrawerをtrpc.plans.listのDB参照に切り替え
- [x] COMPARISON_ROWS・ESIM_VSの価格をDBデータと整合させる（最安プラン ¥990を反映）

## Plans管理UI（/admin）

- [x] server/routers.ts に admin.plans.list / create / update / delete プロシージャを追加
- [x] AdminPage.tsx に「Plans」タブを追加（プラン一覧テーブル表示）
- [x] Plans管理UI：新規プラン作成フォーム（モーダル）
- [x] Plans管理UI：既存プラン編集フォーム（モーダル）
- [x] Plans管理UI：プラン削除（確認ダイアログ付き）
- [x] Plans管理UI：isActive トグル（有効/無効切り替え）
- [x] Vitestテスト追加（plans CRUD）— server/plans.test.ts新規作成、8テストpass

## AIファースト設計 P1〜P5実装

- [x] P4: plansテーブルに `recommendedFor`（用途タグ）・`isPopular`（人気フラグ）・`sortOrder`（表示順）カラムを追加
- [x] P4: 既存12プランのメタデータ（recommendedFor, isPopular, sortOrder）を投入
- [x] P4: plans.listのレスポンスにメタデータを含める
- [x] P1: Welcome.tsxにURLパラメータ処理を追加（?plan=bappyPlanId&open=true&step=N）
- [x] P1: URLパラメータでPurchaseDrawerを自動開閉・プラン自動選択・ステップ指定できるようにする
- [x] P2: server/routers.tsに plans.recommend エンドポイントを追加（days/budget/usageで最適プランを返す）
- [x] P5: tRPCエラーレスポンスに機械可読エラーコード（PLAN_NOT_AVAILABLE等）とalternativesを追加（AppErrorCode・AiErrorPayload型を shared/_core/errors.ts に定義）
- [x] P3アラート: Stripe統合時に orders.initCheckout を実装するよう todo.md・コード（routers.tsにTODOスタブ）に警告を仕込む

## ⚠️ STRIPE統合時に必ず実装すること（P3: orders.initCheckout）

> **Stripe統合を開始したら、このセクションを最初に確認してください。**
> AIファースト設計の完成に必要な最重要エンドポイントです。

- [x] P3: `orders.initCheckout` tRPCプロシージャを実装済み（Stripe Checkout Session作成・orderId返却）
- [x] P3: `shared/_core/errors.ts` の `CHECKOUT_NOT_READY` エラーコードは削除済み
- [x] P3: AIエージェント向けフロー実装済み（plans.recommend → initCheckout → Webhook → eSIM発行）

## AIファースト設計 Priority A〜C（AIクローラー対応）

### Priority A: 静的ファイル・メタタグ
- [x] llms.txt を client/public/ に追加（LLMがサービスを理解するための「AIへの手紙」）
- [x] robots.txt を client/public/ に追加（AIクローラー向けアクセス許可）
- [x] sitemap.xml を client/public/ に追加（ページ構造の宣言）
- [x] index.html に OGP・meta description・Twitter Card・canonical・JSON-LD Organization Schema を追加

### Priority B: JSON-LD 構造化データ
- [x] Welcome.tsx に FAQPage Schema（JSON-LD）を動的挿入（useEffect）
- [x] Welcome.tsx に Organization Schema（JSON-LD）を index.html に追加
- [x] Welcome.tsx に Product/Service Schema（プラン一覧、JSON-LD）を動的挿入

### Priority C: API自然言語対応
- [x] plans.recommend の usage パラメータを自然言語対応に拡張（sightseeing/business/remote_work/transit/short_trip/long_stay等追加）
- [x] plansDBに description フィールドを追加（schema.ts更新・ALTER TABLE実行）
- [x] plans.recommend レスポンスに reason フィールドを含める（自然言語で推薦理由を返す）
- [x] plansテーブルの recommendedFor・isPopular・description データを全12プランに投入
- [x] Vitestテスト追加（plans.recommend自然言語対応テスト）— 6テスト追加、全てpass

## AIファースト Priority D: llms.txt動的生成（DBと同期）

- [x] サーバーサイドに `/llms.txt` エンドポイントを追加（Express直接ルート）
- [x] DBのアクティブプラン一覧をリアルタイムで取得してMarkdown形式で返す
- [x] Airalo競合価格比較をDBプランと動的に生成（価格差を自動計算）
- [x] plans.recommend APIのサンプルURLもDBの最安値プランで動的生成
- [x] 静的 client/public/llms.txt を削除（動的エンドポイントに置き換え）
- [x] Vitestテスト追加（generateLlmsTxtユニットテスト + HTTPルートテスト）— 14テスト追加、全44テストpass

## Admin 4タブ分析ダッシュボード

### DBスキーマ
- [x] analytics_eventsテーブル追加（event_name, properties JSON, session_id, user_id nullable, page, referrer, user_agent）
- [x] ai_referrer_logsテーブル追加（bot_name, path, user_agent, ip_hash, created_at）
- [x] recommend_logsテーブル追加（usage, purpose, recommended_plan_id, actual_plan_id nullable, matched boolean）
- [x] 直接SQLでテーブル作成（drizzle-kitマイグレーションエラー回避）

### フロントエンドイベントトラッカー
- [x] client/src/lib/analytics.ts を新規作成（trackEvent関数、セッションID生成、バッチ送信）
- [x] Welcome.tsxにpage_view・plan_tab_click・plan_select・checkout_startイベントを追加
- [x] サーバーサイドに POST /api/analytics/events エンドポイントを追加

### サーバーサイドAPI
- [x] AIレファラーログ: 全リクエストにUser-Agentを解析してai_referrer_logsに自動記録（ChatGPT/Perplexity/Gemini/Claude等対応）
- [x] 推奨精度追跡: plans.recommend呼び出し時にrecommend_logsに記録
- [x] trpc.analytics.getSummary（ファネル・トップページ・デバイス・言語集計）
- [x] trpc.aiFirst.getReferrerStats（AIボット別訪問数・トップパス・最新ログ）
- [x] trpc.aiFirst.getRecommendStats（推奨回数・usage内訳・match率）

### AdminPage.tsx 4タブUI
- [x] Tab 1「AI First」: KPIカード（AI Bot Visits/Unique Bots/Recommend Calls/Match Rate）・AIボット内訳・トップパス・推奨API内訳・最新ログ
- [x] Tab 2「Analytics」: KPIカード（Total Events/Page Views/Plan Selects/Orders）・ファネル・トップページ・デバイス・言語
- [x] Tab 3「Contact」: 既存Contact Inquiries一覧（タブ名をContactに変更）
- [x] Tab 4「Plans」: 既存Plans管理
- [x] タブ切り替えUI（4タブ対応）・各タブのローディング/エラー状態・期間セレクター（7D/30D/90D）

## Admin/Plans インライン編集（SSOT）

- [x] PlansTabのテーブルセル（priceJpy・dataGb・validityDays・planName）をクリックでインライン編集できるようにする
- [x] 編集中はinput要素に切り替わり、Enter/Tabで確定・Escでキャンセル
- [x] 確定時にtrpc.admin.updatePlanをoptimistic updateで呼び出し、DBに即反映
- [x] 保存成功時にトースト通知を表示（sonner）
- [x] 保存失敗時にエラートーストを表示し、元の値に自動ロールバック
- [x] Welcome.tsxのプラン表示はtrpc.plans.listをDBから取得しているため、保存後に自動反映（staleTime=10min・次回訪問時に更新）
- [x] URLクエリパラメータ?tab=plansで直接PLANSTabにジャンプできるように対応

## Analytics 拡張・AI分析機能

### Phase 1: サーバーサイドAPI拡張
- [x] analytics.getSummaryに24H期間オプションを追加（period: "24h" | "7d" | "30d" | "90d"）
- [x] analytics.getSummaryにuniqueVisitors（DISTINCT session_id）集計を追加
- [x] analytics.getSummaryにCVR（order_complete / unique session_id）算出を追加
- [x] analytics.getChannelStatsエンドポイントを追加（trafficSources配列としてgetSummaryに統合）
- [x] analytics.exportDataエンドポイントを追加（CSV/JSON形式でダウンロード）
- [x] analytics.getAiInsightsエンドポイントを追加（LLMに集計データを投入して自然言語インサイトを返す）

### Phase 2: UTMパラメータ収集
- [x] Welcome.tsxのpage_viewイベントにutm_source/utm_medium/utm_campaignを追加
- [x] analytics_eventsのpropertiesにUTMパラメータを保存

### Phase 3: AdminPage.tsx UI拡張
- [x] 期間セレクターに「24H」を追加（24H/7D/30D/90Dの4択）
- [x] AnalyticsタブのKPIカードにUnique Visitorsを追加
- [x] AnalyticsタブにCVR（Conversion Rate）カードを追加
- [x] AnalyticsタブにTraffic Sourcesセクションを追加（チャネル別棒グラフ）
- [x] AnalyticsタブにExport（CSV/JSON）ボタンを追加

### Phase 4: AI自動インサイト生成
- [x] AdminページにAI Insightsパネルを追加（Ask AIボタン + 自然言語インサイト表示）
- [x] 異常検知ロジック：直近24hが過去7日平均の2σ超えで警告バナー表示

## Phase A: Bappy APIクライアント（モック付き）

- [x] `server/bappy.ts` 実装済み: OAuth 2.0 Client Credentials トークン取得・自動更新
- [x] `bappy.getPlans()` 実装済み
- [x] `bappy.createLink()` 実装済み（本番Bappy API連携済み）
- [x] `bappy.getLinkDetail()` 実装済み
- [x] `bappy.getTopupPlans()` 実装済み
- [x] `bappy.addTopupPlan()` 実装済み（modifyLinkPlansから改名）
- [x] `BAPPY_CLIENT_ID` / `BAPPY_CLIENT_SECRET` 環境変数をSecretに追加済み
- [x] `esim.syncData` tRPCプロシージャ実装済み
- [x] `esim.getTopupPlans` tRPCプロシージャ実装済み

## Phase B: マイページUI強化

- [x] QRコード画像表示: `qrcode` ライブラリでlpaProfileからQR画像を生成
- [x] データ残量・有効期限のリアルタイム表示（esim.syncDataを呼び出し）
- [x] 1タップ開通ボタン: iOS/Android判定してappleActivationUrl/androidActivationUrlを使い分け
- [x] provisioning状態のポーリング（5秒間隔、最大60秒）
- [x] eSIM発行失敗時のエラー表示改善（再試行ボタン・サポートリンク）
- [x] マイページのモバイルファーストデザイン改善
- [x] アクティブeSIMサマリーカード（最上部固定・データ残量バー・1タップ開通ボタン）
- [x] 注文カードにeSIM状態プレビュー（データ残量バー・有効期限）
- [x] トップアッププランUI（アコーディオン展開）
- [x] 未読通知バッジ（ベルアイコン・パネル）

## マイページ改善

- [x] 注文カード・サマリーカードのプラン名をplansテーブルのnameフィールドから取得して表示（bappyPlanId内部IDを非表示）
- [x] トップアップ購入ボタンをTopupPanelに追加（Stripeチェックアウトでトップアッププランを購入できる）
- [x] orders.topupCheckout tRPCミューテーションをサーバー側に実装（トップアップ用Stripeセッション作成）
- [x] webhookでcheckout.session.completedをトップアップ用に分岐（modifyLinkPlans呼び出し・esimActivationsに記録）

## 複数eSIM対応

- [x] activeEsimDataを全fulfilled注文の配列に変更（find→filter）
- [x] 複数サマリーカードのカルーセル表示（ドットインジケーター・左右ナビゲーション）
- [x] 単一eSIMの場合は現状のシングルカード表示を維持（後方互換）

## Phase C: 購入フロー改善

- [x] 端末eSIM対応チェック（DeviceChecker.tsx実装済み・Welcome.tsxのDevice Compatibilityセクションに配置済み）
- [x] プラン比較表（ComparisonTable）は競合比較のため静的データで実装済み
- [x] PlansSection（プラン選択UI）はDBから動的取得（trpc.plans.list）実装済み
- [x] 推奨プラン強調（isPopularバッジ）はPlansSection/PurchaseDrawer両方実装済み（opt.popular→t("plans.popular")/t("drawer.popular")）
- [x] eSIM発行遅延時の「発行処理中」表示とポーリング（5秒間隔・最大60秒実装済み）

## Phase D: i18n多言語対応

- [x] `react-i18next` + `i18next` インストール済み
- [x] `client/src/i18n/` ディレクトリ作成済み: en / zh-TW / ko / th の4言語ファイル
- [x] Welcome.tsx 多言語化済み（useTranslation対応）
- [x] HowItWorksSection・PlansSection・ContactSection・Footer 多言語化済み
- [x] 言語切り替えUIコンポーネント（LanguageSwitcher）ナビゲーションバーに配置済み
- [ ] MyPage.tsx の多言語化（未実装）
- [x] zh-CN（簡体字中国語）対応（完了）

## Phase E: PWA対応

- [x] `vite-plugin-pwa` インストール済み
- [x] `client/public/manifest.json` 作成済み
- [x] Service Worker設定済み（vite.config.tsのVitePWAプラグイン）
- [ ] インストールプロンプトUIを追加（モバイルユーザー向け）（未実装）

## コードリファクタリング（シンプル・モダン・安定）

- [x] server/routers.ts をルーター別ファイルに分割（analytics/plans/admin/orders/aiFirst/esim/exchangeRates/contact/auth/notifications）
- [x] adminProcedure を全１１箇所に適用（手動 ctx.user.role チェックを削除）
- [x] Welcome.tsx のコンポーネント分割（PurchaseDrawer/DeviceChecker/PlansSection/HowItWorksSection/定数データ）
- [x] AdminPage.tsx のタブ別ファイル分割（AnalyticsTab/AiFirstTab/PlansTab/PlanFormModal）
- [x] インラインスタイル → Tailwindクラス置き換え（index.cssに.text-label/.text-bodyクラスを追加、フォント設定をNational2に統一）
- [x] MyPage.tsx の order: any 型を型安全に修正

## マイページUI強化（追加実装）

- [x] アクティブeSIMサマリーカード（最上部固定・データ残量・有効期限・ステータス）実装済み
- [x] 注文カード一覧にeSIM状態（データ残量バー・有効期限）プレビュー表示済み
- [x] トップアッププランUI（TopupPanel）注文詳細に追加済み
- [x] 未読通知バッジ（ベルアイコン・パネル）実装済み
- [x] モバイルファーストデザイン改善済み

## Bappy API 統合修正（仕様書準拠・安定実装）

- [x] server/bappy.ts: トークンURLを固定値 `https://id.omaxtelecom.com/realms/platform/protocol/openid-connect/token` に修正
- [x] server/bappy.ts: BappyResponse<T>ラッパー型を追加し、bappyFetch が `data` フィールドを自動展開するよう修正
- [x] server/bappy.ts: createLink のリクエストボディを `{ plan_id }` (スネークケース) に修正
- [x] server/bappy.ts: modifyLinkPlans を addTopupPlan に改名・エンドポイントを `PUT /v1/links/{id}/plans` `{ add: [planId] }` に修正
- [x] server/bappy.ts: 型定義を API レスポンス仕様に合わせて更新（BappyLinkDetail / BappyCreateLinkResponse / BappyTopupPlan）
- [x] server/bappy.ts: エラーハンドリングを `success: false` チェック込みに強化
- [x] server/routers/esim.ts: modifyLinkPlans 呼び出し箇所を addTopupPlan に更新（後方互換ラッパーで対応済）
- [x] server/routers/orders.ts: topup webhook 内の modifyLinkPlans 呼び出しを addTopupPlan に更新（後方互換ラッパーで対応済）
- [x] 環境変数 OMAX_CLIENT_ID / OMAX_CLIENT_SECRET を Secrets に追加（既存 BAPPY_* 変数は後方互換で維持）
- [x] Vitest テスト更新（bappy.test.ts新規作成、全 10 テスト pass）

## Bappy API 本番切り替え（プランDB移行・eSIM発行テスト）

- [x] DBプランを実際のBappy Plan ID（5件）に差し替え（scripts/migrate-plans-to-bappy.mjs実行）
  - Japan 1GB 7 days: `019db23f-b3f5-7383-8767-44c7a6baede2`
  - Japan 3GB 15 days: `019db23f-b3fd-7293-b06c-ec9624f88747`
  - Japan 5GB 30 days: `019db23f-b401-736a-aeeb-b71aa16ebaa5`（人気プラン）
  - Japan 10GB 30 days: `019db23f-b406-7212-a344-f58042476efb`
  - Japan 20GB 30 days: `019db23f-b3f9-7238-b720-663760a8db32`
- [x] Bappy APIに存在しない旧12件プランを isActive='false' に無効化
- [x] getTopupPlans のエンドポイントを `/plans?per_page=100&page=N` + JP フィルタに修正
  - `/links/{id}/plans` は 405 Method Not Allowed（仕様書の誤記）
- [x] 本番APIでeSIM発行テスト成功（ICCID: 8932042000009992448、LPAプロファイル取得確認）
- [x] 全55テストpass・TypeScriptエラーなし

## コードレビュー優先度A修正（安全・安定）

- [x] A-1: Webhook失敗時の補償処理追加（catch内でupdateOrderStatus("failed") + createNotification(order_failed)）
- [x] A-2: Webhook冪等性チェック追加（isStripeEventProcessed / recordStripeEvent をwebhookハンドラーに組み込み）
- [x] A-3: トップアップ価格をサーバー側でBappy APIから取得（クライアントのpriceUsd/planNameを入力から削除）
- [x] A-4: bappyTokenCacheのDELETE→INSERTをUPSERT（id=1固定シングルトン）にアトミック化
- [x] A-5: initCheckout でStripeセッション作成失敗時に孤立注文をcancelledに更新

## コードレビュー優先度B/C修正（構造強化・シンプル化）

- [x] B-4: USD_TO_JPY_RATE を shared/const.ts に集約（マジックナンバー `150` を全廃）
- [x] B-6: createOrder を Drizzle $returningId() でアトミック化（INSERT後の競合リスクを排除）
- [x] C-1: modifyLinkPlans 後方互換ラッパーを削除し、addTopupPlan を直接呼び出しに統一
- [x] C-2: bappy.test.ts の `expect(true).toBe(true)` を意味のあるテスト（isBappyConfigured/createLink動作確認）に置き換え
- [x] C-5: 未使用の BappyNetworkStatus 型と getNetworkStatus 関数を削除
- [x] 全56テストpass・TypeScriptエラーなし

## PlansSection 動的日数対応

- [x] types.ts: PLAN_DAYS をハードコードから削除し、DBプランから動的に日数を生成する getPlanDays() を追加
- [x] PlansSection.tsx: 日数タブをDBのアクティブプランから動的生成（"3 days"タブ消去確認済）
- [x] PurchaseDrawer.tsx: 日数選択をDB動的対応に修正（PlanDays型削除、getPlanDays()使用）

## メールアドレスホワイトリストによるログイン制限

- [x] ALLOWED_EMAILS環境変数は不要（DB参照に移行済み）
- [x] OAuthコールバック（server/_core/oauth.ts）にホワイトリストチェックを追加（許可外メールはログイン拒否）
- [x] 拒否時は「アクセス権限がありません」エラーページにリダイレクト
- [x] フロントエンドに/unauthorizedページを追加
- [ ] サイトをPublicに変更してPublish（Yoshiさんが手動で実施）

## Adminページ：ホワイトリスト管理UI

- [x] DBスキーマにallowed_emailsテーブルを追加（id, email, note, createdAt）
- [x] pnpm db:pushでマイグレーション実行
- [x] server/db.tsにgetAllowedEmails/addAllowedEmail/deleteAllowedEmailヘルパーを追加
- [x] server/routers/admin.tsにadmin.allowedEmails.list/add/deleteプロシージャを追加
- [x] OAuthコールバックのホワイトリストチェックをDB参照に切り替え（ALLOWED_EMAILS環境変数から移行）
- [x] AdminPage.tsxに「Access」タブを追加（メールアドレス一覧・追加・削除UI）
- [x] 初期データとしてkazuyoshi.yamada@bonfire.co.jpをDBに投入

## Under Constructionページ

- [x] Unauthorized.tsxをUnder Constructionデザインに変更（サービス準備中のメッセージ）

## ユーザープロフィール機能（購入フロー＋マイページ）

- [x] DBスキーマのusersテーブルにfullName, nationality, age, phoneNumber, preferredLanguageフィールドを追加
- [x] pnpm db:pushでマイグレーション実行
- [x] server/db.tsにupdateUserProfile/getUserProfileヘルパーを追加
- [x] server/routers.tsにuser.updateProfile/user.getProfileプロシージャを追加
- [x] 購入フロー（PurchaseDrawer）にProfile入力ステップを追加（Login→Profile→Duration→Data→Price→Payment→Complete）
- [x] プロフィール入力ステップを作成（氏名・国籍・年齢の3項目必須）
- [x] マイページ（MyPage）にプロフィール編集セクションを追加（任意項目含む）
- [x] 国籍はドロップダウン（国名リスト）で選択できるようにする

## Google OAuth認証への完全移行

- [x] google-auth-libraryパッケージをインストール
- [x] server/_core/googleOAuth.tsを新規作成（Google OAuth認証フロー）
- [x] server/_core/oauth.tsをGoogle OAuthコールバックに置き換え
- [x] server/_core/sdk.tsにsessionトークン生成・検証部分を維持（JWT部分は流用）
- [x] env.tsにGOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRETを追加
- [x] フロントエンドのgetLoginUrl()をGoogle OAuth URLに変更
- [x] client/src/const.tsのgetLoginUrl()を更新
- [x] ログインボタンのUIをGoogleボタンデザインに更新
- [x] Manus OAuth関連コード（sdk.tsのexchangeCodeForToken等）を削除またはコメントアウト
- [x] 動作確認・チェックポイント保存

## セキュリティレビュー修正（2026-06-24）

- [x] [CRITICAL] isEmailAllowed() のDB未接続時フォールバックを fail-closed（false）に修正（server/db.ts）
- [x] [HIGH] registerOAuthRoutes（Manus OAuthコールバック /api/oauth/callback）を無効化（server/_core/index.ts コメントアウト）
- [x] [HIGH] server/_core/oauth.ts を無効化済みスタブに書き換え（TypeScriptエラー解消）
- [x] [MEDIUM] addTopupPlan() の合成UUID（activation-${identifier}-${Date.now()}）を廃止し、プロバイダーの実際の activation ID を使用するよう修正（server/bappy.ts）
- [x] [LOW] sdk.ts からレガシーManus OAuth コード（OAuthService, exchangeCodeForToken, getUserInfo）を削除。cronジョブ認証に必要な getUserInfoWithJwt は保持

## Google OAuth修正（2026-06-24）

- [x] getRedirectUri()をx-forwarded-proto/x-forwarded-hostを優先するよう修正（本番環境でhttps://が正しく生成される）
- [x] statePayloadのoriginも同様に修正（getOrigin()関数を追加してDRY化）
- [x] Google OAuth削除・Manus OAuth統一済みのため不要

## 韓国語ページ /app/ko 実装（SEO・AI検索対策）

- [x] App.tsxに /app/ko ルートを追加（WelcomeKo コンポーネント or 言語プロップ渡し）
- [x] i18nルーティング対応：/app/ko アクセス時に自動で言語を ko に切り替えるフック実装
- [x] Welcome.tsx の全ハードコードテキストを useTranslation() キーに置き換え
- [x] FEATURES・FAQS・レビュー等の定数配列を ko.ts に翻訳キー追加して対応
- [x] ko.ts の翻訳テキストをAIで自然な韓国語に品質向上
- [x] index.html に動的メタタグ更新ロジック（useEffect で lang/canonical/OG を切り替え）
- [x] /app/ko 用 SEO メタタグ（title/description/keywords/canonical/hreflang）を韓国語で設定
- [x] sitemap.xml に /app/ko を追加し hreflang alternate を /app と相互リンク
- [x] JSON-LD（FAQPage/Service Schema）を韓国語版で /app/ko に出力
- [x] llms.txt に韓国語ページの情報を追加
- [x] HowItWorksSection・PlansSection・ContactSection・Footer を useTranslation() 対応に更新

## Step 7: eSIM QRコード表示（onCompleteフロー）

- [x] PurchaseDrawer.tsx: initCheckout.onSuccessでsetEsimOrderId(data.orderId)を追加
- [x] PurchaseDrawer.tsx: EmbeddedCheckoutProviderのoptionsにonComplete: () => setStep(8)を追加
- [x] PurchaseDrawer.tsx: Step 8→7に変更（esimLoading条件・QRキャンバス描画条件）
- [x] en.ts: stepLabelsに"eSIM"を追加（7ステップ対応・"Complete"を削除）
- [x] en.ts: preparingEsim/esimReadyTitle/esimReadyDesc/esimIccid/esimActivateIos/esimActivateAndroid/esimDoneキーを追加
- [x] ko.ts: stepLabelsを7要素に更新（"완료"を削除）
- [x] zh-TW.ts: stepLabelsを7要素に更新（"完成"を削除）
- [x] th.ts: stepLabelsを7要素に更新（"เสร็จสิ้น"を削除）
- [x] Welcome.tsx: payment=complete時のinitialStepを8→7に修正
- [x] PurchaseDrawer.tsx: useCallback/useMemoを追加してonCompleteを安定参照に修正（Stripe警告解消）
- [x] 全55テストpass・TypeScriptエラーなし・ビルド成功

## Stripe Embedded Checkout（ページ内決済）

- [x] @stripe/react-stripe-jsをインストール
- [x] stripe.tsのcreateCheckoutSessionをui_mode: "embedded_page"に変更（clientSecretを返す）
- [x] orders.tsのinitCheckout/topupCheckoutをclientSecretを返すよう修正
- [x] PurchaseDrawer.tsxにEmbeddedCheckoutProvider/EmbeddedCheckoutを追加（Step 5内で表示）
- [x] MyPage.tsxのTopupPanelにEmbeddedCheckoutを追加
- [x] Welcome.tsxに?payment=complete検知ロジックを追加（return_url後にStep 6完了画面を表示）
- [x] PurchaseDrawerPropsにinitialStepプロップを追加（外部から特定ステップで開く）
- [x] Stripeクーポン適用後の実際支払い額をDBに反映（session.amount_totalでupdateOrderAmountJpy）
- [x] payment_statusチェック追加（paid/no_payment_required以外はeSIM発行スキップ）

## Google OAuth 一からやり直し

- [x] 新しいGoogle Cloud ConsoleプロジェクトでOAuth 2.0クライアントIDを作成（yah-mobile-v1）
- [x] 新しいGOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を環境変数に設定
- [ ] 本番環境（yah.mobi）でGoogle OAuthログインの動作確認（Publish + Google Cloud Console設定が必要）

## 外部エンジニア視点による徹底的なコードレビュー・修正

- [x] セキュリティ: helmet（セキュリティヘッダー）を追加（XSS・クリックジャッキング・MIME sniffing対策）
- [x] セキュリティ: express-rate-limit（認証エンドポイント15分30回・API1分120回）を追加
- [x] セキュリティ: express.jsonのbodyサイズ制限を50mb→1mbに削減
- [x] OAuth: コールバックエラー時にJSONではなくユーザーフレンドリーなエラーページにリダイレクト
- [x] OAuth: invalid_grantエラーの専用メッセージ追加
- [x] OAuth: access_denied時は元のページに戻す（エラーページではなく）
- [x] OAuth: GOOGLE_CLIENT_ID/SECRETが未設定の場合の早期エラーチェック追加
- [x] OAuth: コールバックにもCache-Controlヘッダーを追加
- [x] UX: Unauthorizedページをエラー種別（auth_failed/under_construction）で分岐表示
- [x] UX: Sign inボタンのreturnPathを/app?open=trueに設定（ログイン後にDrawerが開く）
- [x] 安定性: bappy.tsのfetchにタイムアウト追加（トークン取得10秒、API呼び出し20秒）
- [x] 安定性: ロゴ画像読み込み失敗時のテキストフォールバック追加（デスクトップ・モバイル両方）

## Google OAuth削除・Manus OAuth統一

- [x] server/_core/googleOAuth.ts（既に削除済み）
- [x] server/_core/index.tsからGoogle OAuth関連のimport・登録コードは存在しない（済み）
- [x] server/_core/sdk.tsからGoogle OAuth関連コードは存在しない（済み）
- [x] server/_core/env.tsにGOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRETは存在しない（済み）
- [x] client/src/const.tsのgetLoginUrl()はManus OAuth URLを正しく指している（済み）
- [x] server/_core/oauth.tsのisEmailAllowedチェック・ returnPath対応・エラー時リダイレクトを追加
- [x] Unauthorized.tsxのreasonパラメータ対応を追加
- [x] 全テストpass・TypeScriptエラーなし・ビルド成功確詍

## Google OAuth 統一（クリーン再実装 2026-06-25）

### 設計方針：リダイレクトURIを環境変数で固定（redirect_uri_mismatch を構造的に防止）
- [x] env.ts に googleClientId / googleClientSecret / googleRedirectUri を追加
- [x] GOOGLE_REDIRECT_URI を本番固定値（https://yah.mobi/api/auth/google/callback）でSecret設定

### 既存 Manus OAuth コード削除
- [x] server/_core/oauth.ts（registerOAuthRoutes）を削除
- [x] server/_core/sdk.ts からトークン交換系（exchangeCodeForToken/getUserInfo/getTokenByCode/getUserInfoByToken/OAuthService）を削除し、セッション管理のみ残す
- [x] client/src/const.ts の getLoginUrl を Google ログインURL（/api/auth/google/login）に変更
- [x] server/_core/index.ts の registerOAuthRoutes 呼び出しを registerGoogleOAuthRoutes に置換

### Google OAuth 2.0 クリーン実装
- [x] google-auth-library をインストール
- [x] server/_core/googleOAuth.ts を新規作成（固定リダイレクトURI設計）
  - [x] /api/auth/google/login → Google同意画面へリダイレクト
  - [x] /api/auth/google/callback → コード交換・IDトークン検証・ホワイトリストチェック・セッション発行
  - [x] エラー時は /unauthorized?reason=... へリダイレクト
- [x] openId は google_{sub} 形式で統一

### フロントエンド・テスト
- [x] App.tsx / main.tsx / useAuth.ts のログインフローを確認・維持
- [x] PurchaseDrawer.tsx のサインインボタンをGoogleログインに統一
- [x] server/google-oauth.test.ts を新実装に合わせて更新
- [x] 全テストpass・TypeScriptエラーなし・ビルド成功を確認
- [x] チェックポイント保存

## セキュリティ対応

- [x] H-1: mockPurchaseエンドポイントを削除（本番環境での無課金eSIM発行経路を閉鎖）

## YahLogo インラインSVGコンポーネント統一（2026-06-25）

- [x] client/src/components/YahLogo.tsx を新規作成（インラインSVG、variant="dark"|"light"）
- [x] Nav.tsx: デスクトップロゴ・モバイルメニューロゴを YahLogo に置換
- [x] Footer.tsx: ロゴを YahLogo variant="light" に置換
- [x] AdminPage.tsx: ヘッダーロゴを YahLogo variant="dark" に置換
- [x] Unauthorized.tsx: ロゴを YahLogo variant="light" に置換（壊れていた白SVGを修正）
- [x] /manus-storage/... への依存を完全排除（外部URL不要・ビルド成果物に直接埋め込み）
- [x] 全67テストpass・TypeScriptエラーなし・ビルド成功

## zh-CN（簡体字中国語）対応（2026-06-25）

- [x] client/src/i18n/zh-CN.ts を新規作成（全キー翻訳済み：nav/hero/plans/faq/contact/drawer/mypage/seo等）
- [x] client/src/i18n/index.ts に zh-CN を追加（SUPPORTED_LANGUAGES・resources・supportedLngs）
- [x] client/src/App.tsx に /app/zh ルートを追加（forceLang="zh-CN"）
- [x] client/src/pages/Welcome.tsx の SEO メタタグを zh-CN 対応に拡張（canonical/hreflang/OGロケール/JSON-LD）
- [x] client/public/sitemap.xml に /app/zh エントリと hreflang="zh-CN"/"zh-Hans" を追加
- [x] server/llmsTxt.ts に zh-CN ページ情報を追加
- [x] 全67テストpass・TypeScriptエラーなし

## セキュリティ対応 P0〜P2（2026-06-25）

- [x] H-1: mockPurchaseエンドポイントを削除
- [x] M-4: 脆弱性パッケージ更新（axios・@trpc/server・@aws-sdk）
- [x] H-3: Stripe return_url の origin ホワイトリスト検証を追加
- [x] H-2: ストレージプロキシの機密キー（esim/・qr/）に認証チェックを追加
- [x] M-3: contactフォーム専用レート制限（1時間5回）を追加
- [x] M-2: 本番環境でCSPヘッダーを有効化
- [x] M-1: JWT有効期限を365日→30日に短縮

## UX・アクセシビリティ改善（2026-06-25）

- [x] CTA重複・優先順位の整理（ヒーロー/サポートストリップ/チャット/CTAバナー各ボタンにaria-label追加・役割を明確化）
- [x] focus-visibleグローバルルール実装（WCAG 2.1 AA準拠・黒背景では白リングに自動切替・inputs/textareaはinsetリング・prefers-reduced-motion対応）

## セキュリティ対応 L1〜L2（2026-06-25）

- [x] L1: Permissions-Policyヘッダーを追加（camera/microphone/geolocation/payment等を全て無効化）
- [x] L2: JWTブラックリスト機能を実装（jwt_blacklistテーブル・セッション検証チェック・Admin強制無効化UI）

## 多言語・UX改善（2026-06-25）

- [x] タイ語翻訳を英語（325行）と同等に完成（全キー完全翻訳済み）
- [x] focus-visible WCAG 2.1 AA対応確認（実装済み・追加不要）

## Core Web Vitals最適化 + JSON-LD拡充（2026-06-25）

- [x] LCP最適化：preload="auto"+poster画像でLCPを静止画に確定・index.htmlにfetchpriority="high"のpreloadリンク追加
- [x] CLS最適化：font-display:swap実装済み確認・画像loading="lazy" decoding="async"実装済み確認
- [x] INP最適化：popstate/visibilitychange/beforeunloadリスナーにpassive:trueを追加
- [x] JSON-LD拡充：Service→Product+AggregateRating+Review+AggregateOfferに格上げ（全言語対応）

## モバイルHERO出し分け実装（2026-06-26）

- [x] モバイルHERO画像をWebPに変換してManusストレージにアップロード（41KB JPEG→14.3KB WebP、65%削減）
- [x] Welcome.tsxのヒーローセクションをモバイル=画像・デスクトップ=動画に出し分け実装（md:hidden/hidden md:block）
- [x] index.htmlにモバイル向けpreloadリンクを追加（media="(max-width: 767px)"）
- [x] 全67テストpass・TypeScriptエラーなし

## 返金不可同意チェックボックス追加（2026-06-26）

- [x] PurchaseDrawer Step 5（注文サマリー確認画面）に返金不可同意チェックボックスを追加
- [x] 未チェック時は「決済に進む」ボタンを無効化（バリデーションエラー表示）
- [x] 5言語対応（en/ko/zh-TW/zh-CN/th）に refundConsentLabel / refundConsentRequired キーを追加
- [x] 特商法セクション（LegalSection.tsx）の返品・キャンセルポリシーをデジタル商品の返金不可ポリシーに更新
- [x] 全67テストpass・TypeScriptエラーなし

## 返金ポリシー全サイト統一（2026-06-26）

- [x] FAQ（ko/zh-CN/th）の返金Q&Aを現行ポリシー（QRコード発行後は返金不可）に更新
- [x] chatSupport.subtitle（ko/zh-CN/th）から「返金申請」の表現を削除し「接続問題」等に変更
- [x] llms.txt（Service Summary・FAQ）の返金ポリシー記載を2箇所更新
- [x] zh-TW plans.subtitleの「隨時取消（いつでもキャンセル可能）」を削除し現行ポリシーと整合
- [x] en.ts FAQ・chatSupport.subtitle更新済み（前回作業で完了）
- [x] 全67テストpass・TypeScriptエラーなし

## How we compare. テーブルのDB連動・admin編集機能（2026-06-26）

- [x] comparison_rows テーブルを追加（serviceName/plan/estPrice/pricePerGb/support/network/isHighlight/sortOrder/isActive）
- [x] 現状の5行（yah.mobile/Airalo/Holafly/Ubigi/Mobal）を初期データ投入
- [x] db.ts に CRUD ヘルパー追加（getActive/getAll/create/update/delete/reorder）
- [x] server/routers/comparison.ts 新規作成（public list + admin CRUD）
- [x] routers.ts に comparisonRouter 結合
- [x] 公開側 ComparisonTable.tsx を DB連動（trpc.comparison.list）に変更
- [x] 管理側 ComparisonTab.tsx 新規作成（インライン編集・モーダル追加・削除・表示順・有効切替・Highlight）
- [x] AdminPage に Comparison タブ追加
- [x] /admin/comparison パスURL対応（/admin?tab=comparison も維持）
- [x] comparison.test.ts 作成（11テスト全パス）
- [x] 公開側・管理画面の表示をスクリーンショットで確認

## Comparison 列・行の追加削除（可変カラム化）（2026-06-26）

- [x] comparison_columns テーブル追加（id/label/sortOrder/isActive）
- [x] comparison_cells テーブル追加（rowId/columnId/value）
- [x] comparison_rows をスリム化（label/isHighlight/sortOrder/isActive）※rowLabel列追加
- [x] 既存5行×6列データを新モデルへ移行
- [x] db.ts ヘルパーを可変カラム対応に再実装（columns/rows/cells CRUD）
- [x] comparison ルーターを可変カラム対応に再実装（列追加削除・行追加削除・セル更新）
- [x] 公開側 ComparisonTable を可変列レンダリングに変更
- [x] 管理側 ComparisonTab に列の追加・削除UI、行の追加・削除UIを実装
- [x] comparison.test.ts を新モデルに合わせて更新
- [x] 検証・スクリーンショット確認

## Comparison 列・行の追加削除（可変カラム化）2026-06-26
- [x] comparison_columns / comparison_cells テーブル追加（comparison_rows はスリム化）
- [x] 既存5行×固定カラムを columns/cells へデータ移行
- [x] db.ts を可変カラム対応に全面書き換え（rows/columns/cells CRUD・列削除時のセル連動削除）
- [x] comparison ルーターを可変カラム対応に再実装（table/tableAll/row.*/column.*/cell.*）
- [x] 公開側 ComparisonTable を可変列レンダリングに書き換え
- [x] 管理側 ComparisonTab をスプレッドシート型編集UI（列追加削除・行追加削除・セル編集）に書き換え
- [x] comparison.test.ts を可変カラムAPIに更新（17テスト）
- [x] 全84テストpass・TypeScriptエラー0・公開/管理画面の表示確認済み
- [x] My Orders: 購入履歴の非表示（ソフトデリート）ボタン実装

## /admin Testing タブ

- [x] testingルーター作成（LIVE-01〜08: Bappy/DB/Stripe/LLM/i18n/llms.txt/為替/プラン推薦）
- [x] TestingTabコンポーネント作成（ライブチェックUI + 手動テストチェックリスト）
- [x] AdminPage.tsxにTestingタブを追加
- [x] Vitestテスト追加（testing.test.ts 8テストpass）

## 毎日定時ヘルスチェック（Heartbeat）

- [x] server/scheduledHealthCheck.ts: LIVE-01/02/03/07/08実行 + Gmail MCP メール通知
- [x] server/_core/index.ts: /api/scheduled/daily-health-check ルート登録
- [x] デプロイ後: manus-heartbeat create でスケジュール登録（毎日09:00 JST = 00:00 UTC）taskUid: hbFnmhtnbFskUxKcXaQ9hF

## E2E ブラウザテスト自動化（AGENT cron）

- [x] server/scheduledE2eResults.ts: E2E結果受信エンドポイント実装
- [x] server/_core/index.ts: POST /api/scheduled/e2e-results ルート登録
- [x] AGENT cron登録: 毎日00:30 UTC (09:30 JST) にブラウザE2Eテスト実行 taskUid: gEJxfWCtUk8KiMlzkh8QMz
  - PF-01〜04: 購入フロー（ホームページ/プラン表示/Stripeチェックアウト遷移）
  - MP-01〜02: マイページ確認
  - I18N-01〜02: 多言語切り替え確認
  - PERF-01: ページロード時間計測

## /admin Communicationタブ + ユーザーメール通知

- [x] client/src/components/admin/types.ts に 'communication' を追加
- [x] client/src/components/admin/CommunicationTab.tsx を作成（通知フロー4段階の記載・実装状況表示）
- [x] client/src/components/admin/index.ts に CommunicationTab をエクスポート追加
- [x] client/src/pages/AdminPage.tsx に Communicationタブを追加
- [x] server/esimRetryService.ts にユーザーメール送信ロジックを追加（リトライ中・復旧成功・最終失敗）
- [x] server/_core/index.ts の Stripe Webhook で購入直後のユーザーメール送信を追加
- [x] server/mailer.ts 作成（Gmail MCPヘルパー + 4種メールテンプレート）
- [x] server/mailer.test.ts にテスト追加（16テストpass）

## chat.yah.mobi Webhook 連携

- [x] server/yahChatWebhook.ts 作成（6エンドポイントのWebhookヘルパー）
- [x] YAH_CHAT_WEBHOOK_SECRET を Secrets に追加
- [x] server/_core/googleOAuth.ts に customer-profile Webhook（Googleログイン後）
- [x] server/_core/index.ts に purchase-created + esim-status Webhook（Stripe fulfilled後）
- [x] server/routers/admin.ts に plans-updated Webhook（createPlan/updatePlan/deletePlan後）
- [x] server/routers/esim.ts に esim-status Webhook（syncData後）
- [x] server/scheduledChatSync.ts 作成（Heartbeatハンドラー: 1時間ごとesim-status・週次competitor-plans）
- [x] server/_core/index.ts に /api/scheduled/chat-esim-status-sync と /api/scheduled/chat-competitor-sync を登録
- [ ] デプロイ後: manus-heartbeat create で chat-esim-status-sync（1時間ごと）と chat-competitor-sync（毎週月曜09:00 JST）の cron を登録

## purchase-created Webhook ペイロード更新（OMAX自動返金対応）

- [x] server/yahChatWebhook.ts の YahChatPurchase インターフェースに stripePaymentIntentId と email フィールドを追加
- [x] server/_core/index.ts の Stripe Webhook 送信箇所を更新（session.payment_intent から paymentIntentId を抽出・email フィールドも追加）
- [x] TypeScript エラーなし確認・全120テストpass
- [x] チェックポイント保存

## デプロイ後手動作業（2026-06-27）

- [ ] YAH_CHAT_WEBHOOK_SECRET を Secrets に設定
- [ ] OMAX_TECH_EMAIL を Secrets に設定（OMAX障害通知用メールアドレス）
- [ ] Heartbeat cron 登録: chat-esim-status-sync（1時間ごと）
- [ ] Heartbeat cron 登録: chat-competitor-sync（毎週月曜 09:00 JST）

## DBインデックス追加（スケール対応）

- [x] drizzle/schema.ts の orders テーブル: uniq_orders_stripePaymentIntentId・idx_orders_userId_createdAt・idx_orders_status_createdAt — 前セッション実装済み
- [x] drizzle/schema.ts の esim_links テーブル: idx_esim_links_bappyLinkUuid・idx_esim_links_iccid・idx_esim_links_userId_createdAt — 前セッション実装済み
- [x] drizzle/schema.ts の users テーブル: idx_users_openId・openId UNIQUE — 前セッション実装済み
- [x] スキーマ確認完了（追加インデックスは不要）

## Stripe Webhook 冪等性強化

- [x] orders テーブルの stripe_payment_intent_id に UNIQUE 制約（uniq_orders_stripePaymentIntentId）— 前セッション実装済み
- [x] stripe_events テーブルによる Stripe Event ID 冪等性チェック（isStripeEventProcessed / recordStripeEvent）— 前セッション実装済み
- [x] 冪等性は二重に実装済み（UNIQUE制約 + イベント履歴テーブル）

## Firebase Phase 0 アダプター層

- [x] server/adapters/ ディレクトリを作成
- [x] server/adapters/types.ts 作成（Mail/Storage/Notify/Scheduler インターフェース定義）
- [x] server/adapters/mail.ts + notify.ts + index.ts 作成（MAIL_PROVIDER/NOTIFY_PROVIDER で切り替え）
- [x] apphosting.yaml 作成（Firebase App Hosting 設定・シークレットコメント付き）

## 購入確認画面 同意チェックボックス実装（2026-06-27）

- [x] drizzle/schema.ts に user_consents テーブルを追加
- [x] pnpm drizzle-kit generate でマイグレーションSQL生成・適用
- [x] client/src/pages/PrivacyPolicy.tsx 作成（/privacy）
- [x] client/src/pages/Terms.tsx 作成（/terms）
- [x] App.tsx にルート追加（/privacy・/terms）
- [x] i18n に同意関連テキストを追加（ja/en/zh-TW/ko/th）
- [x] PurchaseDrawer.tsx の Step 5 に同意チェックボックス3件を追加（利用規約・プライバシーポリシー・マーケティングメール）
- [x] 購入確定ボタンを利用規約・プライバシーポリシー未チェック時に非活性化
- [x] server/routers/user.ts に recordConsent プロシージャを追加
- [x] 購入完了時に同意記録をDBに保存（consent_type/version/granted/ip_address/consented_at）
- [x] テスト追加・全テストpass確認
- [x] チェックポイント保存

## Legal整合・ログイン画面同意表示（2026-06-27）

- [x] LegalSection.tsx の Privacy Policy・Terms of Service アコーディオンに「詳細はこちら」リンクを追加（/privacy・/terms へ誘導）
- [x] ログイン画面（Google OAuth ボタン下）に「ログインすることで利用規約・プライバシーポリシーに同意したものとみなします」を追加
- [x] チェックポイント保存

## コンプライアンス対応 6項目（2026-06-27）

- [x] 特定商取引法 — 電話番号欄を「請求があれば遅滞なく開示する」旨に更新（LegalSection + Terms.tsx）
- [x] 利用規約に未成年者への販売制限を明記（Terms.tsx + LegalSection）
- [x] プライバシーポリシーに同意記録の保管期間ポリシーを追記（7年 / GDPR準拠）
- [x] /cookie-policy ページ作成（Cookie種別・目的・保管期間・オプトアウト方法）
- [x] クッキーバナーコンポーネント実装（初回訪問時表示・同意/拒否・localStorage保存）
- [x] App.tsx に /cookie-policy ルート追加
- [x] 問い合わせフォームに「データ削除リクエスト」問い合わせ種別を追加
- [x] TypeScript エラーなし・テスト pass 確認
- [ ] チェックポイント保存

## Firebase 統合（yah-mobile-v1-3ed24）

### Phase 1: Firebase SDK セットアップ
- [x] firebase-admin SDK をサーバーにインストール
- [x] firebase SDK をクライアントにインストール
- [ ] FIREBASE_SERVICE_ACCOUNT_KEY を Secrets に設定（Yoshiさんが手動設定）
- [x] server/firebase.ts 作成（Admin SDK 初期化）
- [ ] client/src/lib/firebase.ts 作成（Client SDK 初期化）（Phase 3で実施）

### Phase 2: Firestore 共有データバス（yah.mobi ↔ chat.yah.mobi Webhook廃止）
- [x] Firestore コレクション設計（purchases / esim_status / plans / customer_profiles）
- [x] server/firestoreSync.ts 作成（購入完了・ eSIMステータス・プラン更新を Firestore に書き込み）
- [x] Stripe Webhook fulfilled 後に Firestore purchases コレクションに書き込み
- [x] esim.syncData 後に Firestore esim_status コレクションに書き込み
- [x] admin プラン更新後に Firestore plans コレクションに書き込み
- [x] Google OAuth ログイン後に Firestore customer_profiles コレクションに書き込み
- [ ] 既存 yahChatWebhook.ts を Firestore 書き込みに置き換え（Webhook廃止）（Phase 2完了後、chat.yah.mobi側の準備が整ったら実施）

### Phase 3: Firebase Auth 移行
- [x] server/firebaseAuth.ts 作成（Firebase ID Token 検証 + セッション Cookie 発行）
- [x] POST /api/auth/firebase/session エンドポイント登録
- [x] client/src/lib/firebase.ts 作成（Firebase Client SDK 初期化）
- [x] FirebaseLoginButton コンポーネント作成
- [x] Nav.tsx / MyPage.tsx / AdminPage.tsx / Unauthorized.tsx / PurchaseDrawer.tsx のログインボタンを FirebaseLoginButton に置き換え
- [x] App.tsx /login ルートを Firebase Auth フローに更新
- [x] useAuth.ts のデフォルト redirectPath を /login に変更
- [x] TypeScript エラーなし・テスト pass 確認
- [ ] VITE_FIREBASE_API_KEY 等の Firebase 設定値を Secrets に設定（Yoshiさんが手動設定）

### Phase 4: DB 全体 Firestore 移行（TiDB → Firestore）
- [ ] Firestore コレクション設計（全18テーブル相当）
- [ ] TiDB → Firestore データ移行スクリプト作成
- [ ] server/db.ts を Firestore クエリに置き換え
- [ ] Drizzle ORM 依存を除去

## Firebase Auth ログイン失敗の根本修正（2026-06-28）
- [x] CSP: connect-src にFirebase/Google認証ドメインを追加（identitytoolkit/securetoken/googleapis/firebaseapp）
- [x] CSP: frame-src にauthDomain・apis.google.com・accounts.google.comを追加
- [x] CSP: scriptSrc にapis.google.com・gstaticを追加
- [x] COOP: Cross-Origin-Opener-Policy を same-origin-allow-popups に設定（signInWithPopup対応）
- [x] CSP: imgSrc にGoogleプロフィール画像ドメインを追加
- [x] firebaseAuth.ts: エラーログを段階別に詳細化（verifyIdToken/upsertUser/createSessiontoken）
- [x] FirebaseLoginButton: エラーコードをユーザーに分かりやすく表示
- [x] firebase.ts(client): COOPフォールバックでpopup失敗時にredirectへ確実に移行
- [x] テスト追加・全テスト通過確認（securityHeaders.test.ts 追加、114件pass）
- [x] チェックポイント保存

## MyPage表示・ログイン後セッション確立の修正（2026-06-28）
- [x] LoginRedirect に getRedirectResult 処理を追加（リダイレクト認証後にセッション確立）
- [x] ポップアップ成功/リダイレクト復帰の両フローで idToken→session を確立
- [x] ログイン入口を /login 経由に一本化（FirebaseLoginButton・Nav）、未使用 handleFirebaseRedirectResult を削除
- [x] 認証失敗時のエラー理由をUnauthorizedに正しく伝える
- [x] MyPage の Firestore 連携状況を確認（db.ts は Firestore-backed、orders/esim/profile/notifications すべて firestoreDb 経由）
- [x] ローカルでセッション確立フローをテスト（/login 200、session 400/401 期待通り）
- [x] firebaseSession.test.ts 追加（returnPath 正規化・openId 変換）
- [x] 全テスト通過確認（120件 pass）
- [x] チェックポイント保存（version 3ce7d200）・デプロイ案内

## signInWithRedirect storage-partitioning エラー対応（2026-06-28）
- [x] 認証をポップアップ専用に変更（signInWithRedirect を完全撤去）
- [x] FirebaseLoginButton をクリック起点で直接 signInWithPopup → セッション確立する方式に変更
- [x] /login をボタン表示型に変更（自動ポップアップを廃止しブロック回避）
- [x] ポップアップブロック時はトーストで「ポップアップを許可」案内を表示
- [x] 全テスト通過確認（120件 pass）
- [x] チェックポイント保存・Publish案内

## ポップアップ認証後にSign Inに戻る（セッションCookie保持）の修正（2026-06-28）
- [ ] セッションCookieのsameSiteをnone→laxに変更（同一オリジンfetchなのでlaxで十分かつサードパーティCookie制限を回避）
- [ ] 既存テスト（cookies/securityHeaders）への影響確認
- [ ] 全テスト通過確認
- [ ] チェックポイント保存・Publish案内・本番検証依頼

## Firebase連携の根本改善（openId整合・Cookie・検証）（2026-06-28）
- [ ] Firestoreの実ユーザーのopenId形式を確認（google_ プレフィックスか、google: か、firebase uid そのままか）
- [ ] firebaseAuth.ts の toGoogleOpenId と getUserByOpenId の検索キーが一致しているか検証
- [ ] verifyIdToken の google.com identity 取得が正しいか（providerData の sub）確認
- [ ] openId形式を統一し、必要なら既存データの移行/フォールバック検索を実装
- [ ] セッション検証失敗の理由を本番ログで特定できるようログ強化
- [ ] 全テスト通過確認・チェックポイント保存・Publish案内

## Firebase Auth ↔ Firestore 一本化（最終）

- [x] firebaseAuth.ts: openId生成をresolveGoogleOpenIdに統一（Google sub必須・Firebase UIDフォールバック撤去）
- [x] MySQL/Drizzle残骸スクリプト削除（list-users/check-plans/fix-access/migrate-plans-to-bappy/test-firestore-mongo/test-firestore-rest）
- [x] add-admin.mjsをFirestore一本に書き換え（MySQL UPDATE削除）
- [x] 古いビルド成果物dist削除（registerGoogleOAuthRoutesキャッシュエラー解消）
- [x] Firestore一本化のE2E検証（upsert→get→docId/openId一致→削除）正常
- [x] auth.logout.test の sameSite 期待値を lax に修正・全120テストpass

## 認証の根本作り直し（authDomain自ドメイン化 / redirect方式）
- [x] server/firebaseAuthProxy.ts 新規: /__/auth/* を本家へプロキシ、/__/firebase/init.json を自前配信
- [x] server/_core/index.ts: プロキシ登録、CSP formAction に Google認証ドメイン追加
- [x] client/lib/firebase.ts: authDomain=自ドメイン(window.location.host)、signInWithRedirect方式に書き換え
- [x] FirebaseLoginButton.tsx: redirect開始のみに簡素化、returnPathをsessionStorageへ退避
- [x] App.tsx LoginRedirect: getRedirectResult→セッション確立→戻り先遷移を実装
- [x] 旧Google OAuth残骸削除: server/_core/googleOAuth.ts, server/google-oauth.test.ts
- [x] 未使用 onFirebaseAuthStateChanged 削除
- [x] securityHeaders.test 更新（formAction検証追加）
- [x] tsc 0エラー / 全113テストpass
- [ ] 本番Publish後の実機ログイン検証（要Firebase Console: authorized domains に yah.mobi）

## Bearer方式（Cookie完全廃止）への作り直し ★最優先
- [x] サーバー: authenticateRequest を Firebase IDトークン(Bearer)検証に差し替え（Cookie検証廃止）
- [x] サーバー: openId生成(google_<sub>)+Firestore upsert を Bearer 経路に統合
- [x] サーバー: Cron用 Manus JWT 経路（manus-cron-secret）は維持
- [x] サーバー: /api/auth/firebase/session（Cookie発行）エンドポイント廃止
- [x] サーバー: auth.logout を簡素化（Cookie削除廃止）
- [x] サーバー: firebaseAuthProxy / /__/auth プロキシ / init.json 自前配信を削除
- [x] サーバー: cookies.ts のセッションCookie部、sdk.ts の createSessionToken/verifySession 整理
- [x] サーバー: shared/const.ts の COOKIE_NAME/SESSION_DURATION_MS 整理
- [x] クライアント: main.tsx の trpc に Authorization: Bearer <Firebase IDトークン> を付与、credentials:"include"廃止
- [x] クライアント: useAuth を Firebase onAuthStateChanged 起点に再実装
- [x] クライアント: firebase.ts の authDomain を標準(firebaseapp.com)に戻し、getIdToken()をexport
- [x] クライアント: ログインを signInWithPopup に統一、セッションAPI呼び出し削除
- [x] クライアント: App.tsx LoginRedirect を簡素化（セッションAPI呼び出し削除）
- [x] 型チェック・テスト更新・プレビュー検証
- [x] openId形式は google_<sub> に統一する方針で確定（実ユーザーほぼ無し・フォールバック不要）
- [x] チェックポイント保存（version: 5323bf11）
- [ ] 本番Publish（Yoshiさんが手動）→ 実機Googleログイン検証（要: Firebase Console authorized domains に yah.mobi / www.yah.mobi）

## クリーンアップ（getDb撤去 / レガシーテスト整理）最終
- [x] db.ts: レガシー getDb() シム本体を削除
- [x] scheduledHealthCheck.ts / routers/testing.ts: 未使用 getDb import を削除
- [x] 各テストの未使用 getDb モック（comparison/contact/orders.hide/plans）を除去
- [x] plans.test.ts: 旧TiDB前提「DB is null」テスト3件を実態に即した成功検証に修正
- [x] admin.ts: 誤解を招く「JWTブラックリスト」見出しコメントを修正
- [x] 既存Firestore旧形式ユーザー2件（google_<sub>）を削除（現在 users=0人）
- [x] devサーバー再起動でキャッシュエラー（cookies / createPasskey）解消・エラーなし起動
- [x] TypeScript 0エラー・全108テストpass・プレビュー（/ と /login）正常表示

## /manus-storage 一掃（本番500エラー対策）
- [x] manifest.json の PWAアイコンを /manus-storage から /icon-192.png /icon-512.png に変更
- [x] index.html の favicon/apple-touch-icon が Firebase Storage /assets/icons で 200 配信されることを確認
- [x] server/_core/storageProxy.ts（/manus-storage/* プロキシ）を削除し index.ts の登録を解除
- [x] server/storage.ts（/manus-storage を返すヘルパ）を削除
- [x] 未使用の server/_core/imageGeneration.ts（storagePut依存）を削除
- [x] vite.config.ts のPWA Service Workerから /manus-storage キャッシュ・denylistを削除し storage.googleapis.com キャッシュに置換
- [x] 関連import・テストの整合性確認（tsc 0エラー / 全114テストpass / ビルド成功・dist/sw.js もクリーン）
- [ ] チェックポイント保存 → 本番Publish案内

## Manus → Google/Firebase ブランディング完全置換
- [x] en.ts: secureLogin を Google アカウント文言に修正
- [x] ko.ts: secureLogin "Manus 계정" → "Google 계정" に修正
- [x] th.ts: secureLogin "บัญชี Manus" → "บัญชี Google" に修正
- [x] zh-CN.ts: secureLogin "Manus账户" → "Google账户" に修正
- [x] zh-TW.ts: Manus参照なし（確認済み）
- [x] CommunicationTab.tsx: "Manusプラットフォームのシステムアカウント" → "Firebase（Google）認証アカウント経由のシステムメール" に修正
- [x] PurchaseDrawer.tsx: Step 0 ログイン画面はi18nキー参照のみ（JSX内にManus文言なし）確認済み
- [x] 全ソース grep 確認: client/src/ 内にManus参照ゼロ（FirebaseLoginButton・ManusDialog・_core除く）
- [x] TypeScript 0エラー / 全113テストpass

## パフォーマンス改善

- [x] 未使用パッケージ削除（recharts・embla-carousel-react・react-resizable-panels・date-fns・next-themes・react-day-picker）
- [x] ui/chart.tsx・ui/carousel.tsx・ui/resizable.tsx・ui/calendar.tsx の削除（未使用コンポーネント）
- [x] sonner.tsx を next-themes から自前 ThemeContext に切り替え
- [x] App.tsx にコード分割（React.lazy + Suspense）を導入
- [x] vite.config.ts に manualChunks を追加してベンダーライブラリを分離
- [x] activeEsimList を useMemo でメモ化
- [x] OrderList の esim.list 重複クエリを props 経由に変更（esimByOrderId を useMemo でメモ化して渡す）

## IP Geolocation（購入場所の記録）

- [x] geoip-lite パッケージをインストール（外部API不要・ローカルDB方式）
- [x] server/geoip.ts ヘルパーを作成（IPから country/city/timezone を返す）
- [x] FsOrder型に purchaseCountry/purchaseCity/purchaseTimezone フィールドを追加（Firestoreスキーマ）
- [x] createOrder 関数に geo フィールドを追加
- [x] orders.initCheckout / topupCheckout tRPC プロシージャで IP を取得して Firestore に記録
- [x] 管理画面（AdminPage）に「Orders」タブを追加し、国・都市・タイムゾーンを表示（ユーザー画面には非表示）

## Accessibility 修正（2026-06-29）

- [ ] フォーム要素に id + htmlFor の紐付けを追加（ContactSection.tsx・PurchaseDrawer.tsx・管理画面フォーム群）
- [ ] <main> 要素を追加（Welcome.tsx・MyPage.tsx・Terms.tsx・PrivacyPolicy.tsx・CookiePolicy.tsx）

## ハイブリッドFirestoreアーキテクチャ移行（2026-06-29）

- [x] shared/userTypes.ts 作成（FsUser インターフェース — サーバー・クライアント共有）
- [x] client/src/lib/firebase.ts: getFirebaseDb() / db export を追加（Firestore Client SDK）
- [x] useAuth.ts 完全書き換え: Firebase Auth onAuthStateChanged + Firestore onSnapshot(users/{uid}) でリアルタイム監視
- [x] useAuth.ts: wouter useLocation を使った SPA ナビゲーション（window.location.href ハードリロード廃止）
- [x] MyPage.tsx: trpc.orders.list → Firestore onSnapshot（orders コレクション）に移行
- [x] MyPage.tsx: trpc.esim.list → Firestore onSnapshot（esim_links コレクション）に移行
- [x] MyPage.tsx: trpc.user.getProfile → useAuth().user から直接取得（onSnapshot 経由で常に最新）に移行
- [x] MyPage.tsx: trpc.notifications.listUnread → Firestore onSnapshot（notifications コレクション）に移行
- [x] firestore.rules 更新: users/orders/esim_links/notifications の読み取りルールを追加（自分のドキュメントのみ）
- [x] TypeScript 0 エラー / 全 113 テスト pass

## Firebase Auth一本化クリーンアップ（2026-06-29）

- [x] sdk.ts の Cron 経路（app_session_id Cookie チェック）を完全削除
- [x] scheduledHealthCheck / scheduledE2eResults / scheduledRetryProcessor ファイルを削除
- [x] index.ts から scheduled ルート登録を削除
- [x] trpc.auth.me / auth.logout はサーバー側 no-op として維持（クライアント未使用）
- [x] icon-192.png / icon-512.png 削除・favicon.svg に統一
- [x] LoginPage.tsx 超ミニマル版を実装（Firebase onAuthStateChanged → 即リダイレクト）
- [x] TypeScript 0 エラー / 113 テスト pass

## FirebaseLoginButton 完全削除（2026-06-29）

- [x] Nav.tsx: FirebaseLoginButton → a タグ（/login?redirect=...）に置き換え済み
- [x] PurchaseDrawer.tsx: FirebaseLoginButton → a タグに置き換え済み
- [x] AdminPage.tsx: FirebaseLoginButton → a タグに置き換え済み
- [x] MyPage.tsx: FirebaseLoginButton → a タグに置き換え済み
- [x] Unauthorized.tsx: FirebaseLoginButton → a タグに置き換え済み
- [x] client/src/components/FirebaseLoginButton.tsx: 削除完了
- [x] TypeScript: 0 エラー
- [x] テスト: 113 テスト pass

## サーバーサイド フルリファクタリング（2026-06-29）

- [ ] server/db/types.ts — 全Firestore型定義を集約
- [ ] server/db/users.ts — ユーザー関連CRUD
- [ ] server/db/orders.ts — 注文関連CRUD
- [ ] server/db/esim.ts — eSIM・アクティベーション関連
- [ ] server/db/admin.ts — 比較テーブル・許可メール・分析・監査ログ等
- [ ] server/db/index.ts — 全てre-export（互換性維持）
- [ ] server/webhooks/stripe.ts — Stripe Webhook処理を_core/index.tsから分離
- [ ] server/_core/index.ts — ミドルウェア・起動のみにスリム化
- [ ] server/bappy/auth.ts — Bappyトークン管理
- [ ] server/bappy/links.ts — createLink, getLink等
- [ ] server/bappy/topup.ts — addTopupPlan
- [ ] server/bappy/index.ts — re-export（互換性維持）

## Firebase Cloud Functions移行（2026-06-29）

- [x] functions/package.json — Cloud Functions用依存関係を定義
- [x] functions/tsconfig.json — TypeScript設定
- [x] functions/src/env.ts — 環境変数管理（process.env直接参照）
- [x] functions/src/firebase.ts — Firebase Admin SDK初期化
- [x] functions/src/trpc.ts — tRPCサーバー設定（publicProcedure/protectedProcedure/adminProcedure）
- [x] functions/src/context.ts — Firebase Auth IDトークン検証
- [x] functions/src/db/ — 全Firestoreクエリヘルパーをfunctionsにコピー・パス修正
- [x] functions/src/bappy/ — Bappy APIクライアントをfunctionsにコピー
- [x] functions/src/adapters/mail.ts — メール送信アダプター
- [x] functions/src/adapters/notify.ts — オーナー通知アダプター
- [x] functions/src/llm.ts — LLM呼び出しヘルパー
- [x] functions/src/stripe.ts — Stripe初期化・ヘルパー
- [x] functions/src/geoip.ts — IP Geolocationヘルパー（geoip-liteなし版）
- [x] functions/src/firestoreSync.ts — Firestore共有データバス
- [x] functions/src/mailer.ts — メール送信ヘルパー
- [x] functions/src/incidentDb.ts — インシデントDB操作
- [x] functions/src/esimRetryService.ts — eSIM再試行サービス
- [x] functions/src/routers/auth.ts — 認証ルーター
- [x] functions/src/routers/plans.ts — プランルーター
- [x] functions/src/routers/user.ts — ユーザールーター
- [x] functions/src/routers/contact.ts — お問い合わせルーター
- [x] functions/src/routers/notifications.ts — 通知ルーター
- [x] functions/src/routers/exchangeRates.ts — 為替レートルーター
- [x] functions/src/routers/esim.ts — eSIMルーター
- [x] functions/src/routers/orders.ts — 注文ルーター
- [x] functions/src/routers/admin.ts — 管理者ルーター
- [x] functions/src/routers/analytics.ts — 分析ルーター（exportData追加）
- [x] functions/src/routers/aiFirst.ts — AIファーストルーター
- [x] functions/src/routers/comparison.ts — プラン比較ルーター
- [x] functions/src/routers/incident.ts — インシデントルーター
- [x] functions/src/routers/testing.ts — テストルーター
- [x] functions/src/routers/system.ts — システムルーター
- [x] functions/src/webhooks/stripe.ts — Stripe Webhookハンドラー
- [x] functions/src/router.ts — AppRouterの組み立て・型エクスポート
- [x] functions/src/index.ts — Cloud Functionsエントリーポイント（東京リージョン）
- [x] firebase.json — Firebase設定ファイル
- [x] .firebaserc — Firebaseプロジェクト設定
- [x] client/src/lib/trpc.ts — AppRouterインポートをfunctions/src/routerに変更
- [x] client/src/main.tsx — tRPC URLをVITE_FUNCTIONS_URL環境変数から取得するように変更
- [x] TypeScript 0エラー確認（functions/）
- [ ] firebase login（Yoshiさんが手動実行）
- [ ] firebase functions:secrets:set で環境変数を設定
- [ ] firebase deploy --only functions でCloud Functionsをデプロイ
- [ ] VITE_FUNCTIONS_URL をデプロイ後のURLに設定（Manusシークレット）
- [ ] Stripe WebhookのURLをCloud FunctionsのURLに変更（Stripe Dashboard）
- [ ] 動作確認（ログイン・プラン一覧・注文フロー）

## Firebase Callable Functions ネイティブ化（2026-06-29）

- [ ] tRPC・Express・cors・superjson を functions/package.json から削除
- [ ] functions/src/trpc.ts, router.ts, context.ts を削除
- [ ] functions/src/routers/ 配下の全ルーターファイルを削除
- [ ] functions/src/index.ts を Callable Functions エントリーポイントに書き直し
- [ ] shared/callableSchemas.ts に Zod スキーマ・型定義を集約
- [ ] Callable Function: auth.upsertUser 実装
- [ ] Callable Function: plans.list / plans.recommend 実装
- [ ] Callable Function: orders.initCheckout（Stripe Checkout Session 作成）実装
- [ ] Callable Function: orders.topupCheckout 実装
- [ ] Callable Function: orders.list / orders.get / orders.hide 実装
- [ ] Callable Function: esim.getByOrderId / esim.syncData / esim.getTopupPlans 実装
- [ ] Callable Function: user.getProfile / user.updateProfile 実装
- [ ] Callable Function: contact.submit 実装
- [ ] Callable Function: notifications.markRead 実装
- [ ] Callable Function: admin 系（listPlans, createPlan, updatePlan, deletePlan, listOrders, listInquiries, updateInquiry, listAllowedEmails, addAllowedEmail, deleteAllowedEmail, revokeUserSessions）実装
- [ ] Callable Function: comparison 系（table, tableAll, setCell, createRow, updateRow, deleteRow, createColumn, updateColumn, deleteColumn）実装
- [ ] Callable Function: analytics 系（getSummary, getAiInsights, exportData）実装
- [ ] Callable Function: aiFirst 系（getReferrerStats, getRecommendStats）実装
- [ ] Callable Function: incident 系（getLogs, getOpen, resolve, getRetryJobs, getPendingCount, runRetryNow）実装
- [ ] Callable Function: exchangeRates.get 実装
- [ ] Firestore Trigger: orders/{orderId} onDocumentCreated → eSIM 発券（Bappy API）・メール送信
- [ ] Firestore Trigger: orders/{orderId} onDocumentUpdated（status: paid）→ eSIM 発券
- [ ] Stripe Webhook を独立した onRequest 関数として実装（スケーリング設定分離）
- [ ] Cloud Tasks によるeSIM再試行キューイング実装（esimRetryService.ts 置き換え）
- [ ] firestore.rules 定義（ユーザー本人のみ読み書き・admin ロールチェック）
- [ ] フロントエンド: tRPC 依存を全廃（@trpc/client, @trpc/react-query を削除）
- [ ] フロントエンド: Callable Functions 呼び出しヘルパー（client/src/lib/functions.ts）作成
- [ ] フロントエンド: Firestore 直接 Read（plans, comparison, exchangeRates, notifications）に切り替え
- [ ] フロントエンド: 全コンポーネントの trpc.* 呼び出しを Callable Functions / Firestore に置き換え
- [ ] TypeScript 0 エラー確認（functions/ + client/）
- [ ] チェックポイント保存

## tRPC完全廃止・残りCallable Functions実装（2026-06-29 継続）

### Callable Functions 実装（フロントが呼ぶが未実装の18関数）
- [x] comparison.ts: comparisonTable（公開）
- [x] comparison.ts: comparisonTableAll（admin）
- [x] comparison.ts: comparisonSetCell（admin）
- [x] comparison.ts: comparisonCreateRow（admin）
- [x] comparison.ts: comparisonUpdateRow（admin）
- [x] comparison.ts: comparisonDeleteRow（admin）
- [x] comparison.ts: comparisonCreateColumn（admin）
- [x] comparison.ts: comparisonUpdateColumn（admin）
- [x] comparison.ts: comparisonDeleteColumn（admin）
- [x] incident.ts: incidentGetOpen（admin）
- [x] incident.ts: incidentGetLogs（admin）
- [x] incident.ts: incidentGetRetryJobs（admin）
- [x] incident.ts: incidentGetPendingCount（admin）
- [x] incident.ts: incidentRunRetryNow（admin）
- [x] analytics.ts: analyticsGetSummary（admin・完全版に拡張）
- [x] analytics.ts: analyticsExportData（admin）
- [x] analytics.ts: analyticsGetAiInsights（admin）
- [x] aiFirst.ts: aiFirstGetReferrerStats（admin）
- [x] aiFirst.ts: aiFirstGetRecommendStats（admin）
- [x] callableSchemas.ts: CreateColumnInput/SetCellIninput等を可変カラムモデルに整合
- [x] index.ts に新規exportが反映されているか確認

### Stripe Webhook 簡素化（AP-06）
- [x] http/stripeWebhook.ts を「注文ステータス更新のみ」に簡素化し Trigger に委譲

### server/ 廃止（論理的廃止 — Manus WebDev互換を維持）
- [x] client が server/ を参照していないことを確認
- [x] server/_core/index.ts を Vite配信+最小限エンドポイントに縮小（tRPC/appRouter/createContext削除）
- [x] server/_core/context.ts・sdk.ts・trpc.ts・systemRouter.ts を削除（AP-01〜AP-03）
- [x] server/routers/ ディレクトリ全体を削除（AP-07）
- [x] server/adapters/ ディレクトリを削除
- [x] 旧tRPC依存テスト5ファイルを削除し、functions側に同等テスト3ファイル追加
- [x] TypeScript 0エラー確認（root tsc exit 0）
- [x] vitest pass 確認（root: 9ファイル73テスト / functions: 3ファイル10テスト）
- [x] チェックポイント保存

### Firestore直接アクセス移行（AP-04・AP-05・AP-09）
- [x] AP-04: PurchaseDrawer.tsx の userGetProfile Callable Function 呼び出しを useAuth().user（Firestore onSnapshot）に置き換え
- [x] AP-05: MyPage.tsx の notificationsList は onSnapshot 直接購読に移行済み。notifications.ts から notificationsList 関数を削除
- [x] AP-09: MyPage.tsx の notificationsMarkRead を Firestore updateDoc 直接呼び出しに移行。notifications.ts から notificationsMarkRead 関数を削除
- [x] AP-08: esim.ts の所有者確認コードに「Admin SDK は Security Rules 適用外のため意図的に実装」コメントを追記
- [x] callableSchemas.ts から MarkReadInput・notificationsMarkRead・notificationsList を削除
- [x] TypeScript 0エラー確認（root tsc exit 0 / functions tsc テストファイルの既存エラーのみ）
- [x] vitest pass 確認（root: 9ファイル73テスト / functions: 3ファイル10テスト）
- [x] 監査レポート（/home/ubuntu/firebase_antipattern_audit.md）に対応完了ステータスを追記
- [x] チェックポイント保存

### Custom Claims 管理者設定（isAdmin() 方式変更）
- [x] firestore.rules の isAdmin() を Firestore 参照 → Custom Claims 方式に変更
- [x] kazuyoshi.yamada@bonfire.co.jp に { admin: true } を設定
- [x] scripts/set-admin-claims.mjs を作成（今後の管理者追加用）

## Firebase Storage 一本化（Manus S3 完全排除）

- [x] Step 1: @aws-sdk/client-s3・@aws-sdk/s3-request-presigner を package.json から削除（実際には未使用だったため削除のみ）
- [x] Step 2: storage.rules を作成・整備（assets/ 公開・users/{userId}/** 本人のみ・qrcodes/ Admin SDK 書き込み・デフォルト拒否）
- [x] Step 3: QRコード非同期生成・Firebase Storage 保存を onOrderPaid.ts に実装（generateAndStoreQrCode）
- [x] Step 3: FsEsimLink 型に qrCodeUrl フィールドを追加
- [x] Step 3: qrStorage.test.ts を作成（5テスト全件 pass）
- [x] firebase.json に Storage Emulator (port 9199) 設定を追加
- [x] client/src/lib/firebase.ts に getFirebaseStorage() を追加
- [x] client/src/lib/assets.ts を作成（静的アセット URL 定数化）

## BaaS ネイティブ化（ラッパーAPI廃止・Security Rules強化）

- [x] 優先度A: firestore.rules の notifications ルールを hasOnly(['isRead', 'readAt']) に修正
- [x] 優先度B: orders・esim_links の Firestore Rules に所有者読み取りルールを追加
- [x] 優先度B: exchangeRatesGet Callable を廃止しフロントエンド直接参照に移行
- [x] 優先度B: plansList Callable を廃止しフロントエンド直接参照に移行
- [x] 優先度B: userGetProfile Callable を廃止しフロントエンド直接参照に移行
- [x] 優先度B: ordersList Callable を廃止し onSnapshot 直接購読に移行
- [x] 優先度B: ordersGet + esimGetByOrderId Callable を廃止し onSnapshot 直接購読に移行

## Admin Custom Claims 一本化（2026-06-30）

- [x] functions/src/callables/_helpers.ts: requireAdmin を Custom Claims 判定（token.admin === true）に変更
- [x] client/src/_core/hooks/useAuth.ts: getIdTokenResult() から isAdmin フラグを取得して公開
- [x] client/src/pages/AdminPage.tsx: user.role !== "admin" → !isAdmin に変更
- [x] TypeScript 0 エラー確認・tests 15件全パス・本番ビルド成功・チェックポイント保存（b7a5d889）

## ピュアBaaS直線モデル完全移行（設計書準拠）

### Step 1: firestore.rules 強化（スキーマバリデーション付き）
- [ ] users: role フィールドの書き込みを禁止、status バリデーション追加
- [ ] orders: ユーザーが status="pending" で create 可能、stripeSessionId/checkoutUrl は書き込み禁止
- [ ] esim_links: syncRequestedAt のみユーザーが update 可能
- [ ] contact_inquiries: 公開 create 許可（既存と同じ）
- [ ] firestore.rules をデプロイ

### Step 2: Reactive トリガー実装
- [ ] functions/src/triggers/onOrderCreated.ts: orders/{orderId} onCreate → Stripe Checkout Session 作成 → stripeSessionId/checkoutUrl を書き戻し
- [ ] functions/src/triggers/onEsimSyncRequested.ts: esim_links/{linkId} onUpdate（syncRequestedAt 変化時）→ Bappy API 同期 → dataUsed/dataRemaining/status を更新
- [ ] functions/src/index.ts に新トリガーを export 追加

### Step 3: フロントエンド認証リファクタリング
- [ ] useAuth.ts: Google ログイン成功後に Firestore /users/{uid} を直接 setDoc（merge: true）で書き込み
- [ ] authUpsertUser Callable Function の呼び出しを削除

### Step 4: チェックアウトフロー直結化
- [ ] PurchaseDrawer.tsx: ordersInitCheckout Callable を削除
- [ ] PurchaseDrawer.tsx: Firestore addDoc で /orders に status="pending" で直接書き込み
- [ ] PurchaseDrawer.tsx: onSnapshot で checkoutUrl を監視し、確定次第 window.open でリダイレクト
- [ ] ordersTopupCheckout も同様に Firestore 直結化（topup 用 pending 書き込み + onSnapshot）

### Step 5: その他 Callable → Firestore 直結化
- [ ] esimSyncData: esim_links/{id} に { syncRequestedAt: Date.now() } を直接 updateDoc
- [ ] contactSubmit: /contact_inquiries に addDoc で直接書き込み
- [ ] userUpdateProfile: /users/{uid} に updateDoc で直接書き込み
- [ ] ordersHide: /orders/{id} に updateDoc で直接書き込み（hidden: true）

### Step 6: レガシーコード削除
- [ ] client/src/lib/callable.ts を削除
- [ ] functions/src/callables/auth.ts を削除
- [ ] functions/src/callables/user.ts を削除
- [ ] functions/src/callables/orders.ts を削除
- [ ] functions/src/callables/esim.ts を削除
- [ ] functions/src/callables/contact.ts を削除
- [ ] shared/callableSchemas.ts を削除（admin/comparison/incident/analytics/aiFirst/plans/exchangeRates 等 admin 系は維持するか確認）
- [ ] functions/src/index.ts から削除した Callable の export を除去

### Step 7: テスト・ビルド・デプロイ
- [ ] TypeScript 0 エラー確認（root + functions）
- [ ] vitest pass 確認
- [ ] firebase deploy --only firestore,functions
- [ ] チェックポイント保存

## ピュアBaaS完全移行フェーズ2（2026-06-30）

- [ ] [DELETE] client/src/lib/callable.ts (注: Admin機能で使用中のため維持)
- [ ] [DELETE] shared/callableSchemas.ts (注: admin専用に縮小済み、完全削除は不要)
- [x] [DELETE] functions/src/callables/ 内の不要ファイル（auth.ts/plans.ts/orders.ts/esim.ts/user.ts/contact.ts 削除済み）
- [x] [DELETE] functions/src/triggers/onOrderPaid.ts
- [x] フロントエンドから @stripe/react-stripe-js, @stripe/stripe-js パッケージを削除
- [x] functions/src/triggers/onUserCreated.ts を追加（auth.user().onCreate → /users/{uid} 初期作成）
- [x] useAuth.ts から setDoc 書き込みを削除し onSnapshot 監視のみにシンプル化
- [x] firestore.rules の /orders create に allowed_emails チェックを追加（isInvited()関数実装）
- [x] PurchaseDrawer.tsx に permission-denied 時の招待制エラーメッセージを追加
- [x] functions/src/http/stripeWebhook.ts に Bappy API 直結eSIM発券処理を統合（onOrderPaid 廃止）
- [x] TypeScript 0エラー確認・テスト全パス（root: 73テスト, functions: 15テスト）
- [x] チェックポイント保存・Firebase デプロイ
