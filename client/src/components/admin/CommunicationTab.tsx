/**
 * CommunicationTab.tsx — /admin コミュニケーションタブ
 *
 * ユーザーへのメール通知フロー設計書 + 実装状況の確認
 *
 * 通知タイミング:
 * 1. 購入直後（Stripe決済完了）— eSIM準備中の案内
 * 2. リトライ中（1回目失敗後）— 少し時間がかかっている旨
 * 3. 最終失敗（3回リトライ全失敗）— サポート確認中の案内
 * 4. 復旧成功（リトライ成功）— eSIM発行完了の案内
 */
import { labelStyle, bodyStyle } from "./types";

// ─── 実装ステータスバッジ ─────────────────────────────────────────────────────
function ImplBadge({ status }: { status: "done" | "pending" | "partial" }) {
  const map = {
    done: { cls: "bg-green-100 text-green-800 border-green-200", label: "実装済み" },
    partial: { cls: "bg-amber-100 text-amber-800 border-amber-200", label: "一部実装" },
    pending: { cls: "bg-gray-100 text-gray-500 border-gray-200", label: "未実装" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[0.65rem] font-medium ${cls}`} style={labelStyle}>
      {label}
    </span>
  );
}

// ─── チャネルバッジ ────────────────────────────────────────────────────────────
function ChannelBadge({ channel }: { channel: "in-app" | "email" | "owner" | "omax" }) {
  const map = {
    "in-app": "bg-blue-100 text-blue-800 border-blue-200",
    email: "bg-purple-100 text-purple-800 border-purple-200",
    owner: "bg-orange-100 text-orange-800 border-orange-200",
    omax: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[0.65rem] font-medium ${map[channel]}`} style={labelStyle}>
      {channel}
    </span>
  );
}

// ─── 通知フロー定義 ────────────────────────────────────────────────────────────
const NOTIFICATION_STAGES = [
  {
    step: "1",
    timing: "購入直後",
    trigger: "Stripe checkout.session.completed",
    color: "border-blue-200 bg-blue-50",
    stepColor: "bg-blue-600",
    subject: "【yah.mobile】eSIMの準備を開始しました",
    bodyPreview: "ご購入ありがとうございます。eSIMの発行処理を開始しました。通常数分以内にマイページでご確認いただけます。",
    channels: [
      { channel: "in-app" as const, status: "done" as const, note: "createNotification() 実装済み" },
      { channel: "email" as const, status: "done" as const, note: "Webhook fulfilled 後に送信" },
    ],
  },
  {
    step: "2",
    timing: "リトライ中",
    trigger: "1回目リトライ失敗後（約5分後）",
    color: "border-amber-200 bg-amber-50",
    stepColor: "bg-amber-500",
    subject: "【yah.mobile】eSIMの発行に少し時間がかかっています",
    bodyPreview: "eSIMの発行処理に通常より時間がかかっています。引き続き自動で処理中です。完了次第お知らせします。",
    channels: [
      { channel: "in-app" as const, status: "done" as const, note: "handleProvisioningFailure() で送信" },
      { channel: "email" as const, status: "done" as const, note: "esimRetryService.ts で送信" },
    ],
  },
  {
    step: "3",
    timing: "最終失敗",
    trigger: "3回リトライ全て失敗後",
    color: "border-red-200 bg-red-50",
    stepColor: "bg-red-600",
    subject: "【yah.mobile】eSIM発行に問題が発生しました",
    bodyPreview: "eSIMの発行に問題が発生しました。サポートチームが確認中です。ご不便をおかけして申し訳ございません。返金対応も可能です。",
    channels: [
      { channel: "in-app" as const, status: "done" as const, note: "processPendingRetries() 最終失敗時に送信" },
      { channel: "email" as const, status: "done" as const, note: "esimRetryService.ts で送信" },
      { channel: "owner" as const, status: "done" as const, note: "notifyOwner() で通知" },
      { channel: "omax" as const, status: "partial" as const, note: "OMAX_TECH_EMAIL 設定後に有効" },
    ],
  },
  {
    step: "4",
    timing: "復旧成功",
    trigger: "リトライ成功時",
    color: "border-green-200 bg-green-50",
    stepColor: "bg-green-600",
    subject: "【yah.mobile】eSIMの発行が完了しました",
    bodyPreview: "お待たせしました。eSIMの発行が完了しました。マイページからQRコードをご確認いただき、設定を行ってください。",
    channels: [
      { channel: "in-app" as const, status: "done" as const, note: "processPendingRetries() 成功時に送信" },
      { channel: "email" as const, status: "done" as const, note: "esimRetryService.ts で送信" },
    ],
  },
];

