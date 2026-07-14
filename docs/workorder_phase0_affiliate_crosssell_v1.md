# 作業指示書：アフィリエイト基盤・クロスセル・上振れ施策・magazine連携（Phase 0）

- 版: v1.0（2026-07-10）
- 作成経緯: 2026-07-10 のセッション（アフィリエイト仕様書v3.0の監査 → 財務モデル再構築 → 鯨BD/magazine戦略確定）の全決定事項を、**別セッションで即実装に着手できる粒度**に取りまとめたもの
- 対象読者: 実装を担当するAIセッション／開発者
- 🚨 本書は 2026-07-10 時点の実コード確認に基づく。**着手前に必ず該当ファイルの現状を再確認し、差異があれば報告してから進めること**（CLAUDE.md 運用ルール3）

---

## 0. 関連資料（必読）

| 資料 | 場所 | 内容 |
|---|---|---|
| Phase 0 実装設計図 | `docs/design_affiliate_phase0_minimal.md` | M1〜M3 の詳細設計（**承認待ち** — 実装前に Yoshi の承認が必要） |
| コンテンツ戦略 Blueprint v6 | `docs/blueprint_content_marketing_v6.md` | magazine のグルメ中心戦略・KPI・体制 |
| 42ヶ月財務モデル（v3.5） | Google Sheet: `docs.google.com/spreadsheets/d/15cetgoHN6VwbFpxFwmG5XQL8oO9Ae0QpnhOP173lT6U` | 全シナリオ・前提条件（青字=入力セル）・修正点メモ#1〜19 |
| 財務モデル（ローカル版・旧） | `~/Downloads/yah_mobile_affiliate_36months_v3.1_fixed.xlsx` | Google Sheet が正。ローカルは v3.1 で停止 |
| 元仕様書 | People's eSIM アフィリエイトプログラム設計仕様書 v3.0（Manus作成・ユーザー所持） | **数値矛盾あり（§2参照）**。ランク制・VAポータル等は Phase 0 では実装しない |
| CLAUDE.md | リポジトリ直下 | ブランチ/デプロイ/承認フローの遵守事項 |

---

## 1. 決定事項レジスター（このセッションで確定したこと）

実装・運用の前提。**変更には Yoshi の明示的な合意が必要。**

### 1-1. アフィリエイトプログラム
| # | 決定 | 補足 |
|---|---|---|
| D1 | ランク制度（5段階・猶予月・コミュニティブースト・各種ボーナス）は Phase 0 では実装しない | 500上限運用ではアクティブ最大約21人でゲーミフィケーションが機能しないため |
| D2 | コミッションはフラット。デフォルト20%・**創設メンバー（先着30〜50人）は25%固定** | `affiliates/{uid}.commissionRate` の個別値で実現（コード変更不要） |
| D3 | アウトリーチは月500コンタクト上限（AffiliateFinder Growth Plan の実クレジット上限に整合） | クレジット＝新規コンタクト発掘数。送信・フォローアップは無制限 |
| D4 | Phase 0 は Manager を置かない（Yoshi監督＋VA最大1名） | 月500コンタクト≒23通/営業日のため |
| D5 | 母集団（Tier0〜3計 6.7万〜15万）の範囲内で運用 | 500上限なら42ヶ月累計20,500件＝下限の31%で自動的に充足 |
| D6 | 源泉徴収は実装しない。税理士確認完了まで海外個人への支払い運用は保守的に | 仕様書の「台湾20%確定」は支払者側制度の誤認の可能性が高い。国内居住者への紹介料は原則源泉不要（要税理士確認） |
| D7 | 支払いは月次手動（Wise/国内振込）。コンバージョンは14日保留→確定 | CSV自動生成・Wise API は Phase 0 では作らない |
| D8 | 2次報酬（MLM構造）なし | v3.0 から継続 |

