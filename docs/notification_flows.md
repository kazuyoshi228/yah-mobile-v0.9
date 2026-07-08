# ユーザー通知フロー（eSIM発行）

旧 `/admin` Communication タブ（2026-07-08 のリファクタ P1-3 で削除）に表示していた設計情報の退避。
実装状況は削除時点のもの。実コードと差異がある場合は実コードを優先。

## 通知フロー（4段階）

| # | タイミング | トリガー | 件名 | チャネル |
|---|---|---|---|---|
| 1 | 購入直後 | Stripe `checkout.session.completed` | 【yah.mobile】eSIMの準備を開始しました | in-app / email（fulfilled後） |
| 2 | リトライ中 | 1回目リトライ失敗後（約5分後） | 【yah.mobile】eSIMの発行に少し時間がかかっています | in-app / email（`handleProvisioningFailure`） |
| 3 | 最終失敗 | 3回リトライ全て失敗後 | 【yah.mobile】eSIM発行に問題が発生しました | in-app / email / **owner通知** / omax（`OMAX_TECH_EMAIL` 設定後）※現在は最終失敗→**自動返金（Lane A）**も実行 |
| 4 | 復旧成功 | リトライ成功時 | 【yah.mobile】eSIMの発行が完了しました | in-app / email |

### 本文（抜粋）
1. ご購入ありがとうございます。eSIMの発行処理を開始しました。通常数分以内にマイページでご確認いただけます。
2. eSIMの発行処理に通常より時間がかかっています。引き続き自動で処理中です。完了次第お知らせします。
3. eSIMの発行に問題が発生しました。サポートチームが確認中です。ご不便をおかけして申し訳ございません。返金対応も可能です。
4. お待たせしました。eSIMの発行が完了しました。マイページからQRコードをご確認いただき、設定を行ってください。

## メール送信設定
- 送信方法: Gmail（GMAIL_USER/GMAIL_PASS・nodemailer）＋オーナー通知は Forge/Slack フォールバック
- ユーザーメール取得: `getUserById(userId)` → `users.email`
- 管理者メール: OWNER_EMAIL（Secret Manager）
- 外部メールサービス: なし（Resend等は不使用）
- OMAX通知: `OMAX_TECH_EMAIL` は未設定のまま（Bappy休眠化により優先度低下）

## 実装ファイル
- `functions/src/esimRetryService.ts` — リトライ中・最終失敗・復旧成功のユーザーメール
- `functions/src/webhooks.ts` — 購入直後（Stripe Webhook fulfilled）のメール
- `functions/src/mailer.ts` — メール送信ヘルパー＋テンプレート
- `functions/src/adapters/notify.ts` — notifyOwner（Forge/Slack/メール S9）

関連: 返金完了メール・5言語分岐は [spec_refund.md](./spec_refund.md)。eSIMAccess の残量/期限アラートは `webhooks_esimaccess.ts`（DATA_USAGE/VALIDITY_USAGE）。
