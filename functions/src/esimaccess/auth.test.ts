import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";

// defineSecret をモックして固定値を返す（value() が name に応じた固定値）。
vi.mock("firebase-functions/params", () => ({
  defineSecret: (name: string) => ({
    value: () => (name === "ESIMACCESS_ACCESS_CODE" ? "AC-TEST" : "SK-TEST"),
  }),
}));

import { buildSignedHeaders } from "./auth";

describe("eSIMAccess buildSignedHeaders — HMAC-SHA256 署名（P2）", () => {
  it("signData=TS+ReqID+AccessCode+Body の HMAC(hex,lowercase) を生成", () => {
    const body = JSON.stringify({ hello: "world" });
    const now = 1751000000000;
    const requestId = "4ce9d9cdac9e4e17b3a2c66c358c1ce2";

    const h = buildSignedHeaders(body, now, requestId);

    expect(h["RT-AccessCode"]).toBe("AC-TEST");
    expect(h["RT-RequestID"]).toBe(requestId);
    expect(h["RT-Timestamp"]).toBe("1751000000000");
    expect(h["Content-Type"]).toBe("application/json");

    const expected = createHmac("sha256", "SK-TEST")
      .update("1751000000000" + requestId + "AC-TEST" + body)
      .digest("hex")
      .toLowerCase();
    expect(h["RT-Signature"]).toBe(expected);
    expect(h["RT-Signature"]).toMatch(/^[0-9a-f]{64}$/);
  });
});