### 1-2. 獲得戦略
| # | 決定 | 補足 |
|---|---|---|
| D9 | 主軸は**鯨BD**（月100本級パートナーを42ヶ月で10人）。長い尻尾（ナノインフルエンサー量産）は補助 | 鯨10人＝長い尻尾の理論上限と同等の売上を1/85の人数で達成 |
| D10 | 鯨ポートフォリオ: 日本在住インフルエンサー3〜4人＋旅行準備ブロガー/YouTuber（居住地不問）4〜5人＋比較サイト・メディア1〜2 | 選定基準は居住地ではなく「出発直前層へのエバーグリーン検索流入を持つか」 |
| D11 | 鯨BDの運用: VAがパイプライン（リスト・ドラフト・フォローアップ・事務）、**クロージングとZoom商談・条件決定はYoshi専任**。interested返信でYoshiへエスカレーション | 最初の5〜10件はYoshi自身が当たってSOPを作ってからVAに渡す |
| D12 | AffiliateFinder.ai は最初 **Pro（$69/月・150クレジット）**で Yoshi が自分で触る。鯨リスト作成には競合逆引き機能を使う | Growth（$174）へは VA参加 or 多言語分離が必要になった時点で |
| D13 | コールドメールの送信ドメインは yah.mobi 本体と分離する | 本体のメール到達率（購入確認等）保護のため |
| D14 | 鯨への提示: 創設メンバー25%＋獲得一時金（スポンサード投稿等）¥10万/人想定。月額保証を要求されたら鯨シートL列に計上して再評価 | |

### 1-3. magazine / コンテンツ
| # | 決定 | 補足 |
|---|---|---|
| D15 | **グルメ一次情報中心**（月10本＝グルメ6:マネーページ2:季節2）。eSIM設定HowTo中心のv5戦略は放棄 | AI検索時代にHowToはゼロクリック化するため。詳細は Blueprint v6 |
| D16 | 福岡を旗艦クラスタとして先行（M3までに12本）→東京→大阪 | yah.homes クロスセルも福岡集中 |
| D17 | magazine 開始月は M1（編集者確保済み・器は稼働済み）。財務モデルは前提条件シート B48 で開始月を変更可能 | |
| D18 | **magazine は別 Firebase プロジェクトのまま維持**（統合しない） | 編集者アクセス分離・爆発半径・誤デプロイ防止。連携は §7 の3点のみ |
| D19 | マネーページは8本×4言語だけを最高品質で維持（完全ガイド/iPhone設定/Android設定/Airalo比較/容量シミュレーション/トラブル対処/トップアップ/FAQ30） | |

### 1-4. その他
| # | 決定 | 補足 |
|---|---|---|
| D20 | **購入ゲート（事前登録メールホワイトリスト制）は開放する** | Yoshi 決定済み。実装方式は M4 参照。以後「ハードル」として扱わない |
| D21 | 上振れ4施策を実装対象に含める: 友達紹介・まとめ買い導線・比較サイト（eSIMDB等）対応・トップアップ/リピーター | 本書 M5 参照 |
| D22 | 財務モデルの現在入力: 平均顧客単価¥3,000・粗利70%（Yoshi がシート上で変更したもの。実データは¥2,596/70.4%） | 実データに戻す場合は前提条件 B4/B5 を書き換えるだけ |

---

## 2. 実コード確認済み事項（2026-07-10 時点・着手前に再確認せよ）

