import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import FadeIn from "./FadeIn";
import { serif } from "./types";

type LegalRow = [string, string];

function LegalTable({ rows }: { rows: LegalRow[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map(([lbl, val]) => (
          <tr key={lbl} className="border-b border-[#D7D7D7]">
            <td className="font-sans font-medium text-black/40 text-[0.75rem] tracking-[0.04em] py-4 pr-8 align-top whitespace-nowrap w-52">{lbl}</td>
            <td className="font-sans text-black/70 text-[0.875rem] leading-[1.75] py-4 whitespace-pre-line">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const LEGAL_SECTIONS = [
  {
    id: "tokushoho",
    title: "Specified Commercial Transactions Act",
    content: (
      <LegalTable rows={[
        ["Service Name / サービス名", "yah.mobile"],
        ["Domain / ドメイン", "yah.mobi"],
        ["Operator / 運営会社", "Bonfire Inc.（株式会社ボンファイア）"],
        ["Representative / 代表者", "Kazuyoshi Yamada（山田和義）"],
        ["Address / 所在地", "〒810-0011 福岡県福岡市中央区高砂1-18-7\n1-18-7 Takasago, Chuo-ku, Fukuoka-shi, Fukuoka, Japan 810-0011"],
        ["Email / メールアドレス", "contact@yah.mobi"],
        ["Phone / 電話番号", "非公開（請求があり次第、遅滞なく開示いたします）\nNot disclosed publicly (will be provided promptly upon request)"],
        ["Inquiries / お問い合わせ", "サイト内チャット / お問い合わせフォーム\nIn-site chat / Contact form"],
        ["Pricing / 販売価格", "各プランページに表示（税込）\nDisplayed on each plan page (tax included)"],
        ["Payment Methods / 支払方法", "クレジットカード / Apple Pay / Google Pay（Stripe経由）\nCredit card / Apple Pay / Google Pay (via Stripe)"],
        ["Payment Timing / 支払時期", "注文確定と同時に課金\nCharged immediately upon order confirmation"],
        ["Delivery / 提供時期", "決済完了後、QRコードをメールにて即時送付\nImmediately after payment — QR code sent by email"],
        ["Returns & Cancellations / 返品・キャンセル", "eSIMはデジタルコンテンツに該当するため、決済完了後は原則として返金・キャンセルはできません。\n購入完了前に同意画面にてご確認いただいた上でご購入いただいております。\nご不明な点は購入前にサポートチャットまたはお問い合わせフォームよりお気軽にお問い合わせください。\n\neSIM is a digital product (intangible content). Once payment is completed, refunds and cancellations are not available.\nYour explicit consent is obtained at the time of purchase, as required under Japan's Act on Specified Commercial Transactions (Article 15-3).\nFor any questions, please contact us via support chat or the contact form before purchasing."],
      ]} />
    ),
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    content: (
      <div>
        <LegalTable rows={[
          ["Data Collected", "Name, email address, payment information (managed by Stripe), device information"],
          ["Purpose of Use", "eSIM delivery, customer support, service improvement, legal compliance"],
          ["Third-Party Disclosure", "Network carrier (eSIM issuance), Stripe (payment processing), as required by law"],
          ["Retention Period", "Transaction records: statutory retention period (7 years). Other data: 1 year after service termination."],
          ["Governing Law", "Laws of Japan"],
          ["APPI", "Compliant with Japan's Act on the Protection of Personal Information (APPI)"],
          ["GDPR", "GDPR-compliant for data processing of EU residents"],
          ["UK GDPR", "UK GDPR-compliant for data processing of UK residents"],
        ]} />
        <div className="pt-4 pb-2">
          <a href="/privacy" className="font-sans text-[0.8125rem] text-black/50 hover:text-black underline underline-offset-2 transition-colors">
            View full Privacy Policy →
          </a>
        </div>
      </div>
    ),
  },
  {
    id: "terms",
    title: "Terms of Service",
    content: (
      <div>
        <div className="space-y-0">
          {[
            { title: "Scope of Service", body: "yah.mobile operates as a reseller of a licensed eSIM platform, handling eSIM sales and delivery. Network quality and connectivity depend on the underlying carrier network conditions." },
            { title: "Prohibited Activities", body: "Unauthorized use, resale, spam transmission, sending or receiving illegal content, and unauthorized access to the service are strictly prohibited." },
            { title: "Disclaimer", body: "yah.mobile is not liable for damages arising from network outages, network quality issues, or device incompatibility." },
            { title: "Governing Law & Jurisdiction", body: "These Terms are governed by the laws of Japan. The Fukuoka District Court shall have exclusive jurisdiction as the court of first instance." },
          ].map((item) => (
            <div key={item.title} className="flex flex-col sm:flex-row gap-6 py-6 border-b border-[#D7D7D7]">
              <p className="font-sans font-medium text-black/40 text-[0.75rem] tracking-[0.04em] sm:w-52 shrink-0">{item.title}</p>
              <p className="font-sans text-black/70 text-[0.875rem] leading-[1.75]">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="pt-4 pb-2">
          <a href="/terms" className="font-sans text-[0.8125rem] text-black/50 hover:text-black underline underline-offset-2 transition-colors">
            View full Terms of Service →
          </a>
        </div>
      </div>
    ),
  },
  {
    id: "network",
    title: "Network Provider Agreement",
    content: (
      <LegalTable rows={[
        ["Agreement Type", "Reseller Agreement"],
        ["Regulation", "Compliant with applicable telecommunications regulations"],
        ["Data Protection", "UK GDPR compliant / Data Processing Agreement (DPA) in place"],
      ]} />
    ),
  },
];

export default function LegalSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section id="legal" className="bg-[#F5F5F5] border-t border-[#D7D7D7] py-16 lg:py-24">
      <div className="container max-w-3xl">
        <FadeIn>
          <p className="text-label text-black/35 mb-3">Legal</p>
          <h2 className="text-black mb-2" style={serif("clamp(1.75rem, 3.5vw, 2.75rem)")}>Legal Information.</h2>
        </FadeIn>
        <div className="border-t border-[#D7D7D7]">
          {LEGAL_SECTIONS.map((sec, i) => {
            const isOpen = openId === sec.id;
            return (
              <FadeIn key={sec.id} delay={i * 0.05}>
                <div className="border-b border-[#D7D7D7]">
                  <button
                    className="w-full flex items-center justify-between py-5 text-left group"
                    onClick={() => setOpenId(isOpen ? null : sec.id)}
                  >
                    <span className="font-sans text-black/85 text-[1rem]">{sec.title}</span>
                    <ChevronDown
                      className="shrink-0 ml-4 text-black/40 transition-transform duration-300 w-[18px] h-[18px]"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 overflow-x-auto">{sec.content}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
