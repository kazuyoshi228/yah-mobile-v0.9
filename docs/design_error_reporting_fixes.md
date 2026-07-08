# 設計図 — Cloud Error Reporting（チャット側）エラー調査・修正

対象: chat-yah-mobi（Functions codebase `chat`）／プロジェクト共有 `yah-mobile-v1-3ed24`
状態: **設計（実装前・承認待ち）**
原則: 🚨 **eSIM側(yah-mobile / (default) / codebase default) には一切触れない。** chat 側のみ。

---

## 1. 調査結果（現況判定）

| # | エラー | 現況判定 | 根本原因 |
|---|---|---|---|
| ① | onragdocumentwritten「Embedding 生成エラー: GoogleGenerativeAI」(handleResponseError) | **旧デプロイ由来**（現行は `@google/genai` Vertex。`@google/generative-ai` は src/pkg/lib に無し）＋**現行にも改善余地** | ①-a 旧コードの残存エラー。①-b 現行 `onRagDocumentWritten` はエラーログに `docId` を含む→**グループ膨張**。①-c **長い6言語ドラフト**を embedding して**入力長超過で失敗**する可能性（現行の真因候補） |
| ② | onvisitormessagecreated「Missing vector index configuration」 | **旧デプロイ由来**（index構築前）。現在は index 定義済み＆ searchRAG 稼働中（E2E確認） | index 構築完了前の一時エラー。**コード変更不要**（console で READY 確認のみ） |
| ② | 「Gmail 送信エラー / エスカレーションメール送信エラー: GaxiosError: Precondition check failed」 | **現行**（generateRagDrafts の承認メール。※escalationメールは先日撤去済で今後は出ない） | `mail.ts` が `userId:"me"` かつ**ドメイン全体委任(subject)無し**→ SA に送信元メールボックスが無く送信不可。**元々一度も届いていない** |
| ③ | ERR_MODULE_NOT_FOUND 'drizzle-orm'（源: yah-chat-webdev） | **旧デプロイのオーファン関数**（drizzle は functions のどこにも無し） | BaaS移行前の関数が削除されず稼働。トリガー発火のたびに import 失敗 |

**要点**: ①-a/②index/③/escalationメール は「**過去の残骸**」。**再発を止めるにはオーファン関数の削除**が主。加えて①-b/①-c と Gmail方針は**現行コードの修正**。

---

## 2. 修正方針

### A. onRagDocumentWritten を堅牢化（①-b / ①-c）
`functions/src/triggers/onRagDocumentWritten.ts` ＋ `functions/src/utils/ai.ts`
1. **エラーログから docId を本文に出さない**（グループ膨張防止）:
   - `console.error("RAG embedding 生成エラー", { id }, error)` … docId は構造化引数へ。メッセージ文字列は固定。
2. **入力長ガード**（`generateEmbedding`）: text-embedding-004 の上限に合わせ、**content を安全長（例 8000 文字）に切り詰めてから embedding**。長い6言語ドラフトでの失敗を防ぐ。
3. **1回リトライ**（transient対策）: 失敗時に一度だけ再試行→なお失敗ならスキップ（既存の自己修復＝次回書込で再生成、は維持）。

### B. Gmail「Precondition check failed」（現行）
`mail.ts` は委任無しで送信不可。**2案から選択**：
- **B-1（推奨・最小）**: `generateRagDrafts` の**承認メール送信を廃止**。承認待ちは既存の**サイドバー「RAG Documents」バッジ**で可視化済み（同等の運用が可能）。→ `sendGmail` 呼び出し撤去、未使用になった `mail.ts` は削除。Gmailエラーが**根絶**。
- **B-2（メールを残す場合）**: ドメイン全体委任を設定（Workspace管理＋SAに委任＋`GoogleAuth({ clientOptions:{ subject:"送信元@yah.mobi" }})` に変更）。設定はコンソール作業（ユーザー）＋コード修正。

### C. オーファン関数の削除（③・①-a・②index・escalationメール の残骸源を根絶）
現行 chat codebase の関数は **6つ**：`onVisitorMessageCreated` / `onSessionEnded` / `onRagDocumentWritten` / `dataRetentionPurge` / `generateRagDrafts` / `claimSession`。
- ユーザー実行: `firebase functions:list` → **この6つ以外**（drizzleを含む旧関数等）を特定 → `firebase functions:delete <name> --region asia-northeast1 --force`。
- 🚨 **eSIM(default codebase)の関数は絶対に削除しない**。削除対象は「旧chat関数のオーファン」のみ。一覧を提示いただき、**一緒に対象を確定**してから削除。

### D. ベクトルindex（②）
- `firestore.indexes.json` に定義済み（chat_rag_documents.embedding / 768 / flat）。**コード変更なし**。
- console（Firestore→インデックス）で **READY** を確認。未構築なら `pnpm deploy:rules` で作成→数分待ち。

---

## 3. 影響範囲・リスク
- 変更は chat 側のみ（`onRagDocumentWritten` / `ai.ts` / `generateRagDrafts` / (B-1なら)`mail.ts`）。ルール/индекс/eSIM 非干渉。
- B-1採用時：L1承認の通知手段が「メール→バッジ」に一本化（機能低下は軽微、むしろ確実）。
- オーファン削除：対象を誤ると機能停止 → **必ず functions:list を確認し6関数以外のみ**。eSIM関数は対象外。

## 4. テスト/検証
- `tsc`（functions）＋（B-1で mail 削除なら）未使用import解消を確認。
- 長文RAG文書を1件保存→ onRagDocumentWritten が**エラーにならず** embedding 付与されるか（切り詰め動作）。
- `generateRagDrafts` 手動実行→ **Gmailエラーが出ない**（B-1）＋ 下書き作成＆バッジ増加。
- デプロイ後、Error Reporting で ①②③ の**新規発生が止まる**か（数日観察）。

## 5. デプロイ
- Functions 変更 → `pnpm deploy:functions`（chatのみ）。
- オーファン削除 → `firebase functions:delete ...`（ユーザー・対象確定後）。
- index確認のみ（必要時 `pnpm deploy:rules`）。

## 6. 要判断・要確認（着手前）
1. **Gmail 方針**: B-1（承認メール廃止・バッジ運用）／B-2（委任設定して残す）。→ **推奨 B-1**。
2. **`firebase functions:list` の出力**を共有 → 削除するオーファンを一緒に確定。
3. Error Reporting で ①②の**発生タイムスタンプが最近か（現行再発）／過去のみ（残骸）**か確認。
