# 設計書：柱2 Phase1 — Provider 抽象（eSIMAccessメイン化の土台）

対象ブランチ: `dev` ／ 作成: 2026-07-07 ／ ステータス: **設計（要承認→実装）**
関連: [esimaccess_api_notes.md](./esimaccess_api_notes.md)（確定API）／ [esimaccess_parallel_introduction.md](./esimaccess_parallel_introduction.md)／ [plan_v0.51_v2.md](./plan_v0.51_v2.md) 柱2

## 決定事項（前提）
- **Phase 0 完了**：eSIMAccess 日本プラン（**IIJ＝ドコモ回線・non-HK IP**）を**実機検証済み・問題なし**。
- **方針確定**：**eSIMAccess をメインプロバイダ**、**Bappy/OMAX をフォールバック/既存eSIM継続**に。
- ただし切替は **config駆動＋カナリア**（ハードフリップしない）。**本 Phase1 は「Bappy挙動を一切変えずに抽象化」だけ**を行う（＝安全な土台作り）。

## 目的
発行/同期/topup を **`getProvider(name)` 経由**に統一し、Bappy を薄いラッパに包む。**既存テスト（functions 41件）全通過＝挙動不変**を担保。これにより Phase2 で eSIMAccess を**同IFで追加**できる。

## 対象ファイル（実コード確認済み）
| 種別 | ファイル | 変更 |
|---|---|---|
| 新規 | `functions/src/providers/types.ts` | `EsimProvider` IF ＋ `getProvider()` ファクトリ |
| 新規 | `functions/src/providers/bappy.ts` | 既存 `bappy/*`（createLink/getLinkDetail/addTopupPlan）の薄いラッパ |
| 改修 | `functions/src/webhooks.ts`（`fulfillEsim`） | `createLink`/`addTopupPlan` 直呼び → `getProvider(order.provider).createEsim/topup` |
| 改修 | `functions/src/esimRetryService.ts` | 同上（発行/topupリトライ） |
| 改修 | `functions/src/triggers.ts`（`onEsimSyncRequested`） | `getLinkDetail` → `getProvider(link.provider).getEsimDetail` |
| 改修 | `functions/src/callables.ts`（topup checkout） | topup可用プランの取得を provider 経由に（段階的） |
| 型 | `shared/types.ts` | `FsOrder.provider?` / `FsEsimLink.provider?`（後方互換・既定 `"bappy"`） |

## `EsimProvider` インターフェイス（案・両API正規化）
```ts
export type ProviderName = "bappy" | "esimaccess";

export interface CreateEsimParams {
  providerPlanId: string;   // Bappy: bappyPlanId / eSIMAccess: packageCode(or slug)
  orderId: string;
  transactionId: string;    // 冪等キー（eSIMAccess必須。Bappyは未使用でも渡す）
}
export interface EsimDetail {
  providerRef: string;      // Bappy: link uuid / eSIMAccess: esimTranNo（安定ID）
  iccid: string | null;
  activationCode: string | null;   // LPA (ac)
  qrCodeUrl: string | null;
  status: string | null;           // 正規化前の生ステータス
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
  expiryDate: number | null;       // epoch ms（DB-04整合）
}
export interface EsimProvider {
  readonly name: ProviderName;
  createEsim(p: CreateEsimParams): Promise<{ providerRef: string; detail?: EsimDetail }>;
  getEsimDetail(providerRef: string): Promise<EsimDetail>;
  topup(p: { providerRef: string; providerPlanId: string; transactionId: string }): Promise<EsimDetail>;
  cancel?(providerRef: string): Promise<{ ok: boolean }>;   // eSIMAccessのみ（未使用注文=残高返金）
  queryBalance?(): Promise<{ balanceUsd: number }>;         // eSIMAccessのみ
}

export function getProvider(name?: string | null): EsimProvider; // 既定 "bappy"
```

### 正規化マッピング
| 抽象 | Bappy | eSIMAccess |
|---|---|---|
| createEsim | `createLink({bappyPlanId,orderId})`→uuid | `/esim/order`→orderNo → `/esim/query`(orderNo)→esimTranNo/iccid/ac/qr |
| getEsimDetail | `getLinkDetail(uuid)` | `/esim/query`(esimTranNo) |
| topup | `addTopupPlan({identifier,planId})` | `/esim/topup`(esimTranNo,TOPUP_packageCode) |
| cancel | （なし） | `/esim/cancel`(esimTranNo・未使用のみ返金) |
| queryBalance | （なし） | `/balance/query` |
| 期限/残量 | `expiryDate`/`dataRemaining` | `expiredTime`/`totalVolume−orderUsage`（bytes→MB換算） |

> ⚠️ **eSIMAccess は発行が非同期**（order→webhook GOT_RESOURCE→query）。Phase1 では**Bappyのみ実装**なので同期的に扱うが、IFは「createEsim は providerRef を返し、detail は getEsimDetail で確定」する形にして非同期に耐える設計にする。Bappyラッパは createLink 後に getLinkDetail して detail も返せる。

## Phase1 のスコープ（挙動不変）
- **Bappy ラッパだけ実装**。`getProvider("bappy")` は既存 `bappy/*` をそのまま呼ぶ（ロジック移動なし・薄い委譲）。
- 既存の呼び出し箇所を `getProvider(...)` 経由に**置換するのみ**（分岐先は現状 Bappy 固定＝挙動不変）。
- `order.provider` / `esim_link.provider` は**未設定なら `"bappy"` 扱い**（後方互換）。既存注文・既存eSIMは全て Bappy のまま動く。
- **eSIMAccess 実装・plan.provider 切替・カナリアは Phase2 以降**（本設計外）。

## データモデル（後方互換）
- `FsOrder.provider?: "bappy" | "esimaccess" | null`（既定 bappy）。
- `FsEsimLink.provider?: ...`＋汎用参照 `providerRef?`（＝ Bappy は `bappyLinkUuid`、eSIMAccess は `esimTranNo`）。既存 `bappyLinkUuid` は残す（読み取り互換）。
- rules：esim_links は既存どおり Cloud Functions 専用書込。**新フィールド追加のみ・ルール変更は最小**（Phase2でprovider検証を追加する際に別途承認）。

## 影響範囲・リスク
- **functions のみ**（＋ shared 型）。**Bappy挙動は不変**＝リスク小。
- 要承認・functions デプロイはユーザー指示。
- ロールバック：呼び出しを元の直呼びに戻すだけ（ラッパは薄い）。

## テスト／検証計画
- **既存 functions テスト 41件 全通過＝挙動不変の担保**（最重要）。
- 追加：`providers/bappy.ts` が既存 `bappy/*` を正しく委譲するユニット（createEsim→createLink、getEsimDetail→getLinkDetail、topup→addTopupPlan のモック検証）。
- `getProvider(undefined|"bappy")` が Bappy を返す／未知名はエラー。
- client 影響なし（発行フローはサーバ側）。

## 実装フェーズ（この順）
1. `providers/types.ts`（IF＋getProvider）＋ `providers/bappy.ts`（委譲）。
2. `shared/types.ts` に `provider`/`providerRef` 追加（既定bappy）。
3. `fulfillEsim`／`esimRetryService`／`onEsimSyncRequested`／topup を getProvider 経由へ置換。
4. テスト（41件＋新規）→ dev コミット →（指示で）本番デプロイ。
5. → **Phase2**：`providers/esimaccess.ts`（HMAC署名・order/query/topup/cancel/balance）＋ Webhook多層防御＋ plan.provider 切替＋カナリア（別設計）。
