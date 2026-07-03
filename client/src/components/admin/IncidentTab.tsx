/**
 * IncidentTab.tsx — /admin 障害タブ
 *
 * 表示内容:
 * 1. 障害対応フロー（設計思想の説明）
 * 2. 未解決の障害一覧
 * 3. リトライジョブ一覧
 * 4. 手動リトライボタン
 */
import { useState } from "react";
import { useCallableMutation, useInvalidate, CALLABLE } from "@/lib/callable";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { toast } from "sonner";
import { labelStyle, bodyStyle } from "./types";

// ─── ステータスバッジ ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    retrying: "bg-blue-100 text-blue-800 border-blue-200",
    succeeded: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    open: "bg-red-100 text-red-800 border-red-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    notified_owner: "bg-amber-100 text-amber-800 border-amber-200",
    notified_omax: "bg-blue-100 text-blue-800 border-blue-200",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[0.65rem] font-medium ${cls}`} style={labelStyle}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

// ─── フロー説明カード ─────────────────────────────────────────────────────────
function IncidentFlowCard() {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 mb-6">
      <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40 mb-4" style={labelStyle}>
        障害対応フロー
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={bodyStyle}>
        {[
          {
            step: "1",
            title: "eSIM発行失敗",
            desc: "Stripe決済完了後、Bappy APIでeSIM発行が失敗した場合に自動検知",
            color: "border-red-200 bg-red-50",
          },
          {
            step: "2",
            title: "自動リトライ（3回）",
            desc: "5分間隔で最大3回リトライ。Bappy側が復旧すれば自動解決",
            color: "border-amber-200 bg-amber-50",
          },
          {
            step: "3",
            title: "OMAXに自動通知",
            desc: "失敗時にOMAX技術担当者へ即時メール通知（設定後に有効）",
            color: "border-blue-200 bg-blue-50",
          },
          {
            step: "4",
            title: "Yoshiさんに通知",
            desc: "3回リトライ後も失敗した場合のみ通知。返金・手動対応を判断",
            color: "border-green-200 bg-green-50",
          },
        ].map((item) => (
          <div key={item.step} className={`rounded-lg border p-4 ${item.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                {item.step}
              </span>
              <span className="font-semibold text-sm text-black">{item.title}</span>
            </div>
            <p className="text-xs text-black/60 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-black/50" style={bodyStyle}>
          <strong className="text-black/70">OMAX通知メール：</strong>
          OMAXの技術担当者のメールアドレスが確認でき次第、自動通知に追加します。
          それまでは3回リトライ失敗時にYoshiさんへのみ通知されます。
        </p>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export function IncidentTab() {
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);

  const db = getFirebaseDb();
  const openIncidentsQuery = query(collection(db, "incident_logs"), where("status", "==", "open"), orderBy("createdAt", "desc"));
  const incidentLogsQuery = query(collection(db, "incident_logs"), orderBy("createdAt", "desc"), firestoreLimit(showAllLogs ? 200 : 50));
  const retryJobsQuery = query(collection(db, "esim_retry_jobs"), orderBy("createdAt", "desc"), firestoreLimit(showAllJobs ? 200 : 50));
  const pendingCountQuery = query(collection(db, "esim_retry_jobs"), where("status", "in", ["pending", "retrying"]));

  const openIncidents = useFirestoreCollection(() => openIncidentsQuery, [showAllLogs, showAllJobs]);
  const incidentLogs = useFirestoreCollection(() => incidentLogsQuery, [showAllLogs]);
  const retryJobs = useFirestoreCollection(() => retryJobsQuery, [showAllJobs]);
  const pendingJobs = useFirestoreCollection(() => pendingCountQuery, []);
  const pendingCount = { data: { count: pendingJobs.data?.length ?? 0 } };

  const invalidateQuery = useInvalidate();

  const handleResolve = async (id: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "incident_logs", id), {
        status: "resolved",
        resolvedAt: Date.now(),
        resolvedBy: "admin",
        updatedAt: Date.now()
      });
      toast.success("障害を解決済みにしました");
    } catch (err: any) {
      toast.error(`エラー: ${err.message}`);
    }
  };

  const runRetryNow = useCallableMutation<any, any>(CALLABLE.incidentRunRetryNow, {
    onSuccess: (result: any) => {
      toast.success(`リトライ完了 — 処理: ${result.processed}件, 成功: ${result.succeeded}件, 失敗: ${result.failed}件`);
    },
    onError: (err) => toast.error(`リトライ失敗: ${err.message}`),
  });

  const formatDate = (d: Date | number | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#F7F7F5]">
      {/* ─── フロー説明 ─── */}
      <IncidentFlowCard />

      {/* ─── 未解決の障害 ─── */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40" style={labelStyle}>
            未解決の障害
            {openIncidents.data && openIncidents.data.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[0.6rem]">
                {openIncidents.data.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {pendingCount.data && pendingCount.data.count > 0 && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                リトライ待ち: {pendingCount.data.count}件
              </span>
            )}
            <button
              onClick={() => runRetryNow.mutate(undefined as any)}
              disabled={runRetryNow.isPending}
              className="text-[0.6875rem] px-3 py-1.5 bg-black text-white rounded hover:bg-black/80 disabled:opacity-50 transition-colors"
              style={labelStyle}
            >
              {runRetryNow.isPending ? "実行中..." : "今すぐリトライ"}
            </button>
          </div>
        </div>
        <div className="divide-y divide-[#F0F0F0]">
          {openIncidents.isLoading ? (
            <div className="px-6 py-8 text-center text-sm text-black/40">読み込み中...</div>
          ) : !openIncidents.data || openIncidents.data.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-black/40" style={bodyStyle}>未解決の障害はありません</p>
            </div>
          ) : (
            (openIncidents.data as any[]).map((incident: any) => (
              <div key={incident.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={incident.status} />
                    <span className="text-xs font-medium text-black" style={bodyStyle}>{incident.type}</span>
                    <span className="text-xs text-black/40">注文 #{incident.orderId}</span>
                  </div>
                  <p className="text-xs text-black/60 truncate" style={bodyStyle}>{incident.title}</p>
                  {incident.detail && (
                    <p className="text-[0.65rem] text-red-600 mt-1 font-mono truncate">{incident.detail}</p>
                  )}
                  <p className="text-[0.65rem] text-black/30 mt-1">{formatDate(incident.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleResolve(incident.id)}
                  className="text-[0.65rem] px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-black/50 whitespace-nowrap flex-shrink-0 transition-colors"
                  style={labelStyle}
                >
                  解決済みにする
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── リトライジョブ ─── */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40" style={labelStyle}>
            リトライジョブ履歴
          </h2>
          {retryJobs.data && retryJobs.data.length >= 50 && (
            <button onClick={() => setShowAllJobs(!showAllJobs)} className="text-xs text-black/40 hover:text-black">
              {showAllJobs ? "最新50件に絞る" : "全件表示"}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={bodyStyle}>
            <thead>
              <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
                {["注文ID", "試行回数", "ステータス", "最終試行", "次回試行", "エラー"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[0.6rem] font-medium text-black/40 uppercase tracking-wider whitespace-nowrap" style={labelStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {retryJobs.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-black/40">読み込み中...</td></tr>
              ) : !retryJobs.data || retryJobs.data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-black/40">リトライジョブはありません</td></tr>
              ) : (
                (retryJobs.data as any[]).map((job: any) => (
                  <tr key={job.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono text-black/70">#{job.orderId}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${job.retryCount >= 3 ? "text-red-600" : "text-amber-600"}`}>
                        {job.retryCount} / {job.maxRetries}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-black/50 whitespace-nowrap">{formatDate(job.updatedAt)}</td>
                    <td className="px-4 py-3 text-black/50 whitespace-nowrap">{job.nextRetryAt ? formatDate(new Date(job.nextRetryAt)) : "—"}</td>
                    <td className="px-4 py-3 text-red-600 font-mono text-[0.65rem] max-w-[200px] truncate">
                      {job.lastError ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 障害ログ ─── */}
      <div className="bg-white border border-[#E0E0E0] rounded-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-black/40" style={labelStyle}>
            障害ログ
          </h2>
          {incidentLogs.data && incidentLogs.data.length >= 50 && (
            <button onClick={() => setShowAllLogs(!showAllLogs)} className="text-xs text-black/40 hover:text-black">
              {showAllLogs ? "最新50件に絞る" : "全件表示"}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={bodyStyle}>
            <thead>
              <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
                {["日時", "種別", "注文ID", "ステータス", "メッセージ", "通知"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[0.6rem] font-medium text-black/40 uppercase tracking-wider whitespace-nowrap" style={labelStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {incidentLogs.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-black/40">読み込み中...</td></tr>
              ) : !incidentLogs.data || incidentLogs.data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-black/40">障害ログはありません</td></tr>
              ) : (
                (incidentLogs.data as any[]).map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-black/50 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-black/70">{log.type}</td>
                    <td className="px-4 py-3 font-mono text-black/70">#{log.orderId}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-black/60 max-w-[200px] truncate">{log.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {log.notifiedOwner && <span className="text-[0.6rem] bg-green-50 text-green-700 border border-green-200 rounded px-1">Owner</span>}
                        {log.notifiedOmax && <span className="text-[0.6rem] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1">OMAX</span>}
                        {!log.notifiedOwner && !log.notifiedOmax && <span className="text-black/30">—</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
