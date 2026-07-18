/**
 * useSectionViews — LP のセクション到達を GA4 `view_section` として送る。
 * （docs/design_section_analytics.md）
 *
 * - 到達判定: rootMargin でビューポート下端を 25% 削り、セクション上端が画面の
 *   下 1/4 より上に入った時点で「到達」とする。threshold 方式と違い、ビューポート
 *   何枚分もある長いセクション（モバイルの plans / faq 等）でも必ず発火する。
 * - 各セクション pageview につき 1 回のみ（発火後 unobserve）。
 * - セクションは lazy import で DOM 出現が遅れるため、全部見つかるまで 500ms
 *   間隔で再探索する。
 */
import { useEffect } from "react";
import { ga4Event } from "@/lib/ga4";

/** DOM id → GA4 の section パラメータ値 */
const SECTIONS: Record<string, string> = {
  plans: "plans",
  "price-comparison": "compare",
  compatibility: "compatibility",
  faq: "faq",
  chat: "chat",
  contact: "contact",
};

const SECTION_COUNT = Object.keys(SECTIONS).length;

export function useSectionViews(): void {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const fired = new Set<string>();
    const observed = new Set<string>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const section = SECTIONS[e.target.id];
          if (!e.isIntersecting || !section || fired.has(section)) continue;
          fired.add(section);
          io.unobserve(e.target);
          ga4Event("view_section", { section });
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    );

    const observeAvailable = (): boolean => {
      for (const id of Object.keys(SECTIONS)) {
        if (observed.has(id)) continue;
        const el = document.getElementById(id);
        if (el) {
          observed.add(id);
          io.observe(el);
        }
      }
      return observed.size === SECTION_COUNT;
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    if (!observeAvailable()) {
      timer = setInterval(() => {
        if (observeAvailable() && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, 500);
    }

    return () => {
      if (timer) clearInterval(timer);
      io.disconnect();
    };
  }, []);
}
