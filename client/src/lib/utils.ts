import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eSIM のアクティベーション/QR URL に許可するスキーム（クリック型XSSの `javascript:` 等を排除）
const SAFE_URL_SCHEMES = ["https:", "lpa:", "apple-esim:", "data:"];

/**
 * href/src に埋め込む URL のスキームをホワイトリスト検証する。
 * 許可外（javascript: など）や不正な値は undefined を返し、レンダリングを抑止する。
 * 相対パスは許可する。
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  // 相対パス（/... や ./...）はスキームを持たないので許可
  if (/^(\/|\.\/|\.\.\/|#)/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return SAFE_URL_SCHEMES.includes(parsed.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
