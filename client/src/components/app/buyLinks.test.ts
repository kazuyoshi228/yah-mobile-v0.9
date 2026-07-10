import { describe, it, expect } from "vitest";
import { BUY_LINK_PLANS, resolveBuySlug, buySlugForGb, buyPageMeta } from "./buyLinks";

describe("buyLinks — 共有用購入リンクの slug 解決", () => {
  it("全6プランの slug が定義されている", () => {
    expect(Object.keys(BUY_LINK_PLANS).sort()).toEqual(["10gb", "1gb", "20gb", "3gb", "50gb", "5gb"]);
  });

  it("既知の slug を解決する（大文字小文字許容）", () => {
    expect(resolveBuySlug("10gb")).toEqual({ gb: "10GB", days: 30 });
    expect(resolveBuySlug("10GB")).toEqual({ gb: "10GB", days: 30 });
    expect(resolveBuySlug("1gb")).toEqual({ gb: "1GB", days: 7 });
  });

  it("未知の slug は null（/app 通常表示へフォールバック）", () => {
    expect(resolveBuySlug("99gb")).toBeNull();
    expect(resolveBuySlug("")).toBeNull();
    expect(resolveBuySlug(undefined)).toBeNull();
  });

  it("dataGb → slug 変換", () => {
    expect(buySlugForGb(10)).toBe("10gb");
    expect(buySlugForGb(1)).toBe("1gb");
  });

  it("SEO メタ：タイトルに容量と最長日数・価格は含めない", () => {
    const meta = buyPageMeta("10gb")!;
    expect(meta.title).toContain("10GB");
    expect(meta.title).toContain("30 days");
    expect(meta.title).not.toMatch(/¥|\d,\d{3}/);
    expect(meta.canonical).toBe("https://yah.mobi/buy/10gb");
    expect(buyPageMeta("99gb")).toBeNull();
  });
});
