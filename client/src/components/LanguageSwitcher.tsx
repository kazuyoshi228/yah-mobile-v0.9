import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0];

  const changeLanguage = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    setOpen(false);

    let path = window.location.pathname;
    for (const lang of SUPPORTED_LANGUAGES) {
      if (path.startsWith(`/${lang.code}/`) || path === `/${lang.code}`) {
        path = path.substring(lang.code.length + 1);
        if (!path.startsWith("/")) path = "/" + path;
        break;
      }
    }
    
    if (code !== "en") {
      path = `/${code}${path === "/" ? "" : path}`;
    }
    
    if (path === "") path = "/";

    window.location.href = path + window.location.search + window.location.hash;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-label flex items-center gap-1.5 px-3 py-1.5 border border-[#D7D7D7] hover:border-black transition-colors duration-200"
        aria-label="Change language"
      >
        <span>{current.flag}</span>
        <span className="text-black/70">{current.code.toUpperCase()}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`text-black/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#D7D7D7] shadow-sm z-50 min-w-[160px]">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code as SupportedLanguage)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7F7] transition-colors text-left ${
                lang.code === i18n.language ? "bg-[#F7F7F7]" : ""
              }`}
            >
              <span>{lang.flag}</span>
              <span className="font-sans text-black text-[0.875rem]">
                {lang.label}
              </span>
              {lang.code === i18n.language && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto text-black">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
