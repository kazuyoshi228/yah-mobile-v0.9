/**
 * Unauthorized.tsx — アクセス制限 / 認証エラーページ
 * - ホワイトリストに含まれないユーザーのアクセス制限
 * - OAuth認証エラー時のフレンドリーなエラー表示
 */
import { useLocation } from "wouter";

export default function Unauthorized() {
  const [location] = useLocation();

  // URLパラメータからエラー情報を取得
  const params = new URLSearchParams(window.location.search);
  const errorType = params.get("error") ?? params.get("reason");
  const errorMessage = params.get("message");
  const returnPath = params.get("returnPath") ?? "/app";

  const isAuthError = errorType === "auth_failed";

  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "'National2', system-ui, sans-serif" }}
    >
      {/* Brand icon — inline SVG, no external dependency */}
      <div className="mb-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 566.93 566.93"
          className="h-10 w-10 opacity-80"
          aria-label="yah.mobile"
          role="img"
        >
          <rect width="566.93" height="566.93" fill="#000" />
          <path
            fill="#fff"
            d="M147.14,404.09l-19.59-4.23c8.84-40.93,46.85-121.28,115.36-174.88,66.73-52.21,145.23-65.9,196.45-61.3l-1.79,19.96c-16.37-1.47-102.11-5.62-182.31,57.13-64.32,50.32-99.9,125.25-108.13,163.33Z"
          />
        </svg>
      </div>

      {/* メインコンテンツ */}
      <div className="text-center max-w-md">
        {isAuthError ? (
          <>
            {/* 認証エラー表示 */}
            <p
              className="text-white/30 mb-6 tracking-[0.3em] uppercase"
              style={{ fontSize: "0.6875rem", fontWeight: 500 }}
            >
              Sign-in Error
            </p>

            <h1
              className="text-white mb-5"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              Sign-in failed.
            </h1>

            {errorMessage && (
              <p
                className="text-white/50 leading-relaxed mb-8"
                style={{ fontSize: "0.9375rem", lineHeight: 1.8 }}
              >
                {errorMessage}
              </p>
            )}

            <div className="w-8 h-px bg-white/20 mx-auto mb-8" />

            {/* 再試行ボタン */}
            <a
              href={'/login?redirect=' + encodeURIComponent(returnPath)}
              className="inline-block bg-white text-black px-8 py-3.5 hover:bg-white/90 transition-colors duration-200 active:scale-[0.97] text-xs font-medium tracking-[0.18em] uppercase"
            >
              Try Again
            </a>

            <p className="mt-6 text-white/25" style={{ fontSize: "0.8125rem" }}>
              If the problem persists,{" "}
              <a
                href="mailto:info@yah.mobi"
                className="text-white/50 hover:text-white underline underline-offset-4 transition-colors duration-200"
              >
                contact support
              </a>
            </p>
          </>
        ) : (
          <>
            {/* Under Construction 表示 */}
            <p
              className="text-white/30 mb-6 tracking-[0.3em] uppercase"
              style={{ fontSize: "0.6875rem", fontWeight: 500 }}
            >
              Under Construction
            </p>

            <h1
              className="text-white mb-5"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              Coming Soon.
            </h1>

            <p
              className="text-white/40 leading-relaxed mb-10"
              style={{ fontSize: "0.9375rem", lineHeight: 1.8 }}
            >
              yah.mobile is currently available to invited users only.
              <br />
              We're working hard to open to everyone soon.
            </p>

            <div className="w-8 h-px bg-white/20 mx-auto mb-10" />

            <p
              className="text-white/25"
              style={{ fontSize: "0.8125rem" }}
            >
              Interested in early access?{" "}
              <a
                href="mailto:info@yah.mobi"
                className="text-white/50 hover:text-white underline underline-offset-4 transition-colors duration-200"
              >
                Contact us
              </a>
            </p>
          </>
        )}
      </div>

      {/* フッター */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p
          className="text-white/15"
          style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}
        >
          © 2025 yah.mobile
        </p>
      </div>
    </div>
  );
}
