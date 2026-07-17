# 設計図：`/promotions` の Firestore ルールを admin 限定に絞る

対象ブランチ: `dev` ／ 作成: 2026-07-17 ／ ステータス: **設計（要承認→実装）**

## 背景

- 監視中に「**匿名認証が有効＝誰でも認証セッションを作れる**」ことに気づき、`/promotions` が `allow read: if isAuthenticated();`（条件なし）で**全認証ユーザーに読める**ことを発見。
- 当初「匿名を無効化」を提案したが、**これは誤り**だった：**chat（`chat.yah.mobi`）が同一Firebaseプロジェクト（`yah-mobile-v1-3ed24`）を共有し、訪問者全員を `signInAnonymously` で自動サインインさせている**（`yah-chat-webdev/client/src/hooks/useFirebaseAuth.ts:100`）。無効化により chat が一時停止した（再有効化で復旧済み）。
- → **匿名は正当な用途があるので消さない。穴はルール側で塞ぐ**のが正解。

## 調査で確定した事実（実コード・本番データ）

- `promotions` の利用実績は**ゼロ**：client 0件／functions は `db/core.ts:50` に `collections.promotions` の定義のみで**実使用0件**／admin UI にタブ無し。
- **本番 Firestore の `promotions` は 0 ドキュメント**（空）。
- **クーポンは Stripe のネイティブ機能で実装済み**（`functions/src/stripe.ts:106` `allow_promotion_codes: true`、`webhooks.ts:202` で割引前 `amount_subtotal` を検証）。Firestore の `promotions` は**採用されなかった旧設計の残骸**。

→ 現時点の実害はゼロ。ただし**将来 promo を投入した瞬間に、匿名を含む全認証ユーザーがコード・割引率を列挙できる**潜在穴。

## 変更内容（1箇所）

`firestore.rules`:
```diff
     match /promotions/{promoId} {
-      // ユーザーは存在確認や内容の読み取りが可能
-      allow read: if isAuthenticated();
+      // 誰も読まない（クーポンは Stripe の allow_promotion_codes で処理）。
+      // 匿名(chatが自動サインイン)を含む全認証ユーザーに晒さないため admin 限定。
+      allow read: if isAdmin();
       allow write: if isAdmin();
     }
```

## 影響範囲・リスク

- **機能影響ゼロ**：読んでいる箇所が存在しない（client/functions/admin すべて0件）＋本番データも0件。
- 将来クーポンを Firestore で持つ場合も、**列挙されない**（admin＋Admin SDK のみ）。クライアントに検証が必要になったら callable 経由（コードを送って可否だけ返す）にする。
- **匿名認証は温存** → chat は影響なし。

## 代替案

- **ルールごと削除（default deny）**：より厳格だが、admin 画面から将来触る余地を残すため `isAdmin()` を採用。
- **`request.auth.token.email != null` で匿名だけ除外**：一般Googleユーザーには依然全列挙を許すため不採用。

## 検証計画

1. `npx vitest run --config vitest.rules.config.ts`（エミュレータ）に**回帰テストを追加**：
   - 匿名ユーザー → `/promotions` read **拒否**
   - 一般ログインユーザー → read **拒否**
   - admin → read **許可**
2. 既存 Rules テスト一式が通ること（他コレクションへの巻き込み無し）。
3. デプロイ：`firebase deploy --only firestore:rules` — **ユーザーの明示指示があるときのみ**。

## 非対象（別途・任意）
- 死蔵コードの削除：`db/core.ts` の `collections.promotions`、`shared/types.ts` の `FsPromotion`（採用されなかった旧クーポン設計の残骸）。今回は**ルールのみ**に絞る。
