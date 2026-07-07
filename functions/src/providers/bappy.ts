/**
 * functions/src/providers/bappy.ts — Bappy を EsimProvider に適合させる薄いラッパ（柱2 Phase1）
 *
 * 既存 `bappy/*`（createLink/getLinkDetail/addTopupPlan）へ委譲するだけ。ロジックは持たない。
 * BappyLink/BappyActivation の ISO expiryDate を epoch ms に正規化して返す。
 */
import { createLink, getLinkDetail, addTopupPlan } from "../bappy";
import type { BappyLink } from "../bappy";
import type { EsimProvider, EsimDetail } from "./types";

/** ISO 8601 文字列 → epoch ms。null/不正は null（既存の書込直前変換と同等）。 */
function isoToEpochMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function mapLink(link: BappyLink): EsimDetail {
  return {
    providerRef: link.uuid,
    iccid: link.iccid,
    lpaProfile: link.lpaProfile,
    appleActivationUrl: link.appleActivationUrl,
    androidActivationUrl: link.androidActivationUrl,
    qrCodeUrl: null, // Bappy は QR URL を直接返さない
    status: link.status,
    dataRemainingMb: link.dataRemainingMb,
    dataTotalMb: link.dataTotalMb,
    expiryDate: isoToEpochMs(link.expiryDate),
  };
}

export const bappyProvider: EsimProvider = {
  name: "bappy",

  async createEsim(p) {
    const link = await createLink({ bappyPlanId: p.providerPlanId, orderId: p.orderId });
    return mapLink(link);
  },

  async getEsimDetail(providerRef) {
    const link = await getLinkDetail(providerRef);
    return mapLink(link);
  },

  async topup(p) {
    const a = await addTopupPlan({ identifier: p.providerRef, planId: p.providerPlanId });
    return {
      providerRef: a.uuid,
      expiryDate: isoToEpochMs(a.expiryDate),
      dataRemainingMb: a.dataRemainingMb,
      dataTotalMb: a.dataTotalMb,
    };
  },
  // cancel / queryBalance は Bappy 非対応（未実装）。eSIMAccess で提供。
};
