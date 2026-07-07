/**
 * functions/src/esimaccess/client.ts — eSIMAccess HTTP クライアント
 * 署名付き POST。共通レスポンス { success, errorCode, errorMsg, obj } を検証して obj を返す。
 */
import { randomUUID } from "node:crypto";
import { buildSignedHeaders } from "./auth";

const BASE_URL = "https://api.esimaccess.com/api/v1/open";

export interface EsimAccessEnvelope<T> {
  success: boolean;
  errorCode: string | null;
  errorMsg: string | null;
  obj: T | null;
}

/** エラーコードを保持する例外（呼び出し側でポーリング等の分岐に使う。例: 200010=割当中）。 */
export class EsimAccessError extends Error {
  constructor(public errorCode: string | null, message: string) {
    super(message);
    this.name = "EsimAccessError";
  }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** 署名付き POST。success=false はエラーコード付き例外を投げる。 */
export async function esimaccessPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const bodyStr = JSON.stringify(body ?? {});
  const headers = buildSignedHeaders(bodyStr, Date.now(), randomUUID());

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers as unknown as Record<string, string>,
    body: bodyStr,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EsimAccessError(null, `[eSIMAccess] HTTP ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as EsimAccessEnvelope<T>;
  if (!json.success) {
    throw new EsimAccessError(json.errorCode, `[eSIMAccess] ${path} failed: ${json.errorCode} ${json.errorMsg ?? ""}`);
  }
  return json.obj as T;
}
