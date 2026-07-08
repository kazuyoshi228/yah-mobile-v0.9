import { describe, it, expect, vi, beforeEach } from "vitest";

// db.collection("system_config").doc("provider_health").get() をモックする。
const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("./db", () => ({
  db: {
    collection: () => ({ doc: () => ({ get: getMock }) }),
  },
}));
vi.mock("firebase-functions/logger", () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }));

import { assertProviderAvailable } from "./salesStopGuard";

const snap = (data: unknown) => ({ exists: data != null, data: () => data });

describe("assertProviderAvailable — 販売停止ガード（柱2 §5）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("status='down' のプロバイダは購入を弾く（unavailable）", async () => {
    getMock.mockResolvedValue(snap({ esimaccess: { status: "down" } }));
    await expect(assertProviderAvailable("esimaccess")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("status='ok' は通す", async () => {
    getMock.mockResolvedValue(snap({ esimaccess: { status: "ok" } }));
    await expect(assertProviderAvailable("esimaccess")).resolves.toBeUndefined();
  });

  it("ドキュメント無し/未設定は通す（誤って止めない）", async () => {
    getMock.mockResolvedValue(snap(null));
    await expect(assertProviderAvailable("esimaccess")).resolves.toBeUndefined();
  });

  it("別プロバイダが down でも対象プロバイダが ok なら通す", async () => {
    getMock.mockResolvedValue(snap({ bappy: { status: "down" }, esimaccess: { status: "ok" } }));
    await expect(assertProviderAvailable("esimaccess")).resolves.toBeUndefined();
  });
});
