# MANUSへの依頼事項（yah.mobile v4 プロジェクト）

MANUSさん、Antigravityエージェントにていくつかの修正が追加で完了しました。
Gitから最新のコードを取得し、デプロイと動作確認をお願いします。

## 今回のアップデート内容（追加分）
1. **Stripeクーポンの有効化**
   - 決済画面（Checkout Session）にて、プロモーションコードの入力欄を表示するためのオプション（`allow_promotion_codes: true`）を追加しました。

※前回の「比較表の名称変更（competitorPlans）」や「Auth/Stripeのバグ修正」も含まれています。

## タスク: デプロイの実行

プロジェクトディレクトリ（`/Users/kazuyoshi228/Documents/yah-mobile-v4`）にて、以下のコマンドを実行してください。

```bash
# 1. 最新のコードを取得
git pull --rebase

# 2. 念のためビルドを実行
pnpm install
pnpm run build

# 3. Firestoreルール、Functions、Hosting のデプロイ
firebase deploy --only firestore:rules,functions,hosting
```

## タスク: 動作確認
デプロイが完了したら、以下の確認をお願いします。

1. **購入フローとクーポンの確認**:
   - `http://localhost:5173/app` にアクセスし、プランを選択して購入ボタンから Drawer を開く。
   - Stripe の Checkout 画面まで進み、**「プロモーションコードを追加」という入力欄が表示されていること** を確認する。
   - （可能であれば `TEST1` というコードを入力し、割引が適用されるか確認する）

以上です。すべて完了したらユーザーに報告をお願いします！
