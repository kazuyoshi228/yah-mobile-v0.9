# テストカバレッジ資料（yah.mobile）

更新: 2026-07-09 ／ 実行: `npx vitest run --config vitest.client.config.ts`（client）／ `cd functions && npm test`（functions）／ `npx vitest run --config vitest.rules.config.ts`（rules・エミュレータ）
合計: **client 34 ・ functions 80 ・ rules 36 = 150 tests**（全green）。方針: 課金・返金・発行・セキュリティルールの**クリティカルパスを重点**、UIは主要導線のみ。

---

## 1. Firestore Rules（36・防御テスト）— `tests/firestore.rules.test.ts`
コレクション別に「本人のみ read / write 不可 / admin のみ / 型・値検証 / default deny」を検証。
対象: `users` `plans` `orders` `esim_links` `esim_activations` `contact_inquiries` `notifications` `allowed_emails` `analytics_events` `stripe_events` ほか。
→ **IDOR・権限昇格・不正フィールド書込を防止**（他人の注文/eSIMは読めない、クライアントから課金系は書けない）。

## 2. Functions（80）— 課金・発行・返金・監視の要
| ファイル | tests | 内容 |
|---|---|---|
| `webhooks.test.ts` | 5 | Stripe `checkout.completed`→注文paid→発行、受付/発行メール |
| `webhooks_esimaccess.test.ts` | 9 | 受信Webhook多層防御（トークン/IP/裏取り/冪等）、IN_USE→lastActiveAt記録 |
| `webhooks_bappy.test.ts` | 5 | 旧Bappy webhook（休眠・表示状態更新） |
| `esimRetryService.test.ts` | 5 | 発行失敗の自動リトライ→回復/最終失敗、通知・メール |
| `refund.test.ts` | 4 | `executeRefund`：冪等・未使用cancel(§8)・Lane A/Bキルスイッチ |
| `salesStopGuard.test.ts` | 4 | 販売停止ガード（provider down で購入ブロック） |
| `stripe.test.ts` | 4 | Checkout Session 生成・金額・メタデータ |
| `rateLimit.test.ts` | 4 | UID/IP レート制限（多重課金・洪水防止） |
| `callables.test.ts` | 6 | ordersInitCheckout/Topup・所有権(IDOR)・zod |
| `providers/esimaccess.test.ts` | 4 | order/query/topup/cancel 正規化・status写像・activated判定 |
| `providers/bappy.test.ts` | 4 | Bappy 正規化 |
| `db/*.test.ts`（core/orders/esimLinks） | 10 | リポジトリ層（doc変換・by-uuid・所有権フィルタ） |
| `_helpers.test.ts` | 11 | requireAuth・admin判定・zodError 等 |
| `adapters/notify.test.ts` / `esimaccess/auth.test.ts` | 5 | オーナー通知・署名 |

## 3. Client（34）— UI主要導線
| ファイル | 内容 |
|---|---|
| `esimStatus.test.ts`（15） | eSIM状態導出（Ready/Active/Need Top-up/Expired）・有効化判定・期限行（Install by/Expires・実データ相当ケース） |
| `PurchaseDrawer.test.tsx` / `steps/Step2Confirm` / `Step4Payment` | 購入ドロワーの遷移・同意・決済ステップ |
| `MyPage.test.tsx` | マイページ描画・注文一覧 |
| `EsimQr.test.tsx` | QR描画 |

---

## 4. 手動テスト（自動化していない領域）
- **実発注E2E**（実購入→発行→QR→接続→topup→有効化→返金）: 本番で実施済（2026-07-08、注文 `#la66cb…`）。
- **全言語QA**: [qa_launch_checklist.md](./qa_launch_checklist.md)（GA前に実施）。
- **メール実受信の言語確認**・**モバイル実機**の有効化/QR。

## 5. CI/実行メモ
- Node 22 必須。rules テストは Firestore エミュレータ（Java）。
- コミット前に `tsc --noEmit` ＋ 各 vitest を通す（CLAUDE.md）。
