/**
 * functions/src/esimaccess/auth.ts — eSIMAccess 認証（HMAC-SHA256 署名）
 *
 * write系は署名で認証する（read も同方式で統一）。
 * 署名: signData = RT-Timestamp + RT-RequestID + RT-AccessCode + RequestBody
 *       RT-Signature = HMAC_SHA256(signData, SecretKey).toLowerCase()（hex）
 * ※ RT-Timestamp はミリ秒（公式フィールド定義に準拠）。
 */
import { createHmac } from "node:crypto";
// シークレット宣言は secrets.ts に一元化（P1-1）。既存importer互換のため再エクスポート。
import { esimAccessCode, esimSecretKey } from "../secrets";
export { esimAccessCode, esimSecretKey };

export function isEsimAccessConfigured(): boolean {
  try {
    return !!esimAccessCode.value() && !!esimSecretKey.value();
  } catch {
    return false;
  }
}

export interface SignedHeaders {
  "RT-AccessCode": string;
  "RT-RequestID": string;
  "RT-Timestamp": string;
  "RT-Signature": string;
  "Content-Type": string;
}

/**
 * HMAC-SHA256 署名ヘッダを生成する（純粋関数・テスト可能なよう now/requestId を受け取る）。
 */
export function buildSignedHeaders(body: string, now: number, requestId: string): SignedHeaders {
  const accessCode = esimAccessCode.value();
  const secretKey = esimSecretKey.value();
  const timestamp = String(now);
  const signData = timestamp + requestId + accessCode + body;
  const signature = createHmac("sha256", secretKey).update(signData).digest("hex").toLowerCase();
  return {
    "RT-AccessCode": accessCode,
    "RT-RequestID": requestId,
    "RT-Timestamp": timestamp,
    "RT-Signature": signature,
    "Content-Type": "application/json",
  };
}
