# 設計図 — 計測ループ ＋ L1自動化（失敗の見える化 → RAG改善）

対象: chat-yah-mobi（AIチャットサポート）
状態: **設計（実装前・承認待ち）**
位置づけ: 解決率を上げる全レバーの“起点”。**失敗をデータで見える化**し、毎週「一番大きい塊」から潰す。さらに **L1** で「知識欠落の修正ドラフトを自動生成＋メール通知」まで自動化し、**人は公開の承認だけ**を行う。

> UI最優先方針: **シンプル・ミニマル**。新規画面・新規サイドバー項目・チャートライブラリを**追加しない**。既存画面に最小限を同居させる。

---

## 1. 背景・目的

- 解決率を上げるには、勘ではなく **「どこで・なぜAIが失敗したか」をデータで捕まえて潰す**必要がある。
- 失敗シグナル（`resolved=false`・`escalated`・低評価）は**存在するが散在**し、原因別に見えない。
- 本設計は **①失敗の記録 → ②原因の自動分類 → ③ダッシュボード可視化 → ④修正ドラフトの自動生成＋メール通知 → ⑤人が承認して公開 → ⑥再測定** を最小構成で作る。

## 2. スコープ（作る / 作らない）

**作る（MVP）:**
1. AI応答ごとに**監査ログ**を1件記録（既存 `chat_agent_logs`）。失敗分析に必要な最小フィールドのみ。
2. `resolved=false` を**ルールベースで3分類**（追加LLMコストなし）。
3. 既存ダッシュボードに **失敗分析カード1枚**（解決率・原因別・直近の失敗一覧）。各失敗行から**会話**と**原因RAG**へ1クリック。

**作る（L1・上に乗せる）:**
4. 週次バッチが `knowledge_gap` をクラスタ化 → **Geminiで6言語ドラフトを自動生成** → 下書き（`isActive:false`）で投入。
5. 生成後、**`kazuyoshi.yamada@bonfire.co.jp` へメール通知**（既存Gmail送信を流用）。
6. 既存 `/admin/rag` に**「承認待ち（下書き）」フィルタ**＋公開/却下ボタン。

**作らない（後続）:** LLM高精度分類 / 再問い合わせ率の厳密集計 / 既存RAGの自動書き換え / 返金・課金系の自動化。

## 3. データモデル（既存 `chat_agent_logs` を使用・新コレクション無し）

**`chat_agent_logs/{autoId}`**（ルール既存: admin read/write・client書込不可・**Functionsのみ Admin SDK で書く**）
| フィールド | 型 | 用途 |
|---|---|---|
| `sessionId` / `messageId` / `visitorId` / `language` | string | 紐づけ・**会話へジャンプ** |
| `question` | string | 訪問者メッセージ（末尾トリム） |
| `answer` | string | AI回答（先頭N字） |
| `resolved` | bool | AIが解決したか（解決率の分母/分子） |
| `ragHitCount` | int | RAGが返した件数（**0＝知識欠落の最重要シグナル**） |
| `ragTopId` | string\|null | 最良RAG文書ID（**「原因RAGを編集」リンク先**。ヒット0はnull） |
| `ragTopScore` | number\|null | 最良距離（検索品質の目安） |
| `failureBucket` | string | 自動分類（下記・resolved時は "resolved"） |
| `createdAt` | Timestamp | 集計・保持期限 |

- ※ `ragTopId` を持つには **`ai.ts` の `searchRAG` が `docId` も返す**必要（現状 `{content, score}` → `{id, content, score}` に拡張）。`onVisitorMessageCreated` は既に `ragResults` を保持しているので、そこから `ragHitCount`/`ragTopId`/`ragTopScore` を同時格納。
- ※ 配列 `ragHitIds[]` は持たない（先頭1件のIDだけで足りる＝ミニマル）。

**原因分類（ルールベース・3失敗バケツ）:**
| bucket | 条件 |
|---|---|
| `resolved` | resolved=true（失敗ではない・解決率の分子） |
| `knowledge_gap` | resolved=false かつ ragHitCount==0（RAGに該当なし＝最多で最も直しやすい・**L1の対象**） |
| `account_or_emotional` | resolved=false かつ 注文/eSIM/残量/返金/怒り/人間希望 等のキーワード（AI単独では不可の領域） |
| `answer_quality` | resolved=false のその他（ragHitCount>0だが未解決＝検索/回答品質） |

