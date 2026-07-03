/**
 * server/bappy/types.ts — Bappy API 型定義（外部公開 + 内部）
 */

// ─── 外部公開型 ───────────────────────────────────────────────────────────────

/** eSIM Link（createLink / getLinkDetail の戻り値） */
export interface BappyLink {
  uuid: string;
  iccid: string;
  lpaProfile: string;
  appleActivationUrl: string | null;
  androidActivationUrl: string | null;
  /** DBスキーマ esim_links.status の ENUM に合わせる */
  status: "active" | "inactive" | "expired" | "provisioning" | "failed";
  dataRemainingMb: number;
  dataTotalMb: number;
  expiryDate: string | null; // ISO 8601 or null
}

/** アクティベーション（addTopupPlan の戻り値） */
export interface BappyActivation {
  uuid: string;
  planId: string;
  dataRemainingMb: number;
  dataTotalMb: number;
  expiryDate: string | null;
  status: "active" | "expired";
}

/** トップアッププラン */
export interface BappyPlan {
  id: string;
  name: string;
  dataGb: number;
  validityDays: number;
  priceUsd: number;
  sponsorProfile: string;
  description?: string;
}

// ─── 内部型（APIレスポンス） ──────────────────────────────────────────────────

export interface BappyApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { timestamp: string; response_time_ms?: number };
  message?: string;
}

export interface BappyApiError {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  meta?: { timestamp: string };
}

export interface RawLinkDetail {
  id: string;
  name: string | null;
  iccid: string;
  status: string;
  created_at: string;
  lpa_profile: string;
  apple_activation_url: string | null;
  android_activation_url: string | null;
  msisdn: string | null;
  data_used_mb: number;
  data_remaining_mb: number;
  activations: Array<{
    id: string;
    plan_id: string;
    plan_name: string;
    status: string;
    activation_date: string;
    data_used_mb: number;
    data_remaining_mb: number;
    expiry_date: string | null;
    coverage_countries: string[];
  }>;
}

export interface RawCreateLinkResponse {
  id: string;
  name: string | null;
  iccid: string;
  msisdn: string | null;
  lpa_profile: string;
  activation_url: string | null;
  amount_charged: string;
  currency: string;
  created_at: string;
}

export interface RawTopupPlan {
  id: number | string;
  name: string;
  partner_cost: string;
  currency: string;
  data_gb: number;
  validity_days: number;
  coverage_type: string;
  coverage: {
    countries?: string[];
    total_countries?: number;
    total_operators?: number;
  };
  sponsor_profiles?: Array<{ id: string; name: string; color: string }>;
}

export interface RawPlansPage {
  data: RawTopupPlan[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}
