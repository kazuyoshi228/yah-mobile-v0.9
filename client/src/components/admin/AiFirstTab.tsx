/**
 * admin/AiFirstTab.tsx — AI First分析タブ (BaaS First)
 */
import { useCallableMutation, CALLABLE } from "@/lib/callable";
import { Period, PERIOD_OPTIONS } from "./types";
import { useState, useEffect, useMemo } from "react";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const PERIOD_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

function periodSinceMs(period: string): number {
  const hours = PERIOD_HOURS[period] ?? 720;
  return Date.now() - hours * 60 * 60 * 1000;
}

export function AiFirstTab({ period, onPeriodChange }: { period: Period; onPeriodChange: (p: Period) => void }) {
  const [refLogs, setRefLogs] = useState<any[]>([]);
  const [recLogs, setRecLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const aiInsightMutation = useCallableMutation<any, any>(CALLABLE.analyticsGetAiInsights);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError(false);
      try {
        const sinceMs = periodSinceMs(period);
        // allSettled: 片方が permission-denied でも読めた方は表示する（旧実装は Promise.all で全滅）
        const [refRes, recRes] = await Promise.allSettled([
          getDocs(query(collection(getFirebaseDb(), "ai_referrer_logs"), where("createdAt", ">=", sinceMs))),
          getDocs(query(collection(getFirebaseDb(), "recommend_logs"), where("createdAt", ">=", sinceMs))),
        ]);
        if (!mounted) return;
        if (refRes.status === "fulfilled") {
          const rLogs = refRes.value.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sorting locally to avoid needing a composite index
          rLogs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          setRefLogs(rLogs);
        } else {
          console.error("[AiFirstTab] ai_referrer_logs:", refRes.reason);
        }
        if (recRes.status === "fulfilled") {
          setRecLogs(recRes.value.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          console.error("[AiFirstTab] recommend_logs:", recRes.reason);
        }
        if (refRes.status === "rejected" && recRes.status === "rejected") setError(true);
      } catch (err) {
        console.error(err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [period]);

  const referrerStats = useMemo(() => {
    if (!refLogs.length) return { total: 0, botCounts: {}, topPaths: [], dailyCounts: {}, recentLogs: [] };
    const logs = refLogs.map((d: any) => ({
      botName: (d.botName as string) ?? "unknown",
      path: (d.path as string) ?? "/",
      createdAt: d.createdAt as number,
    }));
    const botCounts: Record<string, number> = {};
    const pathCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    for (const log of logs) {
      botCounts[log.botName] = (botCounts[log.botName] ?? 0) + 1;
      pathCounts[log.path] = (pathCounts[log.path] ?? 0) + 1;
      const day = new Date(log.createdAt).toISOString().slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
    }
    return {
      total: logs.length,
      botCounts,
      topPaths: Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      dailyCounts,
      recentLogs: logs.slice(0, 20),
    };
  }, [refLogs]);

  const recommendStats = useMemo(() => {
    if (!recLogs.length) return { total: 0, matchRate: 0, matched: 0, pending: 0, usageCounts: {} };
    const logs = recLogs.map((d: any) => ({
      matched: d.matched as "true" | "false" | "pending" | undefined,
      usage: d.usage as string | null | undefined,
    }));
    const total = logs.length;
    const matched = logs.filter((l) => l.matched === "true").length;
    const pending = logs.filter((l) => l.matched === "pending").length;
    const usageCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.usage) usageCounts[log.usage] = (usageCounts[log.usage] ?? 0) + 1;
    }
    return {
      total,
      matchRate: total - pending > 0 ? Math.round((matched / (total - pending)) * 100) : 0,
      matched,
      pending,
      usageCounts,
    };
  }, [recLogs]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700" style={{ fontSize: "0.8125rem" }}>
          Failed to load analytics data. Please refresh the page.
        </div>
      )}

      {/* Period selector + Ask AI */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span style={{ color: "rgba(0,0,0,0.5)" }}>Period</span>
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button key={value} onClick={() => onPeriodChange(value)}
            className={`px-3 py-1.5 border transition-colors duration-150 ${period === value ? "border-black bg-black text-white" : "border-[#D7D7D7] text-black/50 hover:border-black/40"}`}
            style={{ fontSize: "0.6875rem" }}>
            {label}
          </button>
        ))}
        <button onClick={() => aiInsightMutation.mutate({ period })} disabled={aiInsightMutation.isPending}
          className="ml-auto px-3 py-1.5 border border-black bg-black text-white hover:bg-black/80 transition-colors duration-150 disabled:opacity-50"
          style={{ fontSize: "0.6875rem" }}>
          {aiInsightMutation.isPending ? "Analyzing..." : "Ask AI"}
        </button>
      </div>

      {/* AI Insights panel */}
      {aiInsightMutation.data && (
        <div className="mb-6 bg-black text-white p-5">
          <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }} className="mb-3">AI INSIGHTS — AI FIRST</p>
          {aiInsightMutation.data.anomaly.detected && (
            <div className="mb-3 px-3 py-2 border border-yellow-400 text-yellow-300" style={{ fontSize: "0.8125rem" }}>
              ⚠ {aiInsightMutation.data.anomaly.message}
            </div>
          )}
          <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "rgba(255,255,255,0.9)" }}>
            {String(aiInsightMutation.data.insight)}
          </p>
        </div>
      )}
      {aiInsightMutation.isError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700" style={{ fontSize: "0.8125rem" }}>
          AI insights generation failed. Please try again.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "AI Bot Visits", value: loading ? "—" : (referrerStats.total ?? 0).toLocaleString() },
          { label: "Unique Bots", value: loading ? "—" : String(Object.keys(referrerStats.botCounts ?? {}).length) },
          { label: "Recommend Calls", value: loading ? "—" : (recommendStats.total ?? 0).toLocaleString() },
          { label: "Match Rate", value: loading ? "—" : `${recommendStats.matchRate ?? 0}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E0E0E0] p-5">
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>{label}</p>
            <p className="text-black mt-2" style={{ fontSize: "2rem", fontWeight: 300 }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot breakdown */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">AI Bot Breakdown</h3>
          {loading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : Object.keys(referrerStats.botCounts ?? {}).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No AI bot visits yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(referrerStats.botCounts ?? {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([bot, count]: [string, any]) => {
                const total = referrerStats.total ?? 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={bot}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: "0.8125rem" }}>{bot}</span>
                      <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F0F0] rounded-full">
                      <div className="h-1.5 bg-black rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top paths */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Top Paths by AI Bots</h3>
          {loading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : (referrerStats.topPaths ?? []).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No data yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F0F0]">
                  <th className="text-left pb-2" style={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.4)" }}>Path</th>
                  <th className="text-right pb-2" style={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.4)" }}>Visits</th>
                </tr>
              </thead>
              <tbody>
                {(referrerStats.topPaths ?? []).map(({ path, count }: { path: string; count: any }) => (
                  <tr key={path} className="border-b border-[#F7F7F5]">
                    <td className="py-2 pr-4 truncate max-w-[200px]" style={{ fontSize: "0.8125rem" }}>{path}</td>
                    <td className="py-2 text-right" style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recommend usage */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Recommend API — Usage Breakdown</h3>
          {loading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : Object.keys(recommendStats.usageCounts ?? {}).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No recommend calls yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(recommendStats.usageCounts ?? {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([usage, count]: [string, any]) => {
                const total = recommendStats.total ?? 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={usage}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: "0.8125rem" }}>{usage}</span>
                      <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F0F0] rounded-full">
                      <div className="h-1.5 bg-black rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent AI bot log */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Recent AI Bot Visits</h3>
          {loading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : (referrerStats.recentLogs ?? []).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No visits yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(referrerStats.recentLogs ?? []).map((log: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F7F7F5]">
                  <div>
                    <span className="inline-block bg-black text-white px-2 py-0.5 mr-2" style={{ fontSize: "0.55rem" }}>{log.botName}</span>
                    <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.6)" }}>{log.path}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.3)" }}>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
