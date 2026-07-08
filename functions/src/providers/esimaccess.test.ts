import { describe, it, expect, vi, beforeEach } from "vitest";

// P2: eSIMAccess プロバイダの正規化（order→query／getEsimDetail／topup／balance）を検証。
// HTTPクライアントをモックし、レスポンス→EsimDetail/TopupResult 写像を確認。

vi.mock("firebase-functions/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock("../esimaccess/client", () => ({
  esimaccessPost: (...a: unknown[]) => postMock(...a),
  EsimAccessError: class EsimAccessError extends Error {},
}));

import { esimaccessProvider } from "./esimaccess";

const GB5 = 5 * 1024 * 1024 * 1024; // 5 GiB bytes

describe("esimaccessProvider — 正規化（P2）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createEsim: /esim/order → /esim/query をポーリングし EsimDetail に正規化", async () => {
    postMock.mockImplementation(async (path: string) => {
      if (path === "/esim/order") return { orderNo: "B123" };
      if (path === "/esim/query")
        return {
          esimList: [
            {
              esimTranNo: "ET1", iccid: "8931", ac: "LPA:1$smdp$mid", qrCodeUrl: "https://p.qrsim.net/a.png",
              esimStatus: "GOT_RESOURCE", expiredTime: "2026-08-01T00:00:00.000Z",
              totalVolume: GB5, orderUsage: 0,
            },
          ],
        };
      return {};
    });

    const d = await esimaccessProvider.createEsim({ providerPlanId: "JP_5_30", orderId: "o1", transactionId: "o1" });
    expect(postMock).toHaveBeenCalledWith("/esim/order", { transactionId: "o1", packageInfoList: [{ packageCode: "JP_5_30", count: 1 }] });
    expect(d.providerRef).toBe("ET1");
    expect(d.iccid).toBe("8931");
    expect(d.lpaProfile).toBe("LPA:1$smdp$mid");
    expect(d.appleActivationUrl).toContain("esimsetup.apple.com/esim_qrcode_provisioning?carddata=");
    expect(d.qrCodeUrl).toBe("https://p.qrsim.net/a.png");
    expect(d.dataTotalMb).toBe(5120);
    expect(d.dataRemainingMb).toBe(5120);
    expect(d.expiryDate).toBe(Date.parse("2026-08-01T00:00:00.000Z"));
    expect(d.status).toBe("active");
  });

  it("getEsimDetail: esimTranNo 照会→残量=total-usage を MB 換算", async () => {
    postMock.mockResolvedValue({
      esimList: [{ esimTranNo: "ET2", iccid: "i", ac: "lpa", esimStatus: "IN_USE", expiredTime: null, totalVolume: GB5, orderUsage: 1024 * 1024 * 1024 }],
    });
    const d = await esimaccessProvider.getEsimDetail("ET2");
    expect(postMock).toHaveBeenCalledWith("/esim/query", { esimTranNo: "ET2", pager: { pageNum: 1, pageSize: 5 } });
    expect(d.dataTotalMb).toBe(5120);
    expect(d.dataRemainingMb).toBe(4096); // 5120 - 1024
    expect(d.expiryDate).toBeNull();
    expect(d.status).toBe("active");
  });

  it("topup: TopupResult に正規化（expiry epoch / providerRef=topUpEsimTranNo）", async () => {
    postMock.mockResolvedValue({
      transactionId: "t", iccid: "i", topUpEsimTranNo: "TU1",
      expiredTime: "2026-09-07T17:01:37+0000", totalVolume: 7 * 1024 * 1024 * 1024, orderUsage: 0,
    });
    const r = await esimaccessProvider.topup({ providerRef: "ET2", providerPlanId: "TOPUP_JC172", transactionId: "t" });
    expect(postMock).toHaveBeenCalledWith("/esim/topup", { esimTranNo: "ET2", packageCode: "TOPUP_JC172", transactionId: "t" });
    expect(r.providerRef).toBe("TU1");
    expect(r.dataTotalMb).toBe(7168);
    expect(r.expiryDate).toBe(Date.parse("2026-09-07T17:01:37+0000"));
  });

  it("queryBalance: balance(×10000) → USD", async () => {
    postMock.mockResolvedValue({ balance: 940000 });
    const b = await esimaccessProvider.queryBalance!();
    expect(b.balanceUsd).toBe(94);
  });
});
