import { describe, it, expect, vi, beforeEach } from "vitest";

// executeRefund の §8 cancel 連携（eSIMAccess の未有効化 eSIM を先に cancel＝残高返金）を検証。
vi.mock("firebase-functions/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const getOrderById = vi.fn();
const updateOrder = vi.fn().mockResolvedValue(undefined);
const createIncidentLog = vi.fn().mockResolvedValue(undefined);
const getEsimLinkByOrderId = vi.fn();
vi.mock("./db", () => ({
  db: {},
  getOrderById: (...a: unknown[]) => getOrderById(...a),
  updateOrder: (...a: unknown[]) => updateOrder(...a),
  createIncidentLog: (...a: unknown[]) => createIncidentLog(...a),
  getEsimLinkByOrderId: (...a: unknown[]) => getEsimLinkByOrderId(...a),
}));

const refundsCreate = vi.fn().mockResolvedValue({ id: "re_1" });
vi.mock("./stripe", () => ({ stripeClient: { refunds: { create: (...a: unknown[]) => refundsCreate(...a) } } }));
vi.mock("./adapters/notify", () => ({ notifyOwner: vi.fn().mockResolvedValue(undefined) }));

const cancelMock = vi.fn();
vi.mock("./providers/esimaccess", () => ({ esimaccessProvider: { cancel: (...a: unknown[]) => cancelMock(...a) } }));

import { executeRefund } from "./refund";

const baseOrder = (over: Record<string, unknown> = {}) => ({
  id: "o1", userId: "u1", status: "pending_retry", refundStatus: null,
  stripePaymentIntentId: "pi_1", provider: "esimaccess", ...over,
});

describe("executeRefund — §8 eSIMAccess cancel 連携", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateOrder.mockResolvedValue(undefined);
    refundsCreate.mockResolvedValue({ id: "re_1" });
  });

  it("provider=esimaccess かつ esim_link あり → cancel(providerRef) 後に Stripe 返金", async () => {
    getOrderById.mockResolvedValue(baseOrder());
    getEsimLinkByOrderId.mockResolvedValue({ providerRef: "ET1" });
    cancelMock.mockResolvedValue({ ok: true });

    const r = await executeRefund("o1", "system_failure");
    expect(r.ok).toBe(true);
    expect(cancelMock).toHaveBeenCalledWith("ET1");
    expect(refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("provider=bappy は cancel を呼ばず Stripe 返金のみ", async () => {
    getOrderById.mockResolvedValue(baseOrder({ provider: "bappy" }));

    const r = await executeRefund("o1", "manual");
    expect(r.ok).toBe(true);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(getEsimLinkByOrderId).not.toHaveBeenCalled();
    expect(refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("cancel が失敗しても Stripe 返金は続行（best-effort）", async () => {
    getOrderById.mockResolvedValue(baseOrder());
    getEsimLinkByOrderId.mockResolvedValue({ providerRef: "ET1" });
    cancelMock.mockRejectedValue(new Error("already used"));

    const r = await executeRefund("o1", "system_failure");
    expect(r.ok).toBe(true);
    expect(refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("既に返金済みは cancel も Stripe も呼ばない（冪等）", async () => {
    getOrderById.mockResolvedValue(baseOrder({ refundStatus: "refunded" }));

    const r = await executeRefund("o1", "manual");
    expect(r.ok).toBe(true);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  });
});