| 事実 | 場所 |
|---|---|
| `notifications.isRead` が文字列/boolean 混在。functions は `"false"/"true"` 文字列で書き込み・クエリ、クライアントの既読処理は boolean `true` | `functions/src/db/notifications.ts:8,11,26,32,35,41` / `client/src/components/mypage/Notifications.tsx:31,71,84,92` / `shared/types.ts:182`。現時点で機能上の実害はほぼないが型統一する（M1） |
| Stripe Webhook が `status:"paid"` 更新→受付メール→ `fulfillEsim()`（発行→fulfilled→発行メール）まで**同期実行** | `functions/src/webhooks.ts` `handleCheckoutCompleted`（181〜259行、258行で `await fulfillEsim(order)`）。60sタイムアウトリスク＝AP-06（M2） |
| 冪等ガード・リトライ網は既存: `getEsimLinkByOrderId` チェック、`pending_retry`→`esimRetryJob`、`hungOrderMonitor` | `webhooks.ts:267-270` / `functions/src/esimRetryService.ts` / `functions/src/scheduled.ts:25,50` |
| 注文作成は callable `ordersInitCheckout` 一本。orders への直接書き込みはルールで禁止 | `functions/src/callables/orders.ts:137-156`（作成フィールド一覧）、`firestore.rules:87-`（update は hiddenByUser/updatedAt のみ） |
| checkout の入力スキーマ | `shared/schemas.ts:53` `OrdersInitCheckoutInput` |
| クライアントの購入フック | `client/src/components/app/purchase-drawer/usePurchaseCheckout.ts`（payload 28-36行・送信56-64行） |
| **購入は事前登録制**: `requireAuth` がメールホワイトリスト検証（orders.ts:107 コメント）。未登録は permission-denied → `allowed_emails` 照合のエラーUI | `usePurchaseCheckout.ts:74-91`。開放対象（M4） |
| ルーティングは wouter。`/` → `/app` に Redirect（**クエリが落ちる**） | `client/src/App.tsx:52-68`。ref捕捉はルーティング前に `window.location.search` から行う必要あり |
| llms.txt は動的生成実装済み（実勢プラン価格＋Airalo価格差） | `functions/src/llmsTxt.ts` `generateLlmsTxt()`・`AIRALO_PRICES` |
| eSIM利用イベント型に `data_threshold_80` / `data_depleted` あり（esimaccess webhook 由来） | `shared/types.ts:298`。トップアップ促進メールの起点候補（M5-e）。**通知メールが既送か要確認**: `functions/src/webhooks_esimaccess.ts` |
| 返金は `charge.refunded` が真実源。`status:"refunded"` へ | `webhooks.ts:125-155` |
| order status 一覧 | `shared/types.ts:90`: pending / paid / provisioning / pending_retry / fulfilled / failed / refunded / cancelled（**"completed" は存在しない**） |
| ビルド/環境 | Node22・pnpm（`functions/` のみ npm）・型チェック `npx tsc --noEmit -p tsconfig.json`・テスト `npx vitest run --config vitest.client.config.ts` / rules config / `functions` は `npm test` |

---

## 3. マイルストーン全体像と依存関係

```
M1 isRead統一 ──┐（独立・いつでも可）
M2 AP-06分離 ──┼──→ M3 アフィリエイト最小基盤 ──→ M5-b 友達紹介（M3の仕組みを流用）
M4 購入ゲート開放 ──┘        │
                              ├──→ M5-a まとめ買い / M5-c 購入完了ページ改修
M6 公開価格エンドポイント ────┼──→ M5-d 比較サイト対応（フィード）
                              └──→ M7 計測（GA4クロスドメイン・UTM規約）
M5-e トップアップ/リピーター（M4後いつでも）
```

- **M1〜M3 は `docs/design_affiliate_phase0_minimal.md` に詳細設計済み（そちらが正）。本書は差分と追加マイルストーン（M4〜M7）を定義する。**
- 🚨 CLAUDE.md フロー: 各マイルストーンとも、実装前に設計図（M1〜M3は既存設計図、M4〜M7は本書を元にした簡潔な設計図）の**承認**を得ること。`functions/src`・`firestore.rules` の変更、デプロイは必ず Yoshi の明示指示。
- コミットは `dev` ブランチ・マイルストーン単位・日本語プレフィックス（feat/fix/perf）+ `Co-Authored-By: Claude`。

---

## 4. M1〜M3（既存設計図の要点＋本セッションでの追加決定）

詳細は `docs/design_affiliate_phase0_minimal.md`。ここでは要点と、設計図作成後に決まった差分のみ記す。

### M1: notifications.isRead の boolean 統一
- 移行期間クエリ `where("isRead","in",[false,"false"])` → 本番データ移行（実行前に読み取り専用で件数確認・0件なら実行しない）→ 後続で `== false` に簡素化。
- デプロイ順: コード先行 → 移行スクリプト（scratchpad 置き・コミットしない）。

### M2: AP-06 Stripe Webhook 責務分離
- `fulfillEsim` を `functions/src/fulfillment.ts` へ抽出（ロジック変更なし）→ `triggers.ts` に `onOrderPaid`（`onDocumentUpdated("orders/{orderId}")`、before≠paid && after==paid）→ webhook は paid 更新＋受付メールまで。
- 既存安全網（冪等ガード・esimRetryJob・hungOrderMonitor）は無変更。M2 単独でコミットし、本番で数日観察してから M3 へ進むことを推奨。

