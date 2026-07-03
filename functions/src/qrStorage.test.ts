/**
 * qrStorage.test.ts — QR コード生成 → Firebase Storage 保存のテスト
 *
 * vi.mock はファイル先頭にホイストされるため、
 * factory 内では vi.fn() のみ使用し、変数参照を避ける。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// NOTE: vi.mock はホイストされるため factory 内でトップレベル変数を参照できない。
// 各モック関数は vi.fn() で直接定義し、テスト内で spyOn / mockImplementation で制御する。

vi.mock("qrcode", () => ({
  toBuffer: vi.fn(),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(() => ({
      name: "yah-mobile-test.appspot.com",
      file: vi.fn(() => ({
        save: vi.fn().mockResolvedValue(undefined),
        makePublic: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { generateAndStoreQrCode } from "./qrStorage";
import * as QRCode from "qrcode";
import { getStorage } from "firebase-admin/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildStorageMock(overrides?: {
  saveFn?: ReturnType<typeof vi.fn>;
  makePublicFn?: ReturnType<typeof vi.fn>;
}) {
  const saveFn = overrides?.saveFn ?? vi.fn().mockResolvedValue(undefined);
  const makePublicFn =
    overrides?.makePublicFn ?? vi.fn().mockResolvedValue(undefined);
  const fileFn = vi.fn().mockReturnValue({ save: saveFn, makePublic: makePublicFn });
  const bucketFn = vi.fn().mockReturnValue({
    name: "yah-mobile-test.appspot.com",
    file: fileFn,
  });
  (getStorage as ReturnType<typeof vi.fn>).mockReturnValue({ bucket: bucketFn });
  return { saveFn, makePublicFn, fileFn, bucketFn };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("generateAndStoreQrCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: toBuffer は PNG バッファを返す
    (QRCode.toBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(
      Buffer.from("fake-png-data")
    );
  });

  it("正常系: LPA プロファイルから PNG バッファを生成し Storage に保存して公開 URL を返す", async () => {
    const { saveFn, makePublicFn, fileFn } = buildStorageMock();
    const orderId = "order-123";
    const lpaProfile = "LPA:1$test.example.com$ABCDEF1234567890";

    const result = await generateAndStoreQrCode(orderId, lpaProfile);

    // QRCode.toBuffer が LPA プロファイルで呼ばれたか
    expect(QRCode.toBuffer).toHaveBeenCalledWith(lpaProfile, {
      type: "png",
      errorCorrectionLevel: "M",
      width: 512,
      margin: 2,
    });

    // Storage の正しいパスにファイルが作成されたか
    expect(fileFn).toHaveBeenCalledWith(`qrcodes/${orderId}.png`);

    // PNG バッファが正しいメタデータで保存されたか
    expect(saveFn).toHaveBeenCalledWith(Buffer.from("fake-png-data"), {
      metadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      },
    });

    // 正しい公開 URL が返されたか
    expect(result).toBe(
      `gs://yah-mobile-test.appspot.com/qrcodes/${orderId}.png`
    );
  });

  it("異常系: QRCode.toBuffer が失敗した場合は null を返す（例外を投げない）", async () => {
    const { saveFn } = buildStorageMock();
    (QRCode.toBuffer as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("QR generation failed")
    );

    const result = await generateAndStoreQrCode("order-456", "LPA:1$fail.example.com$XYZ");

    expect(result).toBeNull();
    // Storage への保存は呼ばれていないこと
    expect(saveFn).not.toHaveBeenCalled();
  });

  it("異常系: Storage への保存が失敗した場合は null を返す（例外を投げない）", async () => {
    const { saveFn } = buildStorageMock({
      saveFn: vi.fn().mockRejectedValue(new Error("Storage upload failed")),
    });

    const result = await generateAndStoreQrCode("order-789", "LPA:1$test.example.com$ZZZZZ");

    expect(result).toBeNull();

  });

  it("ファイルパスが orderId を含む正しい形式になっている", async () => {
    const { fileFn } = buildStorageMock();
    const orderId = "my-special-order-2026";

    await generateAndStoreQrCode(orderId, "LPA:1$test.example.com$BBBBB");

    expect(fileFn).toHaveBeenCalledWith(`qrcodes/${orderId}.png`);
  });
});
