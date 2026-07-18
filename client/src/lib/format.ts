/**
 * lib/format.ts — 表示フォーマットの共通ユーティリティ（P4-2）
 */

/** JPY金額の表示（例: ¥1,800）。金額不明はダッシュ。 */
export function formatYen(amount: number | null | undefined, fallback = "—"): string {
  if (amount == null) return fallback;
  return `¥${amount.toLocaleString()}`;
}

/**
 * epoch ms / Firestore Timestamp風 {seconds} を日本語の日時文字列へ。
 * OrdersTab / RefundsTab に重複していた formatTimestamp を集約（挙動同一）。
 */
export function formatTimestampJa(
  ts: number | { seconds: number } | null | undefined,
  opts: { withSeconds?: boolean } = {},
): string {
  if (!ts) return "—";
  const ms = typeof ts === "object" && "seconds" in ts ? ts.seconds * 1000 : ts;
  return new Date(ms).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(opts.withSeconds ? { second: "2-digit" as const } : {}),
  });
}

/**
 * createdAt 等の型ゆらぎをミリ秒に正規化する。
 * 現行データは number だが、旧経路のドキュメントに Firestore Timestamp 型が実在し、
 * (a) new Date(Timestamp) が Invalid Date になる
 * (b) Firestore の型順序（number < Timestamp）で orderBy の並びが崩れる
 * の2つの表示バグを起こす（docs/design_esim_visibility_fix.md）。
 */
export function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  const ts = v as { toMillis?: () => number } | null | undefined;
  if (ts && typeof ts.toMillis === "function") return ts.toMillis();
  const t = v ? new Date(v as string | Date).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}