### M3: アフィリエイト最小基盤
- `?ref=CODE` → localStorage 30日（last-click。`/`→`/app` Redirect より前に `window.location.search` から捕捉）→ `ordersInitCheckout` に `affiliateCode` 同送 → サーバー検証（実在・active・自己購入 `affiliate.uid !== 購入者uid` 排除。無効は null 化して**購入は止めない**）→ orders に `affiliateCode`/`affiliateId` 保存 → `fulfilled` 遷移トリガーで `affiliate_conversions/{orderId}`（docID=orderId で冪等）作成 → 日次ジョブで14日経過 pending→confirmed → `refunded` 遷移で cancel（paid 済みなら flagged）。
- コレクション: `affiliates/{uid}`（code, displayName, email, commissionRate, status, createdAt, updatedAt）/ `affiliate_conversions/{orderId}`（affiliateId, affiliateCode, orderId, saleAmountJpy, commissionRate凍結, commissionJpy, status: pending|confirmed|cancelled|paid|flagged, timestamps）。**default DB・Named Database 不使用・サブドメイン不使用**（ルートは `/affiliate`）。
- ルール: affiliates は本人 read / admin write。conversions は本人 read / admin は status,paidAt,updatedAt のみ update / create・delete は Functions のみ。
- 管理: `/admin/affiliates` タブ（アフィリエイター作成=code/名前/email/uid/rate、conversion の paid マーク一括）。
- 【本セッション追加決定】(a) commissionRate は D2 のとおり 20% / 創設25% を admin が個別設定。(b) **codeType の概念を追加**: `affiliates/{uid}.type: "affiliate" | "referral" | "partner"` を持たせ、M5-b の友達紹介・鯨パートナーを同一基盤で扱う（集計時に区別するため）。(c) トップアップ注文（`orderType:"topup"`）へのコミッションは **Phase 0 では付けない**（初回購入のみ）。

### 検証（M1〜M3共通）
- `tsc --noEmit`＋`vitest`（client / rules）＋`functions` の `npm test`。トリガーは Firestore エミュレータ（Java `~/jdk21`）。UI はプレビューで `?ref` → localStorage → payload 送信を Network 確認。**本番共有バックエンドのため購入テストはしない**。

---

## 5. M4: 購入ゲート開放（D20）

**目的**: 事前登録制（`allowed_emails`）を撤廃し、Google ログインだけで誰でも購入できる状態にする。全チャネル（アフィリ・magazine・比較サイト・広告）の CVR 成立の前提。

**実装方針（要現状確認→簡潔な設計図→承認）**:
1. `functions/src/_helpers.ts` の `requireAuth`（または同等箇所）のホワイトリスト検証を特定する。orders.ts:107 のコメント「ログイン必須 + メールホワイトリスト検証済み」が手掛かり。
2. 開放方式は次のいずれか（推奨は a）:
   - (a) checkout 系 callable ではホワイトリスト検証をスキップ（認証＋App Check＋レートリミットは維持）
   - (b) Auth `onUserCreated` トリガーで `allowed_emails` へ自動追加（既存構造を温存したい場合）
3. `usePurchaseCheckout.ts:74-91` の permission-denied → 事前登録エラーUI 分岐を削除/簡素化。i18n 文言（`drawer.emailNotAllowed`）の扱いも整理。
4. 影響確認: chat/contact 側で `allowed_emails` を参照する箇所があれば挙動を変えない（購入だけ開放）。`onAllowedEmailWritten` トリガー（triggers.ts:185）の役割を確認。
5. リスク対策: 開放によりカード試行攻撃の的になりやすくなる。既存の `enforceRateLimit`（uid単位 10回/時, orders.ts:110）と App Check を維持し、必要なら IP 単位の制限追加を提案。

**受け入れ基準**: 新規 Google アカウントでログイン→事前登録なしで Stripe Checkout へ遷移できる（dev チャンネルで UI 確認。決済は本番データのため実行しない）。

---

## 6. M5: クロスセル・上振れ施策パック（D21）

財務モデル（統合シナリオ M42=月1,540本・+約200万円/月）は鯨＋magazine のみの数字であり、以下は**すべてモデル外の上振れ**。優先度順に記す。

