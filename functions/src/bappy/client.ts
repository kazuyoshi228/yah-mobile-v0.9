/**
 * server/bappy/client.ts — Bappy API 共通 HTTP ヘルパー
 */

import { getAccessToken, BAPPY_BASE_URL, fetchWithTimeout } from "./auth";
import type { BappyApiResponse, BappyApiError } from "./types";

/** Bappy API へのリクエストを送信し、data フィールドを返す */
export async function bappyFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetchWithTimeout(
    `${BAPPY_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    },
    20000, // 20秒タイムアウト（eSIMプロビジョニングは時間がかかる場合がある）
  );

  const json = (await res.json()) as BappyApiResponse<T> | BappyApiError;

  if (!res.ok || !json.success) {
    const errJson = json as BappyApiError;
    const code = errJson.error?.code ?? String(res.status);
    const msg = errJson.error?.message ?? "Unknown Bappy API error";
    throw new Error(`[Bappy] ${code}: ${msg}`);
  }

  return (json as BappyApiResponse<T>).data;
}

/**
 * Bappy API のステータス文字列を DB スキーマの ENUM にマッピング
 * Bappy: "active" | "suspended" | "inactive"
 * DB:    "active" | "inactive" | "expired" | "provisioning" | "failed"
 */
export function mapBappyStatus(s: string): "active" | "inactive" | "expired" | "provisioning" | "failed" {
  switch (s) {
    case "active":    return "active";
    case "suspended": return "inactive";
    case "inactive":  return "inactive";
    default:          return "inactive";
  }
}
