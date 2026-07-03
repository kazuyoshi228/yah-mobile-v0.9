# 管理画面（/admin）セキュリティ＆カスタムクレーム設定・検証マニュアル

このドキュメントは、`yah-mobile-v3` における管理画面（`/admin`）および関連するすべての管理者機能が、Firebase Custom Claims（カスタムクレーム）を用いて安全に保護されていることを確認・実装するための仕様書兼マニュアルです。

---

## 1. セキュリティの基本設計（3層の防御）

管理画面と管理者機能は、以下の3つのレイヤーすべてで **「Firebase Auth のカスタムクレーム（`admin: true`）」** を検証することで、不正アクセスを鉄壁に防ぎます。

```
[ レイヤー1: フロントエンド（画面表示） ]
  └ Reactのルーティングで `isAdmin` が false のユーザーは、管理画面を開く前に自動リダイレクトで追い出す。
       ▼
[ レイヤー2: データベース（Firestoreセキュリティルール） ]
  └ 万が一フロント画面をすり抜けてデータを盗み見ようとしても、`request.auth.token.admin == true` でアクセス拒否。
       ▼
[ レイヤー3: バックエンド（Cloud Functions） ]
  └ プラン追加や設定変更のAPIが呼ばれた際、関数の先頭で `requireAdmin(request)` を実行し、権限のないリクエストを即座にエラー（permission-denied）にする。
```

---

## 2. 【レイヤー1】フロントエンド（画面）でのガード設定

管理画面のルートコンポーネントにおいて、ログインしているユーザーが `admin` クレームを持っているかを確実に検証します。

### ■ 設定ファイルの確認・修正
* **対象ファイル**: `client/src/pages/AdminPage.tsx`（または管理画面の親コンポーネント）
* **実装仕様**:
  `useAuth()` フックから `isAdmin` フラグを取得し、ログインしていない場合、あるいは管理者でない場合は、即座に一般画面やトップページにリダイレクトさせます。

```typescript
// 実装イメージ
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export function AdminPage() {
  const { dbUser, isAdmin, fbResolved } = useAuth();
  const [, setLocation] = useLocation();

  // Auth情報の読み込みが完了するまでローディング表示
  if (!fbResolved) return <LoadingSpinner />;

  // 管理者でなければ、管理画面を表示せずに退避させる
  if (!isAdmin) {
    setLocation("/unauthorized"); // またはトップページ "/"
    return null;
  }

  // 管理者の場合のみ、管理画面（Tabsなど）を表示
  return <AdminLayout> ... </AdminLayout>;
}
```

---

## 3. 【レイヤー2】データベース（Firestore Rules）でのガード設定

万が一悪意あるユーザーがプログラムを改造し、ブラウザから直接管理者用データベースを読み書きしようとした場合、データベース側のルールでシャットアウトします。

### ■ 設定ファイルの確認・修正
* **対象ファイル**: `firestore.rules`
* **記述仕様**:
  `isAdmin()` ヘルパー関数を定義し、管理者用のデータテーブル（`plans` の書き込み、`allowed_emails`、`inquiries` の閲覧など）に適用します。

```javascript
// firestore.rules 内の記述
service cloud.firestore {
  match /databases/{database}/documents {

    // 管理者かどうかを判別するヘルパー関数
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    // 例1: プラン情報（読み取りは全員OK、書き込みは管理者のみ）
    match /plans/{planId} {
      allow read: if true;
      allow write: if isAdmin(); 
    }

    // 例2: 招待メールアドレス（管理者は自由に変更可能）
    match /allowed_emails/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if isAdmin();
    }

    // 例3: 問い合わせ内容（一般ユーザーは送信のみ、管理者は閲覧・更新が可能）
    match /contact_inquiries/{inquiryId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
  }
}
```

---

## 4. 【レイヤー3】バックエンド（Cloud Functions）でのガード設定

管理者専用の API（Callable Functions）を実行する前に、サーバー側でトークンの署名を検証します。

### ■ 設定ファイルの確認・修正
* **対象ファイル**: `functions/src/callables/_helpers.ts` (検証関数) ＆ `functions/src/callables/admin.ts` (API本体)
* **実装仕様**:
  各管理関数の先頭で `requireAdmin(request)` を呼び出し、エラーがあれば即座に例外を投げます。

```typescript
// functions/src/callables/_helpers.ts
export async function requireAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }
  // Custom Claims に admin: true が入っているか検証
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "管理者権限が必要です。");
  }
}
```

```typescript
// functions/src/callables/admin.ts 内のすべての関数
export const adminListPlans = onCall(async (request) => {
  await requireAdmin(request); // 最初に必ず呼び出す
  // ...管理者向けの処理を実行...
});
```

---

## 5. 【運用手順】管理者権限の付与方法（スクリプト実行）

新しいFirebaseプロジェクト（本番や検証環境）を作成した際、特定のアカウントに管理者バッジ（Custom Claims）を付与するための手順です。

### 1. 対象ユーザーのUIDを調べる
Firebase Consoleの「Authentication」画面を開き、管理者にするユーザーの「ユーザーUID」をコピーします。

### 2. 設定スクリプトを実行する
リポジトリ内の `scripts/set-admin-claims.mjs` ファイルの `ADMIN_UID` をコピーしたUIDに書き換え、ターミナルで実行します。

```bash
# スクリプトを実行して Custom Claims を書き込む
node scripts/set-admin-claims.mjs
```

### 3. 反映の確認方法
Custom Claimsを設定後、アプリにすでにログインしている場合は、**一度ログアウトして再ログインするか、トークンが更新されるまで（最大1時間）は権限が有効になりません。**
即座に反映させたい場合は、**「ログアウト ➡️ 再ログイン」**を行ってください。