## 4. 対象ファイルと変更方針（実コード準拠）

### MVP（見える化）
1. **`functions/src/triggers/onVisitorMessageCreated.ts`**
   - Step 6 付近で `chat_agent_logs` へ1件 add。`ragResults` から `ragHitCount`/`ragTopId`/`ragTopScore`、`aiResponse.resolved`、`event.params.messageId` を格納。
   - `failureBucket` はこのファイル内の小関数でルール分類（追加API呼び出しなし）。
   - ※ chat DB（`chatDb`）に書く。既存ロジックは不変、末尾に add を追記のみ。
2. **`functions/src/utils/ai.ts`**
   - `searchRAG` の戻り値を `{ id, content, score }` に拡張（本番検索は従来どおり `isActive==true` のみ対象）。
3. **`firestore.indexes.json`**
   - `chat_agent_logs`: `createdAt` DESC 単体、`failureBucket` ASC + `createdAt` DESC の複合（集計/一覧用）。
4. **`functions/src/scheduled/dataRetention.ts`**
   - 保持対象に `chat_agent_logs` の古いログ削除を追加（既存の保持ロジックに1コレクション足すだけ）。
5. **`client/src/pages/admin/BigKPIsFirebase.tsx`（既存に同居・新規画面なし）**
   - 既存KPIダッシュボード下部に**カード1枚**「失敗分析」を追加。`chat_agent_logs`（直近N日）を読み：
     - **解決率**（resolved / total）・**対象件数** … 数値のみ（グラフ無し）
     - **原因別カウント**（3バケツ・**CSS横バー** `div` 幅%）
     - **直近の失敗一覧**（question 1行 + bucket バッジ + 行内アクション2つ）
   - `useCollection`/`useFirestoreAdmin` を再利用。**チャートライブラリは追加しない**。CSATは既存KPI表示に任せ、カードには重複表示しない。
6. **サイドバー/ルート: 変更なし**（`/admin` に同居 → `App.tsx`・`DashboardLayout.tsx` 不変＝項目ゼロ増）。

### 失敗行のアクション（1クリックで因果へ）
- **「会話を見る」** → `/admin/chats?session={sessionId}#{messageId}`（やり取り全文）。
- RAG系（分岐）:
  - `ragHitCount>0` → **「関連RAG文書を編集」** → `/admin/rag?doc={ragTopId}`（保存で `onRagDocumentWritten` が自動再Embedding）。
  - `ragHitCount==0`（`knowledge_gap`）→ **「この質問からRAG新規作成」** → `/admin/rag?draft={question}`（本文プリフィル）。

### L1（自動生成＋メール承認）
7. **`functions/src/utils/mail.ts`（新規・共通化）**
   - `sendGmail({ to, subject, body })` を切り出し。中身は既存 `handleEscalation` の Gmail 送信（`google.auth.GoogleAuth` + `gmail.users.messages.send`, `userId:"me"`）と同一。
   - `onVisitorMessageCreated.ts` の `handleEscalation` も**この共通関数を呼ぶ形に置換**（挙動は不変・重複排除）。
8. **`functions/src/config.ts`**
   - `APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || "kazuyoshi.yamada@bonfire.co.jp"` を追加（承認通知の宛先）。
9. **`functions/src/scheduled/generateRagDrafts.ts`（新規）**
   - `onSchedule`（週次・asia-northeast1）。`chat_agent_logs` の直近 `knowledge_gap` を集計→**簡易クラスタ**（正規化テキスト/言語で寄せる）→代表質問ごとに **Geminiで6言語ドラフト生成** → `chat_rag_documents` に `isActive:false` で add（＝本番検索に出ない）。
   - 生成が1件以上なら **`sendGmail({ to: APPROVAL_EMAIL, ... })`**：件数・代表質問・承認URL（`/admin/rag?filter=pending`）を本文に。
10. **`functions/src/utils/ai.ts`（L1分）**
   - ドラフト生成プロンプト関数を追加（6言語・**「知らないことは創作せず“要確認”で下書き」制約**付き）。
