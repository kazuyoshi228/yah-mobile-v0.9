# 設計図 — 冒頭3分岐デシジョンツリー（chat-yah-mobi）

対象: 訪問者ウィジェット入口の3分岐ルーティング
状態: **設計（実装前・承認待ち）**
方針（確定済み）: **冒頭で3分岐だけツリー化 → その先はAIに寄せる**／**chatは非履行（QR等は実行せずマイページ案内）**

---

## 1. 背景・目的
- 計測ループ(①)が入ったので、ルーティングは**薄く**てよい。入口で意図を3つに大別し、あとはAI＋RAGに任せる。
- 目的：訪問者が「何を聞けるか」を最初に理解でき、AIに渡す**初期コンテキストの質**を上げる（＝1発解決率↑）。

## 2. 実コードの前提（重要）
- ノードは Firestore `chat_flow_nodes/{id}`。フィールド: `parentId` / `type`(question|answer|redirect_form|redirect_ai) / `label`(i18n JSON) / `content`(i18n JSON|null) / `options`(子IDのJSON配列) / `icon` / `formTrigger`(0/1) / `aiTrigger`(0/1) / `sortOrder` / `isActive`(0/1)。
- **ウィジェットは `id:"root"` を起点**に、各ノードの **`options`（子ID配列）** で遷移する。
- ノード選択時の挙動（`handleNodeSelect`）:
  - `label` に `qr_resend:true` → **マイページ案内**（QR再送はしない＝非履行）。
  - `formTrigger` → 問い合わせフォーム誘導。
  - `aiTrigger` → **AIチャット開始**（`content` を初期グリーティングとして渡す）。
  - いずれも無し → `options` の子へ降りる。
- 🔴 **不整合**：管理画面は `parentId` で木を描くが `options` を書かない。**seed で `parentId` と `options` の両方を設定**して二重整合させる（管理画面の見た目もウィジェット遷移も両立）。

## 3. 提案する3分岐（Variant A ＝ 最小・推奨）
> 「冒頭3分岐だけ」の指示に忠実。各分岐は **aiTrigger で AI 起動**し、分岐に応じた初期コンテキストを渡す。深い木は作らない。

```
root（question, options=[b_purchase, b_esim, b_other]）
├─ ① 購入・プランについて     （aiTrigger）→ AI「ご希望のプラン相談（国/データ量/期間/料金）」
├─ ② eSIM設定・トラブル       （aiTrigger）→ AI「eSIM設定・接続の相談（機種/状況）」
└─ ③ その他・AIに相談          （aiTrigger）→ AI「何でもご相談ください」
```
- 並び順は `sortOrder`：購入=10 / eSIM=20 / その他=30（購入が先頭）。
- 返金・キャンセルの独立分岐は**置かない**（返金は原則不可・案内はAI/RAGで対応）。

### Variant B（任意・実用寄り）: ② に浅いサブメニュー
eSIM だけ1階層足す案（QRの非履行案内を明示できる）:
```
② eSIM設定・トラブル（question, options=[e_iphone, e_android, e_qr, e_conn]）
   ├─ iPhoneで設定       （aiTrigger）
   ├─ Androidで設定      （aiTrigger）
   ├─ QRが見つからない    （qr_resend）→ マイページ案内（非履行）
   └─ 繋がらない/圏外     （aiTrigger）→ AI（状況別プロトコル発火）
```
> 推奨は **A（純粋な3分岐）**。まず最小で出し、必要なら B に拡張。ここは選択いただく。

## 4. 多言語（全6言語を最初から）
`label`/`content` は **6言語すべて（ja/en/zh/ko/th/vi）を最初から**個別に用意（フォールバック依存にしない）。格納は既存どおり JSON 文字列（widget/admin が `JSON.parse`）。

## 4b. 分岐の意図をAIに渡す配線（重要・追加）
- 実コード確認の結果、分岐選択時の `content` は **`chat_sessions.initialMessage` に保存されるだけで AI には渡らない**（AIトリガーは visitor メッセージ作成で発火するため）。
- そこで **`onVisitorMessageCreated` で `session.initialMessage` を AIコンテキストに1行足す**（例:「訪問者が選んだ相談メニュー: eSIM設定・トラブル」）。これで**最初の実回答が分岐に沿う**。
- 変更は **functions 側 約3行**（`buildCustomerContext` の結果に前置）。widget 変更なし・合成メッセージも出さない（訪問者は自分でメッセージを打つ、既存UX維持）。

## 5. 対象ファイルと変更方針
1. **`functions/scripts/seed_flow_tree.mjs`（新規）**
   - `seed_hospitality.mjs` と同型。`chat` DB の `chat_flow_nodes` に **root＋3分岐（＋Bならサブ）** を upsert。
   - 各ノードに **`parentId` と `options` の両方**を設定。`aiTrigger:1`、`isActive:1`、`sortOrder`。
   - doc ID 固定（`root`/`b_purchase`/`b_esim`/`b_other`…）→ 再実行で重複しない。
   - ドライラン（`node scripts/seed_flow_tree.mjs`）／投入（`--write`）。
2. **`functions/src/triggers/onVisitorMessageCreated.ts`**（約3行）
   - `session.initialMessage`（＝選んだ分岐の意図）を AIコンテキストへ前置（§4b）。
3. ウィジェット・管理画面・ルールは**変更なし**（`chat_flow_nodes` は認証で read / admin write ＝既存）。

## 6. リスク・非対象
- **管理画面での子の付替えは `options` を更新しない**既知の制約は残る（今回はseed運用で回避）。将来必要なら管理画面に `options` 同期を足す（別タスク）。
- 履行系（QR再送・返金）は**入れない**（非履行方針）。
- 訪問者導線の変更＝**要プレビュー確認**（dev チャンネル）。

## 7. 検証
- ドライラン出力で投入予定ノードを確認 → `--write`。
- dev ウィジェットで：root に3分岐が出る／各分岐でAIが適切な初期文脈で開始／（Bなら）QRでマイページ案内が出る。
- 管理画面（デシジョンツリー管理）でツリーが階層表示されるか。

## 8. デプロイ
- seed はデータ投入（`functions/` から `node scripts/seed_flow_tree.mjs --write`）。**Functions/hosting デプロイ不要**（データのみ）。
- 本番反映は seed 実行時点で即（chat DB 共有）。まず dev ウィジェットで確認 → 問題なければ本番ウィジェットにも同データが出る。