### M5-a: まとめ買い導線（同行者分の追加購入）★最優先・最小工数
- 根拠: eSIM はグループ旅行で全員が同時に必要になる商材。1獲得あたり販売本数を増やし、実効CPAを構造的に下げる。
- **Phase 0 実装（軽量版）**: 購入完了ページ（Stripe success リダイレクト先）に「同行者の分も購入する」ボタン → 同一プラン選択済みの purchase フローへ 1タップで再遷移（`?plan=<bappyPlanId>` 等のプリフィル）。**複数枚同時決済（quantity>1）は実装しない** — 現行の注文モデルが 1注文=1eSIM（`esimLinkUuid` 単数, fulfillEsim も単発行）のため、フルフィルメント改修が必要になる。将来課題として明記。
- 計測: ボタンに `?utm_source=purchase_complete&utm_medium=companion` を付与。
- 対象ファイル: 購入完了ページ（`client/src/pages` 配下の success 画面を特定）、必要なら PurchaseDrawer のプリフィル対応。

### M5-b: 友達紹介プログラム（M3 基盤の流用）
- 仕組み: 購入完了ページ＋マイページに「友達に紹介」ブロック。ユーザーに `referral` タイプの code を発行（`affiliates/{uid}` に `type:"referral"` で自動作成、または初回タップ時に callable で発行）。シェアリンク `yah.mobi/?ref=CODE`。
- インセンティブ設計（Phase 0）: **被紹介者側のみ 10%OFF**（Stripe Promotion Code を ref とセットで自動適用）。紹介者への金銭リワードは Phase 0 では**実装しない**（支払いインフラが重いため）。紹介実績は conversions に記録されるので、リワード付与は実績を見て Phase 1 で判断。
- 注意: 割引原資は粗利から出る（10%OFF → 粗利率約70%→60%）。referral 経由の売上比率をシナリオ比較で月次確認。
- シェアボタン: LINE / WhatsApp / KakaoTalk / コピー の4種（空白地帯レポートの「LINEシェアボタン実装30分・¥0」を包含）。
- Stripe: `allow_promotion_codes` は既に利用中（webhooks.ts の割引検証ロジックが存在、200-209行参照）。referral 用 Promotion Code の自動作成は Stripe API で行い、コード命名規約 `REF-<code>` とする。

### M5-c: 購入完了ページの総合改修（クロスセルの中枢）
購入完了ページを「次のアクションのハブ」にする。上から順に:
1. eSIM 受け取り案内（既存）
2. **まとめ買いボタン**（M5-a）
3. **友達紹介ブロック**（M5-b）
4. **yah.homes バナー**（福岡宿泊クロスセル。UTM: `utm_source=yahmobi&utm_medium=purchase_complete`）
5. magazine 回遊リンク（「旅行前に読む: 福岡グルメガイド」等 2〜3本）
- 文言は購入者の言語（`order.language`）に追従。

### M5-d: 比較サイト対応（eSIMDB 等）
- 根拠: eSIMDB はアフィリエイト（成果報酬）型の掲載で、「今からeSIMを買う人」だけが来る最高濃度チャネル。競合全社掲載済み＝テーブルステークス。
- 実装: **公開プランフィード**を用意（M6 のエンドポイントと共用可）: `GET /plansFeed`（HTTPS function・認証不要・Cache-Control 短め）→ JSON: `[{ planId, name, dataGb, validityDays, priceJpy, topupAvailable, url }]`。`getActivePlans()` 流用。eSIMDB 指定フォーマットがあれば申請後に合わせて調整。
- 運用（Yoshi タスク）: eSIMDB へ掲載申請。コミッションは CPS 10〜15% を提示（実効CPA ¥260〜390 相当）。
- 併せて検討リスト（Yoshi判断・実装不要）: ShopBack（TW/KR/TH/HK/SG・CPS）、Klook/KKday 出品（手数料20〜30%・フルフィルメント統合が重く Phase 1 以降）、CJ Affiliate/Rakuten Advertising（初期費用・手数料・審査期間の見積もり取得が先）。

