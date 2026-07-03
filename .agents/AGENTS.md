# yah.mobile-v4 — エージェント向けアーキテクチャルール

AIエージェント（Antigravity、MANUSなど）がこのプロジェクトで作業を行う際は、**必ず以下のルールをすべて把握してから作業を開始してください。**

---

## 0. プロジェクト概要と技術スタック

| 区分 | 内容 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite + TailwindCSS v4 |
| UIコンポーネント | shadcn/ui（Radix UI ベース）|
| ルーティング | wouter |
| サーバーステート | TanStack Query v5 + tRPC v11 |
| 国際化 | i18next / react-i18next |
| バックエンド | Firebase Cloud Functions（Node.js / TypeScript）|
| データベース | Cloud Firestore |
| 認証 | Firebase Authentication |
| 決済 | Stripe |
| ホスティング | Firebase Hosting（`firebase deploy`）|
| パッケージマネージャー | フロント: `pnpm` / バックエンド: `npm`（後述）|

### ディレクトリ構成

```
yah-mobile-v4/
├── client/src/          # フロントエンド本体
│   ├── _core/           # 初期化・設定など
│   ├── components/      # UIコンポーネント（shadcn/ui + カスタム）
│   ├── contexts/        # React Context
│   ├── hooks/           # カスタムフック（Firestore直接アクセスなど）
│   ├── i18n/            # 国際化リソース
│   ├── lib/             # 汎用ユーティリティ
│   └── pages/           # ページコンポーネント
├── functions/src/       # Cloud Functions（Node.js バックエンド）
│   ├── bappy/           # Bappy eSIM プロバイダ連携
│   ├── adapters/        # 外部API アダプタ
│   ├── callables.ts     # クライアントから呼び出し可能なCallable Functions
│   ├── llm.ts           # OpenAI等 LLM 呼び出し（要保護）
│   ├── stripe.ts        # Stripe 決済ロジック（要保護）
│   ├── webhooks.ts      # 外部Webhook受信ハンドラ（要保護）
│   ├── esimRetryService.ts  # eSIM障害リトライ処理（要保護）
│   ├── triggers.ts      # Firestore トリガー
│   ├── scheduled.ts     # スケジュール実行
│   └── index.ts         # エクスポートエントリーポイント
├── shared/              # フロント・バック共有型定義
├── docs/                # 設計ドキュメント
├── scripts/             # 開発用スクリプト
├── firebase.json        # Firebase CLI 設定
├── firestore.rules      # Firestoreセキュリティルール
└── package.json         # ルート（フロントエンド / pnpm）
```

---

## 1. 🔒 絶対に削除・変更してはいけないファイル（保護ファイル）

以下のファイルは、**外部APIキー・機密処理（LLM呼び出し、決済処理、外部プロビジョニングサーバーとの通信）** を含んでいます。  
**いかなるリファクタリング・クリーンアップ・BaaS化においても、ユーザーの明確な許可なくこれらを削除・大幅変更しないでください。**

| ファイル | 内容 |
|---|---|
| `functions/src/callables.ts` | Callable Functions のエントリーポイント |
| `functions/src/llm.ts` | OpenAI 等 LLM 呼び出し（APIキー利用）|
| `functions/src/stripe.ts` | Stripe 決済ロジック |
| `functions/src/webhooks.ts` | 外部 Webhook 受信・処理 |
| `functions/src/esimRetryService.ts` | eSIM 障害リトライ処理 |
| `functions/src/bappy/` | Bappy eSIM プロバイダ連携（ディレクトリ全体）|

> [!CAUTION]
> `bappy.ts` というファイルは存在しません。正しくは `functions/src/bappy/` **ディレクトリ**です。誤った参照に注意してください。

---

## 2. BaaSファースト構成の例外事項（サーバーサイド処理）

