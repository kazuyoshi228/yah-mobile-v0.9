import { describe, it, expect, vi, beforeEach } from "vitest";

// P1: Bappyプロバイダが既存 bappy/* に委譲し、EsimDetail/TopupResult に正規化することを検証。
// （expiryDate ISO→epoch ms・qrCodeUrl=null・getProvider の分岐）

const { createLinkMock, getLinkDetailMock, addTopupPlanMock } = vi.hoisted(() => ({
  createLinkMock: vi.fn(),
  getLinkDetailMock: vi.fn(),
  addTopupPlanMock: vi.fn(),
}));

vi.mock("../bappy", () => ({
  createLink: (...a: unknown[]) => createLinkMock(...a),
  getLinkDetail: (...a: unknown[]) => getLinkDetailMock(...a),
  addTopupPlan: (...a: unknown[]) => addTopupPlanMock(...a),
}));

import { bappyProvider } from "./bappy";
import { getProvider } from "./types";

describe("bappyProvider — EsimProvider 委譲・正規化（P1）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createEsim: createLink に委譲し EsimDetail に正規化（qr=null / expiry=null）", async () => {
    createLinkMock.mockResolvedValue({
      uuid: "u1", iccid: "8931", lpaProfile: "LPA:1$x$y",
      appleActivationUrl: "apple", androidActivationUrl: "android",
      status: "active", dataRemainingMb: 0, dataTotalMb: 0, expiryDate: null,
    });
    const d = await bappyProvider.createEsim({ providerPlanId: "plan1", orderId: "o1", transactionId: "o1" });
    expect(createLinkMock).toHaveBeenCalledWith({ bappyPlanId: "plan1", orderId: "o1" });
    expect(d).toEqual({
      providerRef: "u1", iccid: "8931", lpaProfile: "LPA:1$x$y",
      appleActivationUrl: "apple", androidActivationUrl: "android", qrCodeUrl: null,
      status: "active", dataRemainingMb: 0, dataTotalMb: 0, expiryDate: null,
    });
  });

  it("getEsimDetail: getLinkDetail に委譲し ISO expiryDate を epoch ms に変換", async () => {
    getLinkDetailMock.mockResolvedValue({
      uuid: "u2", iccid: "i", lpaProfile: "lpa",
      appleActivationUrl: null, androidActivationUrl: null,
      status: "active", dataRemainingMb: 500, dataTotalMb: 1000,
      expiryDate: "2026-07-13T07:00:00.000Z",
    });
    const d = await bappyProvider.getEsimDetail("u2");
    expect(getLinkDetailMock).toHaveBeenCalledWith("u2");
    expect(d.providerRef).toBe("u2");
    expect(d.dataRemainingMb).toBe(500);
    expect(d.expiryDate).toBe(Date.parse("2026-07-13T07:00:00.000Z"));
  });

  it("topup: addTopupPlan に委譲し TopupResult に正規化", async () => {
    addTopupPlanMock.mockResolvedValue({
      uuid: "act1", planId: "p", dataRemainingMb: 1024, dataTotalMb: 1024,
      expiryDate: "2026-08-01T00:00:00.000Z", status: "active",
    });
    const r = await bappyProvider.topup({ providerRef: "u3", providerPlanId: "TOPUP_x", transactionId: "t" });
    expect(addTopupPlanMock).toHaveBeenCalledWith({ identifier: "u3", planId: "TOPUP_x" });
    expect(r.providerRef).toBe("act1");
    expect(r.expiryDate).toBe(Date.parse("2026-08-01T00:00:00.000Z"));
    expect(r.dataRemainingMb).toBe(1024);
  });

  it("getProvider: 未設定/'bappy' は bappyProvider、'esimaccess' は未実装で例外", () => {
    expect(getProvider()).toBe(bappyProvider);
    expect(getProvider("bappy")).toBe(bappyProvider);
    expect(getProvider(null)).toBe(bappyProvider);
    expect(() => getProvider("esimaccess")).toThrow(/not implemented/);
  });
});
