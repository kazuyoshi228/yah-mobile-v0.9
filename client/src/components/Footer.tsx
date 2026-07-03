/*
 * Footer.tsx — yah.mobile Global Footer
 * Brand: Black bg, white text — dark section for contrast
 * Style: Minimal, editorial, large typography
 */
import { useTranslation } from "react-i18next";
import { YahLogo } from "@/components/YahLogo";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-black text-white">
      <div className="container py-16 lg:py-20">
        {/* Top row */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 pb-12 border-b border-white/10">
          {/* Brand */}
          <div>
            <a href="/app">
              <YahLogo variant="light" className="h-9 lg:h-11 w-auto mb-3" />
            </a>
            <p className="font-sans text-white/50 max-w-xs text-[0.8125rem] leading-[1.8]">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-4">
            <a href="/terms" className="text-label text-white/40 hover:text-white transition-colors duration-200">
              {t("footer.terms")}
            </a>
            <a href="/privacy" className="text-label text-white/40 hover:text-white transition-colors duration-200">
              {t("footer.privacy")}
            </a>
            <a href="/app#contact" className="text-label text-white/40 hover:text-white transition-colors duration-200">
              {t("footer.contact")}
            </a>
          </nav>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8">
          <p className="font-sans text-white/25 text-[0.75rem] tracking-[0.05em]">
            © {new Date().getFullYear()} Bonfire Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
