# 設計図：購入者に eSIM が「見えない」障害の修正（P0）

対象ブランチ: `dev` ／ 作成: 2026-07-19 ／ ステータス: **設計（要承認→実装）**

## インシデント要約（2026-07-19 01:10 購入・order 7q0bPUzwkkd9KRnXbHKF）

**発行自体は成功**（eSIMAccess・01:13 に QR/ICCID/LPA 完備の esim_link 作成・GA4 purchase 送信済み・admin 画面でも FULFILLED）。しかし購入者（kazuyoshi228@gmail.com・**admin claim なしの一般ユーザー**）には次の3経路すべてで届かなかった：

1. **購入直後の QR 画面（Step6）**: esim_links を `where("orderId"==...)` のみで購読（`PurchaseDrawer.tsx:110`）。Firestore ルールは「クエリが userId==自分 を保証する」ことを要求するため **permission-denied**。
2. **注文詳細ページ**: 同じく `orderId` のみのクエリ（`OrderDetailPage.tsx:54`）→ permission-denied。しかも `onSnapshot` に**エラーハンドラが無く** `esimLoading` が永遠に true → **無限スピナー**（報告された症状そのもの）。
3. **メール**: 01:13 の purchase-received / eSIM-ready の両方が Gmail SMTP relay の **421**（一時スロットリング）で失敗。fulfillEsim はメール失敗を best-effort で握りつぶす設計のため注文は fulfilled のまま。01:19 の問い合わせ自動返信も 421（3連続）。

### なぜ今まで気づかなかったか
過去の購入テストはすべて **admin claim 付きアカウント**（bwov753W の所有者 = kazuyoshi.yamada@bonfire.co.jp, admin=true を確認済み）で実施しており、ルールの `isAdmin()` 分岐で通ってしまっていた。**今回が初の非 admin 実購入**。

### 付随して見つかった表示バグ
- 買い手のマイページ最上位に 7/6 の未決済 pending（¥980）が「**Invalid Date**」表示で居座り、新しい fulfilled（¥550）より上に出る。原因は旧注文の `createdAt` が **Timestamp 型**（現行は number）で、(a) `new Date(Timestamp)` が Invalid Date、(b) Firestore の型順序で Timestamp > number となり降順で常に最上位、の2点。

## 変更内容

### A. クライアント（hosting）— P0
1. `PurchaseDrawer.tsx:110` / `OrderDetailPage.tsx:54` の esim_links クエリに **`where("userId","==",uid)` を追加**（ルールが証明可能な形に。rules 変更は不要）。
2. 両ファイル＋ `useMyPageData.ts` の全 `onSnapshot` に**エラーハンドラを追加**：エラー時に loading を解除し console.error（無限スピナーの根絶）。
3. `createdAt` の Timestamp/number 両対応：ミリ秒に正規化するヘルパーを `useMyPageData` に置き、**クライアント側で降順ソート**（Firestore の型順序に依存しない）。`OrderList` の日付表示も正規化値で（Invalid Date 解消・fulfilled が正しく最上位に）。

### B. functions（別途デプロイ）— P1
4. `mailer.sendEmail` に**一時エラー（421等）の再試行**（2回・2s/8s バックオフ）。恒久的な取りこぼし対策はスコープ外（今後の課題として明記）。

### C. 回帰テスト
5. `tests/firestore.rules.test.ts` に追加：esim_links の list を「orderId のみ」→ **拒否**、「userId==自分 + orderId」→ **許可**（今回のバグをルールテストとして固定化）。

## 影響範囲・リスク
- ルール・スキーマ変更なし。クライアントは自分のデータへのクエリ形を直すだけで、admin の挙動も不変。
- メール再試行は 421 の一時障害に有効。送信不能が続く場合は依然 best-effort（注文は fulfilled、QR はマイページで取得可能になるのが本修正の眼目）。

## 検証計画
1. tsc / eslint / クライアントテスト／functions build+test。
2. Rules テスト（新規2件を含む）をエミュレータで実行。
3. Playwright（実ブラウザ）で /mypage・注文詳細のスピナー解消をコード上の該当パスで確認（非 admin 実ログインは不可のため、クエリ形はルールテストで担保）。
4. デプロイ後、購入者アカウントでマイページ→注文詳細→QR 表示をユーザーが実地確認。

## 応急対応（実装を待たない）
- 発行済み QR は取得済み：`https://p.qrsim.net/4215d647856743c895aa43d3dd2c90ba.png`（iOS: esimsetup.apple.com のワンタップURL も有り）。購入者へ直接案内可能。
