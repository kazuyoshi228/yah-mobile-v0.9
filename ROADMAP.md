# yah.mobile-v4 Roadmap

このドキュメントは、プロジェクトの今後のマイルストーン、特にセキュリティやスケーラビリティ向上のためのロードマップを管理するものです。

## Phase 1: BaaSファースト移行（完了）
- [x] フロントエンドからのFirestore直接アクセスの実装
- [x] 不要なAdmin向けAPIの削除と `callables.ts` のクリーンアップ
- [x] Firestore Rules の厳格化・スキーマ検証の実装
- [x] 外部API連携やセキュアな処理（LLM, Stripe, プロビジョニング等）のみをFunctionsに残す
- [x] Cloud Functions の v7 および Node.js 22 へのアップグレード
- [x] Custom Claims による Role-Based Access Control (RBAC) の導入

## Phase 2: エンタープライズ級セキュリティの導入（Next Steps）
開発メンバーの増加や、サービスのスケールに伴い、以下のセキュリティ強化を順次導入します。

### 1. Firebase App Check の導入
- **目的**: 悪意のあるユーザーがターミナルやPostmanなどから直接FirestoreやFunctionsを叩くのを防ぐ。
- **実装内容**: フロントエンド（Next.js）に reCAPTCHA Enterprise などを組み込み、Firebaseバックエンド側で App Check トークンを必須化する。

### 2. Cloud Secret Manager への環境変数移行
- **目的**: APIキー（Stripe, Bappy, OpenAIなど）をより強固に保護し、Firebase Console 上での露出を防ぐ。
- **実装内容**: 現在の `.env` や `process.env` を用いた運用から、Firebase Functions v2 の `defineSecret`（Google Cloud Secret Manager）を利用した運用へ切り替える。

### 3. Cloud Functions のレートリミット（Rate Limiting）設定
- **目的**: 万が一アカウントが乗っ取られた際の、クラウド破産（Billing Attack）やDDoS攻撃を防止する。
- **実装内容**: 課金が発生する特定の Callable API（例: `analyticsGetAiInsights`）に対して、IPベースまたはユーザーUIDベースでのコール回数制限を実装する。

## Phase 3: 運用・インフラの堅牢化（Operation & Infrastructure Safety）
ビジネスの継続性を守るための、自動監視およびフェイルセーフの仕組みです。

### 1. Bappy（外部プロバイダ）の在庫・残高の自動監視アラート
- **目的**: eSIMの仕入れ元プロバイダの事前チャージ残高や在庫が枯渇し、決済完了後にeSIMが発行されない障害（機会損失・クレーム）を防ぐ。
- **実装内容**: Firebase Scheduled Functions（Cron）を用いて定期的にBappy APIから残高を取得。閾値を下回った際にSlack/Discord/メールで管理者に緊急アラートを送信する。

### 2. Firestoreのバックアップ自動化（PITRと定期エクスポート）
- **目的**: オペレーションミスやバグによる全データ消失、上書きリスクに備える。
- **実装内容**: Firestoreの PITR (Point-in-Time Recovery) を有効化し、過去7日間の任意の「分」へのロールバックを可能にする。加えて、Cloud Storageへの毎日の自動エクスポートを設定。

### 3. Stripe決済の不正利用（クレジットマスター攻撃）対策
- **目的**: ボットによる不正なクレジットカード番号の大量テスト決済（クレカマスター）の標的になることを防ぐ。
- **実装内容**: 同一IPや同一ユーザーからの短時間の異常な注文作成（例：1時間に10回以上）をトリガー（`onOrderCreated` 等）で検知し、一時的にアカウントをブロック（Checkout遷移不可）にする。

### 4. Webhookエンドポイントの保護強化
- **目的**: Stripe Webhook 等の公開エンドポイントへの大量リクエスト（DDoS攻撃）によるサーバーダウンや課金高騰を防ぐ。
- **実装内容**: Firebase Hosting Rewrite ＋ Google Cloud Armor の導入、または Function 内部での IPベースの簡易レートリミットを実装する。

## Phase 4: パフォーマンスと運用の最適化（Future）
- [ ] Firebase App Hosting でのキャッシュ戦略の最適化（SSR / ISR のチューニング）
- [ ] ユーザー行動ログの詳細なダッシュボード化（BigQueryへのエクスポート等）
