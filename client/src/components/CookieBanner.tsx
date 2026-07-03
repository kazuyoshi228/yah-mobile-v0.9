import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { loadUmamiIfConsented } from "@/lib/analytics";

const COOKIE_CONSENT_KEY = "yah_cookie_consent";
const COOKIE_CONSENT_VERSION = "1";

type ConsentState = "accepted" | "declined" | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          setConsent(parsed.value);
          return;
        }
      }
      // No valid consent stored — show banner after short delay
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } catch {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const handleAccept = () => {
    const record = { value: "accepted", version: COOKIE_CONSENT_VERSION, ts: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    setConsent("accepted");
    setVisible(false);
    // 同意直後にサードパーティ解析を動的ロード
    loadUmamiIfConsented();
  };

  const handleDecline = () => {
    const record = { value: "declined", version: COOKIE_CONSENT_VERSION, ts: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    setConsent("declined");
    setVisible(false);
  };

  if (!visible || consent !== null) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#D7D7D7] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{
        animation: "slideUp 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards",
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="container max-w-5xl py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <p className="font-sans text-black/60 text-[0.8125rem] leading-[1.6] flex-1">
          We use optional analytics cookies to improve our service. Sign-in is handled securely by Google and does not rely on these cookies.{" "}
          <Link href="/cookie-policy" className="underline hover:text-black transition-colors">
            Cookie Policy
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="font-sans text-[0.8125rem] text-black/50 hover:text-black border-[#D7D7D7] bg-transparent"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="font-sans text-[0.8125rem] bg-black text-white hover:bg-black/80"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
