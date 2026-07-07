import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactSection from "@/components/app/ContactSection";

/**
 * ContactPage — 問い合わせフォーム専用の独立ページ（`/contact`）。
 * AIチャット等の外部直リンクから確実・軽量にフォームへ到達させるための入口。
 * フォーム本体は `/app` と同じ ContactSection を再利用（中身は完全同一）。
 * Nav / Footer の「Contact」導線は従来どおり `/app#contact`（サイト内スクロール）で据え置き。
 */
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <main className="flex-1">
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