### M5-e: トップアップ・リピーター収益
- 現状確認から: `data_threshold_80` / `data_depleted` イベント（shared/types.ts:298）の受信時処理を `webhooks_esimaccess.ts` / `triggers.ts` で確認。ユーザー通知（メール/アプリ内）が未実装なら実装する。
- 実装: 残量80%到達時に「トップアップのご案内」メール（`order.language` 対応・トップアップページへの直リンク `mypage/topup/:esimLinkId`）。`marketingConsented` を尊重すること（同意なしユーザーへは取引通知の範囲に留める文面設計）。
- リピーター: 発行から N ヶ月後（例: 6ヶ月）の「また日本へ行くなら」メール＋リピーター向け Promotion Code は **Phase 1 検討**（Phase 0 では設計メモのみ）。
- アフィリエイトとの関係: トップアップにコミッションは付けない（§4 M3 (c)）。

### M5-f: 直販の底上げ（モデル外・実装済み資産の活用）
- llms.txt（実装済み）の内容を M3 実装後に見直し: 紹介プログラム・magazine の存在を追記し AI 経由の言及面を増やす。
- ブランド指名検索の受け皿として、yah.mobi トップの多言語メタ・OGP を確認（必要なら改善提案のみ）。

---

## 7. M6: magazine 連携（D18 — 別プロジェクト前提・本体側の作業のみ）

magazine 本体の実装は**別セッション・別プロジェクト**。本体（yah-mobile-v1-3ed24）側で行うのは次の3点だけ:

1. **公開価格エンドポイント**: M5-d の `plansFeed` と共用。magazine のマネーページがこれを fetch して常に実勢価格を表示する（価格改定の即日反映＝AI引用の信頼性）。CORS で `https://magazine.yah.mobi` を許可。
2. **ref/UTM 規約の遵守**（実装は M3 に含まれる）: magazine からの流入 `?utm_source=magazine&utm_medium=article&utm_campaign=<slug>`、鯨・アフィリエイターは `?ref=CODE`。両方が付いた場合 ref を優先。
3. **GA4 クロスドメイン計測**: 同一 GA4 プロパティに yah.mobi / magazine.yah.mobi の2ストリーム＋クロスドメイン設定。記事単位の実CVR計測（Blueprint v6 §4・KPI の生命線）。GA4 管理画面設定が主で、コード側は gtag の設定確認のみ。

magazine 側セッションへの引き継ぎ事項（参考）: Blueprint v6 参照・7ブロックテンプレート・一次情報チェックリスト・Schema/llms.txt 自動生成・上記 plansFeed の URL とレスポンス仕様。

---

## 8. 計測・KPI・フィードバックループ

- **UTM 規約**（全施策共通）: `utm_source`（magazine / purchase_complete / esimdb / partner名）× `utm_medium`（article / companion / referral / cps）× `utm_campaign`（記事slug・施策名）。ref= はアフィリ/紹介/鯨の成果紐付け専用。
- **実測CVRのモデル反映**: GA4＋conversions 実績から「記事→購入」「ref経由訪問→購入」の実CVRが出たら、Google Sheet 前提条件の該当セル（B46=magazine CVR、通算CVR等）を実測値に置換する。**シートが唯一の計画台帳**（修正点メモに変更履歴を追記する運用）。
- **Go/No-Go（M6末）**: シートの「Go-NoGo（M6判断）」に実績を入力。判断指標=①累計登録者数（計画比80%以上）②通算CVR実測 ③販売数/アクティブ実測（最大の不確実性。鯨は「1人あたり実売本数」）④プログラム貢献利益プラス ⑤Phase 0 累計投資が予算内。
- **鯨の成約判断材料**: サイトCVR実測（EPC = CVR×単価×25%）を最初の商談前に用意すること（M4開放後の直販・magazine 流入で取得）。

---

## 9. 運用タスク（実装対象外・Yoshi/VA向けチェックリスト）

