# 設計図 — エスカレーション＝CONTACTフォーム誘導（chat-yah-mobi）

対象: chat のエスカレーション再定義＋壊れた in-chat フォームの撤去
状態: **設計（実装前・会話で方針承認済み）**

## 確定事項
- **定義**: `resolved=false` ＝ AIが解決できず **`https://yah.mobi/contact` へ誘導** ＝ **エスカレーション**。
- **発火**: chat の**サーバ側**（`onVisitorMessageCreated`）。自分の誘導なので確実に検知。
- **自前メール**: **廃止**（販売サイトの問い合わせフォームが通知・対応を持つ。二重通知回避）。Sheets記録も冗長なため廃止（記録は失敗分析ダッシュボードが担う）。`escalated` フラグは残す。
- **誘導先**: `https://yah.mobi/contact`（描画確認済み）。カテゴリ/メールのプリフィルは販売側対応が要るため当面なし。
- 履行系は非関与（従来どおり）。

## 背景
- 旧: `resolved=false → handleEscalation`（管理者へGmail＋Sheets＋`escalated`）。マイページ案内まで巻き込み過剰発火していた（別途 resolved 基準を是正済み）。
- 発見: ウィジェットの in-chat 問い合わせフォームは `contactForms` に書くが**ルール未登録で書込拒否→握り潰し**＝**壊れている**。→ 撤去し、販売サイトの CONTACT へ一本化。

## 変更（実コード）

### functions
1. **`functions/src/triggers/onVisitorMessageCreated.ts`**
   - `handleEscalation` を**フラグのみ**に簡素化: `sessionRef.update({ escalated: true })` だけにし、**Gmail送信・Sheets追記を削除**。
   - `resolved=false` の記録は既存の `chat_agent_logs`（失敗分析）が担う（変更不要）。
   - ※ `sendGmail` 共通関数自体は L1（下書き承認メール）で使うので残す。この trigger からは呼ばない。
2. **`functions/src/utils/ai.ts`**（プロンプト）
   - `resolved=false` のときの回答は、**問い合わせフォームへの誘導**を含める:「解決できない旨を詫び、`お問い合わせフォーム（ボタン）からご連絡ください。担当が1営業日以内に対応します`」を訪問者言語で。※URLはボタンで開くので本文にURL必須ではない。

### client
3. **`client/src/hooks/useChatMessages.ts`**
   - `ChatMessage` に `resolved?: boolean` を追加し、`doc.data().resolved` をマップ（CONTACTボタン表示判定に使う）。
4. **`client/src/components/ChatWidgetFirebase.tsx`**
   - **壊れた in-chat フォームを撤去**: `showFormPrompt`/`formEmail`/`formMessage`/`formSubmitted`/`formPromptContent`/`handleFormSubmit`/`contactForms` と、フォームUIブロック（507–555付近）を削除。
   - `handleNodeSelect` の `formTrigger`（`redirect_form`）分岐は、フォーム表示ではなく **CONTACTを開く**に置換。
   - **CONTACTボタン**（QR案内と同じ `window.open` パターン）を追加。表示条件: **AIチャットで最新AIメッセージが `resolved === false`** のとき、メッセージ下に「お問い合わせフォームを開く」ボタン → `window.open("https://yah.mobi/contact","_blank","noopener,noreferrer")`。多言語ラベル（ja/en/zh/ko/th/vi）。
   - 併せて「引き続きチャットで相談」導線は現状維持（ユーザーが続けられる）。

### rules / seed
- **変更なし**（`contactForms` はもともと未登録＝撤去するだけ。新規ルール/関数は不要）。

## リスク・非対象
- 「誘導＝エスカレーション」は**完了より過剰計上**（フォームを送らず離脱もカウント）。ハンドオフ率の指標としては妥当。実完了は販売側の領域。
- 会話とフォーム完了の紐付けはしない（したい場合のみ後日 `?ref=sessionId` ＋販売側対応）。
- 訪問者導線が変わる → **dev ウィジェットでプレビュー確認**。

## テスト/検証
- functions `tsc` build ＋ client `tsc`/`vite build`。
- dev widget（英語）で: 解決できない質問 → AIが英語で謝意＋CONTACT誘導、**「お問い合わせフォームを開く」ボタン**が出て `yah.mobi/contact` が新規タブで開く。
- `/admin/chats` で当該会話が `escalated`（バッジ）になり、**メールは飛ばない**こと。失敗分析ダッシュボードに `resolved=false` が計上されること。
- マイページ案内（アカウント/ログイン/返金）は `resolved=true` でエスカレーションにならないこと（既存修正の回帰確認）。

## デプロイ（ユーザー操作）
- `pnpm deploy:functions`（trigger＋プロンプト）
- `pnpm deploy:dev`（ウィジェット）→ 確認 → 本番は別途 `pnpm deploy:hosting`。
