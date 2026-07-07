/**
 * functions/src/providers/types.ts — eSIMプロバイダ抽象（柱2 Phase1）
 *
 * 発行/同期/topup を単一IFに束ね、Bappy と eSIMAccess を同じ形で呼べるようにする。
 * Phase1 は Bappy のみ実装（挙動不変）。Phase2 で eSIMAccess を追加する。
 * `EsimDetail` は両プロバイダが埋められる正規化フィールド（expiryDate は epoch ms）。
 */
export type ProviderName = "esimaccess" | "bappy";

export interface CreateEsimParams {
  providerPlanId: string; // Bappy: bappyPlanId / eSIMAccess: packageCode(or slug)
  orderId: string;
  transactionId: string; // 冪等キー（eSIMAccessで必須。Bappyは未使用でも渡す）
}

export interface TopupParams {
  providerRef: string; // 発行元eSIMの安定ID（Bappy: link uuid / eSIMAccess: esimTranNo）
  providerPlanId: string; // TOPUPパッケージ
  transactionId: string;
  periodNum?: number; // デイパス延長日数（eSIMAccess）
}

/** eSIM の正規化詳細。expiryDate は epoch ms（プロバイダ側で変換済み）。 */
export interface EsimDetail {
  providerRef: string; // Bappy: link uuid / eSIMAccess: esimTranNo
  iccid: string | null;
  lpaProfile: string | null; // LPA アクティベーション文字列（Bappy: lpaProfile / eSIMAccess: ac）
  appleActivationUrl: string | null;
  androidActivationUrl: string | null;
  qrCodeUrl: string | null; // eSIMAccess: qrCodeUrl（Bappy: null）
  status: string | null; // esim_links.status ENUM 互換の生ステータス
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
  expiryDate: number | null; // epoch ms
}

/** topup 実行結果（残り期間・データの更新）。expiryDate は epoch ms。 */
export interface TopupResult {
  providerRef: string; // topup activation 識別（Bappy: activation uuid / eSIMAccess: topUpEsimTranNo）
  expiryDate: number | null;
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
}

export interface EsimProvider {
  readonly name: ProviderName;
  createEsim(p: CreateEsimParams): Promise<EsimDetail>;
  getEsimDetail(providerRef: string): Promise<EsimDetail>;
  topup(p: TopupParams): Promise<TopupResult>;
  cancel?(providerRef: string): Promise<{ ok: boolean }>; // eSIMAccessのみ（未使用=残高返金）
  queryBalance?(): Promise<{ balanceUsd: number }>; // eSIMAccessのみ
}

import { bappyProvider } from "./bappy";

/**
 * order/esim_link の provider で分岐。未設定/未知は "bappy"（既存互換）。
 * Phase2 で "esimaccess" を追加する。
 */
export function getProvider(name?: string | null): EsimProvider {
  switch (name) {
    case "esimaccess":
      // Phase2 で esimaccessProvider を返す。現状は未実装のため Bappy にフォールバックしない
      // よう、明示的にエラーにする（誤って esimaccess 指定の注文が Bappy で発行されるのを防ぐ）。
      throw new Error("[getProvider] esimaccess provider is not implemented yet (Phase2)");
    case "bappy":
    default:
      return bappyProvider;
  }
}