| 時期 | タスク | 担当 |
|---|---|---|
| Week 1 | AffiliateFinder Pro 登録 → 競合逆引きで鯨候補50件リスト（エバーグリーン検索流入の有無でタグ付け。在住/非在住も記録） | Yoshi |
| Week 2 | 手動アウトリーチ5〜10通（別ドメインから・創設25%訴求）→ 返信率・勝ち文面を記録 → SOP草稿 | Yoshi |
| Week 2〜 | 編集者と Blueprint v6 読み合わせ → 福岡グルメ4本の企画確定 → 週次リズム開始（月曜企画/金曜公開） | Yoshi＋編集者 |
| M1中 | アフィリエイト規約（コミッション条件・支払条件・禁止事項）の簡易版作成 → `/affiliate` に掲載 | Yoshi（法務は電気通信事業法相談に論点追加を推奨） |
| M1中 | 非居住者コミッション支払いの税務を税理士確認（国内居住者への紹介料の源泉要否も併せて） | Yoshi |
| M2〜 | VA 1名採用（OnlineJobs.ph 等）→ SOP引き継ぎ（鯨パイプライン＋500コンタクト運用） | Yoshi |
| 随時 | eSIMDB 掲載申請 / ShopBack・CJ/Rakuten の費用見積もり取得 | Yoshi |
| 月次 | Wise/振込で確定コミッション支払い → admin で paid マーク。主要20クエリのAI引用チェック（編集者） | Yoshi／編集者 |

---

## 10. スコープ外（作らないもの・明示）

ランク制度／猶予月／コミュニティブースト／各種ボーナス（昇格・マイルストーン・MVP等）／VA専用ポータル・VAランク・給与計算／Named Database／affiliate.yah.mobi サブドメイン／アフィリエイター自己登録フロー（管理者発行のみ）／支払いCSV自動生成・Wise API／多言語アフィリエイトダッシュボード／複数枚同時決済（quantity>1）／紹介者への金銭リワード／トップアップへのコミッション／Klook・KKday 統合／Google Ads。
これらは実績（例: 月30本以上売る人が3人、referral 比率、Go判断）を見て Phase 1 以降に個別設計する。

---

## 11. 実装順序の推奨と目安工数

| 順 | マイルストーン | 目安 | 備考 |
|---|---|---|---|
| 1 | M1 isRead統一 | 0.5日 | 独立。移行スクリプト含む |
| 2 | M2 AP-06分離 | 1日＋観察数日 | 単独コミット・本番観察後に次へ |
| 3 | M4 ゲート開放 | 0.5日 | M3 より先でも可（直販CVR実測を早く取るため先行推奨） |
| 4 | M3 アフィリ基盤 | 2〜3日 | codeType 拡張込み |
| 5 | M6 plansFeed＋GA4 | 0.5日 | magazine 側セッションのブロッカー解除を優先 |
| 6 | M5-c 購入完了ページ改修（a・b 内包） | 1〜2日 | 友達紹介は M3 完了が前提 |
| 7 | M5-e トップアップ通知 | 0.5〜1日 | 現状確認の結果次第 |

各マイルストーン完了ごとに: 型チェック＋テスト → プレビュー確認 → `dev` コミット → （指示があれば）dev チャンネルデプロイ。**本番デプロイは全て Yoshi の明示指示**。

---

## 12. 財務モデルとの対応表（実装が数字のどこに効くか)

| 実装 | シート上の対応 | 上振れの性質 |
|---|---|---|
| M3＋鯨BD運用 | 鯨シナリオ（M42: 1,000本・+112万/月） | 計画の主軸 |
| magazine制作（別セッション） | magazineシナリオ（M42: 540本・+90万/月） | 計画の複利エンジン |
| M4 ゲート開放 | 全シナリオの CVR 前提の成立条件 | 前提 |
| M5-a まとめ買い | モデル外。実効「本/獲得」を押し上げ | 上振れ |
| M5-b 友達紹介 | モデル外。referral 比率次第 | 上振れ（口コミ係数） |
| M5-d 比較サイト | モデル外。CPS型でCPA固定 | 上振れ |
| M5-e トップアップ | モデル外。LTV積み増し | 上振れ |
| 直販（llms.txt・ブランド） | モデル外 | 上振れ |

統合シナリオ（鯨＋magazine のみ）で M42=月1,540本・月次+約200万円・累計黒字化 M14。M5群と直販が乗れば「月100万円営業利益」ライン（チャネル損益ベースで M17前後）はさらに前倒しされる。

---

*本書は 2026-07-10 のセッションの全決定を反映した v1.0。実装セッションは、着手時に §2 の実コード確認を再実行し、差異があれば Yoshi に報告のうえ設計図承認を経て進めること。*
