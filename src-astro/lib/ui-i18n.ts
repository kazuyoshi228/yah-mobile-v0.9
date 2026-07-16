/**
 * ui-i18n.ts — 公開面(/guides)の「ページchrome」文字列を lang で引く（ビルド時i18n）
 *
 * guide本文は feed.translations[lang] がSSOT。ここはヘッダー/表見出し等の
 * UI文字列のみを言語別に持つ。react-i18next はロードしない（静的・軽量維持）。
 * feedが言語を増やしたら UI に該当langを追加する（未定義langは en にフォールバック）。
 * 対応言語: ja / en / ko / zh-TW / th。
 */
export interface UiStrings {
  navHome: string;
  navBuy: string;
  navPlans: string;
  navFaq: string;
  navChat: string;
  navContact: string;
  signIn: string;
  menu: string;
  plansTitle: string;
  colPlan: string;
  colData: string;
  colValidity: string;
  colPrice: string;
  buy: string;
  buyCta: string;
  faqTitle: string;
  summaryLabel: string;
  ctaHeadline: string;
  ctaButton: string;
  compareTitle: string;
  bestValue: string;
  fieldReportTitle: string;
  fieldReportField: string;
  fieldReportAssumed: string;
  daysUnit: string; // 有効期間の単位（例 ja="日" → "30日"）
  /** langロケールでの表示名（言語切替リンクのラベル用） */
  nativeName: string;
}

export const UI: Record<string, UiStrings> = {
  ja: {
    navHome: "ホーム",
    navBuy: "購入",
    navPlans: "プラン",
    navFaq: "よくある質問",
    navChat: "チャット",
    navContact: "お問い合わせ",
    signIn: "ログイン",
    menu: "メニュー",
    plansTitle: "プランと料金",
    colPlan: "プラン",
    colData: "データ",
    colValidity: "有効期間",
    colPrice: "料金",
    buy: "購入",
    buyCta: "eSIMを購入する",
    faqTitle: "よくある質問",
    summaryLabel: "Summary",
    ctaHeadline: "ChatGPTが使える、日本IPのeSIM。",
    ctaButton: "プランを見る",
    compareTitle: "他社eSIMとの料金比較",
    bestValue: "BEST VALUE",
    fieldReportTitle: "実地レポート",
    fieldReportField: "実測",
    fieldReportAssumed: "編集部の想定・実測前",
    daysUnit: "日",
    nativeName: "日本語",
  },
  en: {
    navHome: "HOME",
    navBuy: "BUY",
    navPlans: "PLANS",
    navFaq: "FAQ",
    navChat: "CHAT",
    navContact: "CONTACT",
    signIn: "Sign in",
    menu: "Menu",
    plansTitle: "Plans & Pricing",
    colPlan: "Plan",
    colData: "Data",
    colValidity: "Validity",
    colPrice: "Price",
    buy: "Buy",
    buyCta: "Get your eSIM",
    faqTitle: "FAQ",
    summaryLabel: "Summary",
    ctaHeadline: "A Japan-IP eSIM that works with ChatGPT.",
    ctaButton: "View plans",
    compareTitle: "How we compare",
    bestValue: "BEST VALUE",
    fieldReportTitle: "Field report",
    fieldReportField: "measured",
    fieldReportAssumed: "editorial estimate (pre-measurement)",
    daysUnit: " days",
    nativeName: "English",
  },
  ko: {
    navHome: "홈",
    navBuy: "구매",
    navPlans: "요금제",
    navFaq: "자주 묻는 질문",
    navChat: "채팅",
    navContact: "문의",
    signIn: "로그인",
    menu: "메뉴",
    plansTitle: "요금제와 가격",
    colPlan: "플랜",
    colData: "데이터",
    colValidity: "유효기간",
    colPrice: "요금",
    buy: "구매",
    buyCta: "eSIM 구매하기",
    faqTitle: "자주 묻는 질문",
    summaryLabel: "Summary",
    ctaHeadline: "ChatGPT가 되는 일본 IP eSIM.",
    ctaButton: "요금제 보기",
    compareTitle: "타사 eSIM과 요금 비교",
    bestValue: "BEST VALUE",
    fieldReportTitle: "현장 리포트",
    fieldReportField: "실측",
    fieldReportAssumed: "편집부 예상(실측 전)",
    daysUnit: "일",
    nativeName: "한국어",
  },
  "zh-TW": {
    navHome: "首頁",
    navBuy: "購買",
    navPlans: "方案",
    navFaq: "常見問題",
    navChat: "線上客服",
    navContact: "聯絡我們",
    signIn: "登入",
    menu: "選單",
    plansTitle: "方案與價格",
    colPlan: "方案",
    colData: "數據",
    colValidity: "有效期",
    colPrice: "價格",
    buy: "購買",
    buyCta: "購買 eSIM",
    faqTitle: "常見問題",
    summaryLabel: "Summary",
    ctaHeadline: "能用 ChatGPT 的日本 IP eSIM。",
    ctaButton: "查看方案",
    compareTitle: "與其他 eSIM 的價格比較",
    bestValue: "BEST VALUE",
    fieldReportTitle: "實地報告",
    fieldReportField: "實測",
    fieldReportAssumed: "編輯部推估（實測前）",
    daysUnit: "天",
    nativeName: "繁體中文",
  },
  th: {
    navHome: "หน้าหลัก",
    navBuy: "ซื้อ",
    navPlans: "แพ็กเกจ",
    navFaq: "คำถามที่พบบ่อย",
    navChat: "แชท",
    navContact: "ติดต่อ",
    signIn: "เข้าสู่ระบบ",
    menu: "เมนู",
    plansTitle: "แพ็กเกจและราคา",
    colPlan: "แพ็กเกจ",
    colData: "ดาต้า",
    colValidity: "อายุการใช้งาน",
    colPrice: "ราคา",
    buy: "ซื้อ",
    buyCta: "ซื้อ eSIM",
    faqTitle: "คำถามที่พบบ่อย",
    summaryLabel: "Summary",
    ctaHeadline: "eSIM IP ญี่ปุ่นที่ใช้ ChatGPT ได้",
    ctaButton: "ดูแพ็กเกจ",
    compareTitle: "เปรียบเทียบราคากับ eSIM อื่น",
    bestValue: "BEST VALUE",
    fieldReportTitle: "รายงานภาคสนาม",
    fieldReportField: "วัดจริง",
    fieldReportAssumed: "ประมาณการโดยกองบรรณาธิการ (ก่อนวัดจริง)",
    daysUnit: " วัน",
    nativeName: "ไทย",
  },
};

