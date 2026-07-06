# 実装設計書：サポート/チャット表記の整合（AIチャット集約への対応）

対象ブランチ: `dev` ／ 作成: 2026-07-06 ／ ステータス: A項・B項は承認済みで実装
関連: [plan_v0.51.md](./plan_v0.51.md)（GAゲートに本件を追跡）

## 背景・決定事項
24/7サポートを**AIチャットに集約**する方針。ただし：
- **問い合わせフォームは残す**（現状の実働窓口。`submitContactInquiry`→`contact_inquiries`＋オーナー通知）。
- **AIチャットは未実装（これから）**。→ チャット表記の暫定化は **(C) 現状維持**（未リリースのため許容）。
- **法務エスカレーションはフォーム経由でOK**（人に届く＋電話は請求時開示済＝特商法対応。最終確認は専門家）。

本設計では、チャット実装可否に依らず**今すぐ直すべき2点（A/B）**のみ実施する。

## 今回の実装（A項・B項／5言語：en/ko/zh-CN/zh-TW/th）

### A. 「人的チーム」含意の除去（チャネル中立＋将来AI）
| キー | 変更前(en) | 変更後(en) |
|---|---|---|
| `support.subheading` | Our **team** is available 24/7 — before and after your trip. | **Support** is available 24/7 — before and after your trip. |
| `features.items.support.desc` | **Japan-based support team**, available 24/7 in multiple languages. | 24/7 support in multiple languages, before and during your trip. |
| `faq`「help setting it up」 | **Our support team** is available 24/7 via chat. **We'll walk you** through… | 24/7 **chat support can guide you** through installation step by step… |

- `features.items.support.title`「24/7 multilingual support」は**維持**（AIも24/7・多言語で真）。
- 「24/7 / via chat」の記述は **(C)** に従い維持（チャット実装まで暫定容認）。

### B. 応答時間の実SLA化（フォーム基準）
| キー | 変更前(en) | 変更後(en) |
|---|---|---|
| `contact.subtitle` | …We'll get back to you **within 2 hours**. | …We'll reply **within 1 business day**. |
| `contact.hints.notListedAbove` | …**Our support team** typically replies **within 1–2 hours**. | …**We** typically reply **within 1 business day**. |

- SLA値は **「1営業日以内（1 business day）」** を採用（over-promise回避の安全値）。実運用値が別なら差し替え。

## 非対象（今回やらない）
- チャット系表記の暫定化（`chatSupport.*` / CTA配線 / 法務ページ連絡先）＝ **(C) 現状維持**。GA前に別途対応（下記）。
- `order_failed` 通知等の障害導線のチャット/フォーム切替。

## GA（一般公開）前の必須（→ plan_v0.51 §6 に追跡）
公開までに **(a) AIチャット実装・稼働** または **(b) チャット表記のフォーム主導への修正**（"24/7 chat" 暫定化・CTAをフォームへ・`Terms/Privacy/Cookie`の連絡先有効化）のいずれかを必須とする。

## 検証
- `npx tsc --noEmit`（i18n構造維持）／`npx vitest run --config vitest.client.config.ts`。
- devプレビューでサポート文言の表示確認（言語切替）。
- `dev` コミット（hosting反映は別途指示）。
