/**
 * functions/src/providers/esimaccess.ts — eSIMAccess を EsimProvider に適合（柱2 Phase2）
 *
 * order は非同期（order→profile割当）。createEsim は order 後に query をポーリングして
 * ICCID/QR が揃うまで待つ（最大~35秒。200010=割当中）。Bappy の同期 createLink と揃える。
 */
import * as logger from "firebase-functions/logger";
import { esimaccessPost } from "../esimaccess/client";
import type { EsimProvider, EsimDetail } from "./types";

interface RawEsim {
  esimTranNo: string;
  iccid?: string | null;
  ac?: string | null;
  qrCodeUrl?: string | null;
  smdpStatus?: string | null;
  esimStatus?: string | null;
  expiredTime?: string | null;
  totalVolume?: number | null;
  orderUsage?: number | null;
}

function bytesToMb(b?: number | null): number | null {
  return b == null ? null : b / (1024 * 1024);
}
function isoToEpochMs(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}
function appleUrl(ac?: string | null): string | null {
  return ac ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(ac)}` : null;
}
function androidUrl(ac?: string | null): string | null {
  return ac ? `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(ac)}` : null;
}

/** eSIMAccess の esimStatus → esim_links.status ENUM に写像。 */
function mapStatus(esimStatus?: string | null): "active" | "inactive" | "expired" | "provisioning" | "failed" {
  switch (esimStatus) {
    case "IN_USE":
    case "USED_UP":
    case "GOT_RESOURCE":
      return "active";
    case "USED_EXPIRED":
    case "UNUSED_EXPIRED":
      return "expired";
    case "CANCEL":
    case "REVOKE":
    case "REVOKED":
      return "failed";
    case "SUSPENDED":
      return "inactive";
    case "CREATE":
    case "PAYING":
    case "PAID":
    case "GETTING_RESOURCE":
      return "provisioning";
    default:
      return "active";
  }
}

/** 端末で有効化（使用開始）済みか。ESIM_STATUS の IN_USE ＝使用開始（api_notes §ライフサイクル）。 */
function isActivatedStatus(esimStatus?: string | null): boolean {
  return esimStatus === "IN_USE" || esimStatus === "USED_UP" || esimStatus === "USED_EXPIRED";
}

function mapEsim(e: RawEsim): EsimDetail {
  const total = e.totalVolume ?? null;
  const used = e.orderUsage ?? 0;
  const remaining = total == null ? null : total - used;
  return {
    providerRef: e.esimTranNo,
    iccid: e.iccid ?? null,
    lpaProfile: e.ac ?? null, // LPA アクティベーションコード
    appleActivationUrl: appleUrl(e.ac),
    androidActivationUrl: androidUrl(e.ac),
    qrCodeUrl: e.qrCodeUrl ?? null,
    status: mapStatus(e.esimStatus),
    dataRemainingMb: bytesToMb(remaining),
    dataTotalMb: bytesToMb(total),
    expiryDate: isoToEpochMs(e.expiredTime),
    activated: isActivatedStatus(e.esimStatus),
  };
}

async function queryByOrderNo(orderNo: string): Promise<RawEsim[]> {
  const obj = await esimaccessPost<{ esimList: RawEsim[] }>("/esim/query", {
    orderNo,
    pager: { pageNum: 1, pageSize: 50 },
  });
  return obj?.esimList ?? [];
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const esimaccessProvider: EsimProvider = {
  name: "esimaccess",

  async createEsim(p) {
    const orderObj = await esimaccessPost<{ orderNo: string }>("/esim/order", {
      transactionId: p.transactionId,
      packageInfoList: [{ packageCode: p.providerPlanId, count: 1 }],
    });
    const orderNo = orderObj.orderNo;

    // 非同期割当を最大~35秒ポーリング（200010=割当中、または esimList 未充足）。
    const deadline = Date.now() + 35000;
    let attempt = 0;
    while (Date.now() < deadline) {
      try {
        const list = await queryByOrderNo(orderNo);
        const e = list.find((x) => x.iccid);
        if (e) return mapEsim(e);
      } catch (err) {
        logger.info(`[eSIMAccess] createEsim polling ${orderNo} (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
      }
      attempt++;
      await delay(3000);
    }
    throw new Error(`[eSIMAccess] createEsim timeout: profile not ready for order ${orderNo}`);
  },

  async getEsimDetail(providerRef) {
    const obj = await esimaccessPost<{ esimList: RawEsim[] }>("/esim/query", {
      esimTranNo: providerRef,
      pager: { pageNum: 1, pageSize: 5 },
    });
    const e = (obj?.esimList ?? [])[0];
    if (!e) throw new Error(`[eSIMAccess] getEsimDetail: not found ${providerRef}`);
    return mapEsim(e);
  },

  async topup(p) {
    const obj = await esimaccessPost<{
      topUpEsimTranNo?: string;
      expiredTime?: string | null;
      totalVolume?: number | null;
      orderUsage?: number | null;
    }>("/esim/topup", {
      esimTranNo: p.providerRef,
      packageCode: p.providerPlanId,
      transactionId: p.transactionId,
      ...(p.periodNum ? { periodNum: p.periodNum } : {}),
    });
    const total = obj.totalVolume ?? null;
    const used = obj.orderUsage ?? 0;
    return {
      providerRef: obj.topUpEsimTranNo ?? p.providerRef,
      expiryDate: isoToEpochMs(obj.expiredTime),
      dataRemainingMb: total == null ? null : bytesToMb(total - used),
      dataTotalMb: bytesToMb(total),
    };
  },

  async cancel(providerRef) {
    await esimaccessPost<Record<string, never>>("/esim/cancel", { esimTranNo: providerRef });
    return { ok: true };
  },

  async queryBalance() {
    const obj = await esimaccessPost<{ balance: number }>("/balance/query", {});
    return { balanceUsd: (obj.balance ?? 0) / 10000 }; // ×10000 表現
  },
};