11. **`client/src/pages/admin/AdminRagFirebase.tsx`**
   - 「**承認待ち（下書き）**」フィルタ（`isActive==false`）＋行内 **[公開]（`isActive:true`）/[却下]（delete）**。`?draft=` でプリフィル対応。編集UIは既存を流用（新部品なし）。

### ルール
- **変更なし。** `chat_agent_logs`・`chat_rag_documents` は既に `isAdmin()` の read/write。下書き（`isActive:false`）も admin のみ可視。Functions は Admin SDK でルールをバイパスして書く。

## 5. 影響範囲・リスク・代替案

- **コスト/容量**: AI応答ごとに `chat_agent_logs` 1 write。保持期限で抑制。分類は追加LLM無し。L1のGeminiは**週1回・knowledge_gapのみ**でごく少量。
- **🚨 事実捏造リスク（L1）**: 空白をAIが“それっぽい誤情報”で埋め全顧客に誤配信する恐れ → **必ず `isActive:false` の下書きで生成し、公開は人の承認のみ**。対象は `knowledge_gap` 新規のみ。既存書き換え・返金/課金系は自動化しない。
- **メール**: 既存の動作実績あるGmail経路を流用（新規IAM/設定不要）。宛先は `APPROVAL_EMAIL`。
- **ガードレール**: 書き込みは chat DB のみ。`(default)`・yah.mobi 非干渉。client 書込不可。既存Functions（codebase default）は触らない。

## 6. テスト/検証計画

- `tsc`（client/functions）＋ `vite build` ＋ `npm --prefix functions run build`。
- e2e（エミュ/本番）: 解決/知識欠落/返金 の3ケースを投げ、`chat_agent_logs` に `resolved`/`ragHitCount`/`ragTopId`/`failureBucket` が正しく入るか。
- ダッシュボード失敗カードで 解決率・原因別・失敗一覧・各リンク（会話/RAG編集/RAG新規）が動くか（dev URL）。
- L1: `knowledge_gap` を仕込んでバッチ手動起動 → 下書きが `isActive:false` で作られ、**`kazuyoshi.yamada@bonfire.co.jp` にメールが届く**か。`/admin/rag` の承認待ちで [公開]→`isActive:true`→自動Embedding、[却下]→削除 を確認。
- ガードレール: client から `chat_agent_logs` に書けないこと。下書きが本番検索（`searchRAG`）に出ないこと。

## 7. デプロイ（ユーザー実行・スコープ厳守）

- Functions 変更 → `pnpm deploy:functions`（chatのみ）。※ 新関数 `generateRagDrafts` はスケジューラ登録が入る。
- indexes → `pnpm deploy:rules`。
- 画面 → `pnpm deploy:dev`（dev確認）/ `pnpm deploy:hosting`（本番・**別途ユーザー指示**）。
- ログ・下書きはデプロイ後に蓄積開始（過去分は遡及しない）。

## 8. これで何が変わるか

- 「勘でRAGを増やす」→「**今週の失敗の40%は“キャリアXの知識欠落”**」と投資先が数字で分かる。
- さらにL1で **知識欠落の下書きが毎週自動で用意され、メールで届く** → あなたは**中身を確認して[公開]を押すだけ**。ゼロから書かない。
- 公開の承認は常に人 ＝ 事実の確定は人が握る（前回の「24時間の過剰表現」型の事故を防ぐ）。
- 追加した文書の効果は**翌週の解決率**で自動検証＝悪化に気づける。
- 目安：計測ループ＋L1運用で **~95%** を目指せる（残りはアカウント個別/感情領域＝別レバー）。

## 9. 実装順序（推奨・二段）

- **(A) MVP**: `chat_agent_logs` 記録 ＋ `searchRAG` の `id` 返却 ＋ 失敗分析カード（会話/RAGリンク込み）。
- **(B) L1**: `mail.ts` 共通化 ＋ `APPROVAL_EMAIL` ＋ `generateRagDrafts` ＋ `/admin/rag` 承認フィルタ。

まず (A) を実装・dev確認 → (B) を実装、の順を推奨。