// ─── メール設定情報 ────────────────────────────────────────────────────────────
const EMAIL_CONFIG = [
  { key: "送信方法", value: "Gmail MCP（BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY）" },
  { key: "送信元", value: "Firebase（Google）認証アカウント経由のシステムメール" },
  { key: "ユーザーメール取得", value: "getUserById(userId) → users.email（DBから取得）" },
  { key: "管理者メール", value: "kazuyoshi.yamada@bonfire.co.jp" },
  { key: "OMAXメール", value: "OMAX_TECH_EMAIL 環境変数（未設定・確認待ち）" },
  { key: "外部サービス", value: "なし（Resend等は使用しない）" },
];

// ─── 実装ファイル一覧 ──────────────────────────────────────────────────────────
const IMPL_FILES = [
  {
    file: "server/esimRetryService.ts",
    role: "リトライ中・最終失敗・復旧成功のユーザーメール送信",
    status: "done" as const,
  },
  {
    file: "server/_core/index.ts",
    role: "購入直後（Stripe Webhook fulfilled）のユーザーメール送信",
    status: "done" as const,
  },
  {
    file: "server/mailer.ts",
    role: "Gmail MCPメール送信ヘルパー（sendUserEmail）",
    status: "done" as const,
  },
  {
    file: "server/db.ts",
    role: "getUserById() — ユーザーメールアドレス取得",
    status: "done" as const,
  },
];

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export function CommunicationTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#F8F8F8]">
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40 mb-1" style={labelStyle}>
          Communication
        </h2>
        <p className="text-sm text-black/60" style={bodyStyle}>
          eSIM発行フローにおけるユーザーへのメール通知設計と実装状況
        </p>
      </div>

      {/* 通知フロー概要カード */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 mb-6">
        <h3 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40 mb-4" style={labelStyle}>
          通知フロー（4段階）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={bodyStyle}>
          {NOTIFICATION_STAGES.map((stage) => (
            <div key={stage.step} className={`rounded-lg border p-4 ${stage.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 ${stage.stepColor}`}>
                  {stage.step}
                </span>
                <span className="font-semibold text-sm text-black">{stage.timing}</span>
              </div>
              <p className="text-xs text-black/50 mb-2 leading-relaxed">{stage.trigger}</p>
              <div className="flex flex-wrap gap-1">
                {stage.channels.map((ch) => (
                  <ChannelBadge key={ch.channel} channel={ch.channel} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 各段階の詳細 */}
      <div className="space-y-4 mb-6">
        {NOTIFICATION_STAGES.map((stage) => (
          <div key={stage.step} className="bg-white border border-[#E0E0E0] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 ${stage.stepColor}`}>
                {stage.step}
              </span>
              <div>
                <h3 className="font-semibold text-sm text-black" style={bodyStyle}>{stage.timing}</h3>
                <p className="text-xs text-black/40" style={bodyStyle}>{stage.trigger}</p>
              </div>
            </div>

            {/* メール内容プレビュー */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-[0.65rem] text-black/40 mb-1" style={labelStyle}>件名</p>
              <p className="text-sm font-medium text-black mb-3" style={bodyStyle}>{stage.subject}</p>
              <p className="text-[0.65rem] text-black/40 mb-1" style={labelStyle}>本文（抜粋）</p>
              <p className="text-xs text-black/60 leading-relaxed" style={bodyStyle}>{stage.bodyPreview}</p>
            </div>

            {/* チャネル別実装状況 */}
            <div className="space-y-2">
              <p className="text-[0.65rem] text-black/40" style={labelStyle}>通知チャネル</p>
              {stage.channels.map((ch) => (
                <div key={ch.channel} className="flex items-center gap-3 text-xs" style={bodyStyle}>
                  <ChannelBadge channel={ch.channel} />
                  <ImplBadge status={ch.status} />
                  <span className="text-black/50">{ch.note}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* メール設定情報 */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 mb-6">
        <h3 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40 mb-4" style={labelStyle}>
          メール送信設定
        </h3>
        <div className="space-y-2" style={bodyStyle}>
          {EMAIL_CONFIG.map((item) => (
            <div key={item.key} className="flex gap-4 text-xs py-2 border-b border-gray-100 last:border-0">
              <span className="text-black/40 w-36 flex-shrink-0">{item.key}</span>
              <span className="text-black/70">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800 leading-relaxed" style={bodyStyle}>
            <strong>OMAX通知メール：</strong>
            OMAXの技術担当者のメールアドレスが確認でき次第、<code className="bg-amber-100 px-1 rounded">OMAX_TECH_EMAIL</code> 環境変数に設定してください。
            設定後は、eSIM発行失敗時（初回）と最終失敗時（3回リトライ後）に自動でメール通知されます。
          </p>
        </div>
      </div>

      {/* 実装ファイル一覧 */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-6">
        <h3 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40 mb-4" style={labelStyle}>
          実装ファイル
        </h3>
        <div className="space-y-2" style={bodyStyle}>
          {IMPL_FILES.map((item) => (
            <div key={item.file} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <ImplBadge status={item.status} />
              <div>
                <code className="text-xs font-mono text-black/80 block mb-0.5">{item.file}</code>
                <p className="text-xs text-black/50">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