本プロジェクトは「BaaSファースト」（フロントエンドから Firestore を直接読み書きする）アーキテクチャを採用していますが、以下の機能群はセキュリティ上の理由から **意図的に Cloud Functions（サーバー側）に残しています**。  
フロントエンドへの移行・削除を試みないでください。

| Cloud Function | 理由 |
|---|---|
| `analyticsGetAiInsights` | OpenAI APIキーをサーバー側で安全に管理するため |
| `incidentRunRetryNow` | 外部プロビジョニングAPIを安全に呼び出すため |
| `esimGetTopupPlans` | 外部プロバイダから最新プランを取得するため |
| `stripeWebhook` 等 | 決済完了をセキュアにハンドリングするため |

---

## 3. Firestore 直接アクセスの推奨パターン

機密情報を含まないデータ（プラン一覧、注文履歴、ユーザーアクセスログなど）の CRUD 操作は、フロントエンドから直接 Firestore を読み書きしてください。

### 利用すべきカスタムフック

ファイル: `client/src/hooks/useFirestoreCollection.ts`

```typescript
// コレクション（複数件）をリアルタイム購読
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

const { data, isLoading, error } = useFirestoreCollection<DbPlan>(
  () => query(collection(db, 'plans'), where('isActive', '==', true)),
  [/* 依存配列 */],
  { realtime: true } // false にすると getDocs で1回取得
);

// ドキュメント（1件）をリアルタイム購読
import { useFirestoreDoc } from '@/hooks/useFirestoreCollection';

const { data, isLoading } = useFirestoreDoc<DbUser>(
  () => doc(db, 'users', uid),
  [uid],
  { enabled: !!uid }
);
```

> [!NOTE]
> `useFirestoreDocument` というフックは**存在しません**。正しくは `useFirestoreDoc`（同じファイル内にエクスポートされています）。

---

## 4. パッケージマネージャーの厳格な分離ルール

| ディレクトリ | 使用するPM | 禁止 |
|---|---|---|
| ルート（フロントエンド）| `pnpm` | `npm` の使用禁止 |
| `functions/`（バックエンド）| `npm` | `pnpm` の使用禁止 |

> [!CAUTION]
> `functions/` ディレクトリ内で `pnpm` を実行すると `pnpm-lock.yaml` が生成され、**Cloud Build デプロイが失敗します**。  
> 逆にルートディレクトリで `npm install` を実行すると `package-lock.json` が生成され、`pnpm-lock.yaml` との競合が発生します。

### よく使うコマンド

```bash
# フロントエンド（ルートディレクトリ）
pnpm install
pnpm run dev
pnpm run build
pnpm run check      # TypeScript型チェック

# バックエンド（functions/ ディレクトリ）
cd functions
npm install
npm run build
```

---

## 5. デプロイ手順

```bash
# フロントエンドビルド（ルートで実行）
pnpm run build

# Firebase デプロイ
firebase deploy --only firestore:rules,functions,hosting
```

> [!NOTE]
> `hosting` デプロイは Vite のビルド成果物（`dist/`）を対象にします。デプロイ前に必ず `pnpm run build` を実行してください。

---

## 6. その他の基本方針

- **破壊的変更の禁止**: 動作している既存のコードやファイルを大きく削除・変更する際は、必ず事前にユーザーへ意図を説明し、明示的な確認をとること。**「安全第一」で進めてください。**
- **TypeScript 型安全の維持**: `any` 型の多用を避け、`shared/` ディレクトリの共有型定義を積極的に活用してください。
- **コード整形**: `pnpm run format`（Prettier）を使用。設定は `.prettierrc` を参照。
- **shadcn/ui の利用**: 新しい UI コンポーネントを追加する際は、既存の shadcn/ui コンポーネント（`components/ui/`）を優先的に活用してください。
- **i18n 対応**: ユーザー向けの文字列は必ず i18next を通じて国際化してください。ハードコードされた日本語・英語文字列を UI に追加しないでください。