export function getUi(lang: string): UiStrings {
  return UI[lang] ?? UI.en;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 料金基準日の言語別表記。confirmedDate="YYYY-MM-DD"。 */
export function formatAsOf(lang: string, confirmedDate?: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(confirmedDate || "");
  if (!m) return null;
  const y = m[1], mo = Number(m[2]), d = Number(m[3]);
  switch (lang) {
    case "ja": return `料金は${y}年${mo}月${d}日時点のものです。`;
    case "ko": return `요금은 ${y}년 ${mo}월 ${d}일 기준입니다.`;
    case "zh-TW": return `價格為 ${y}年${mo}月${d}日 時的資訊。`;
    case "th": return `ราคา ณ วันที่ ${d}/${mo}/${y}`;
    default: return `Prices as of ${MONTHS_EN[mo - 1]} ${d}, ${y}.`;
  }
}

/** 最終更新日の言語別表記（byline用）。ms epoch。UTC基準でビルド環境non依存。 */
export function formatUpdated(lang: string, ms?: number): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  const dt = new Date(ms);
  const y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
  switch (lang) {
    case "ja": return `${y}年${mo}月${d}日 更新`;
    case "ko": return `${y}년 ${mo}월 ${d}일 업데이트`;
    case "zh-TW": return `${y}年${mo}月${d}日 更新`;
    case "th": return `อัปเดต ${d}/${mo}/${y}`;
    default: return `Updated ${MONTHS_EN[mo - 1]} ${d}, ${y}`;
  }
}

/** 競合表の注記（他社料金は公開情報に基づく目安である旨・景表法配慮）。 */
export function formatCompareNote(lang: string, confirmedDate?: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(confirmedDate || "");
  const y = m?.[1], mo = m ? Number(m[2]) : 0, d = m ? Number(m[3]) : 0;
  const dated = !!m;
  switch (lang) {
    case "ja":
      return dated ? `他社の料金は公開情報に基づく${y}年${mo}月${d}日時点の目安です。` : "他社の料金は公開情報に基づく目安です。";
    case "ko":
      return dated ? `타사 요금은 공개 정보 기준 ${y}년 ${mo}월 ${d}일 시점의 예상치입니다.` : "타사 요금은 공개 정보 기준 예상치입니다.";
    case "zh-TW":
      return dated ? `他牌價格為依公開資訊推估之 ${y}年${mo}月${d}日 參考值。` : "他牌價格為依公開資訊推估之參考值。";
    case "th":
      return dated ? `ราคาของเจ้าอื่นเป็นค่าประมาณจากข้อมูลสาธารณะ ณ วันที่ ${d}/${mo}/${y}` : "ราคาของเจ้าอื่นเป็นค่าประมาณจากข้อมูลสาธารณะ";
    default:
      return dated ? `Competitor prices are estimates based on public info as of ${MONTHS_EN[mo - 1]} ${d}, ${y}.` : "Competitor prices are estimates based on public information.";
  }
}
