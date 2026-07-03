import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * 404 Not Found — yah.mobile ブランドデザイン
 * アイコンSVG（logo_others_RGB_slur）をインラインで埋め込み
 * 外部ファイル・ストレージ依存なし
 */
export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white px-6">
      {/* Brand icon — inline SVG, no external dependency */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 566.93 566.93"
        className="w-20 h-20 mb-10 opacity-90"
        aria-hidden="true"
      >
        <rect width="566.93" height="566.93" fill="#000" />
        <path
          fill="#fff"
          d="M147.14,404.09l-19.59-4.23c8.84-40.93,46.85-121.28,115.36-174.88,66.73-52.21,145.23-65.9,196.45-61.3l-1.79,19.96c-16.37-1.47-102.11-5.62-182.31,57.13-64.32,50.32-99.9,125.25-108.13,163.33Z"
        />
      </svg>

      {/* 404 */}
      <p className="text-[6rem] leading-none font-bold tracking-tighter text-white/10 select-none mb-2">
        404
      </p>

      <h1 className="text-xl font-medium tracking-wide mb-3">Page Not Found</h1>

      <p className="text-sm text-white/50 text-center mb-10 max-w-xs leading-relaxed">
        Sorry, the page you are looking for doesn't exist.
        <br />
        It may have been moved or deleted.
      </p>

      <Button
        onClick={() => setLocation("/")}
        className="bg-white text-black hover:bg-white/90 px-8 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-200"
      >
        Go Home
      </Button>

      {/* Footer tagline */}
      <p className="mt-16 text-xs text-white/20 tracking-widest uppercase">
        Log in, Step out.
      </p>
    </div>
  );
}
