/**
 * admin/AnalyticsTab.tsx — サイト分析タブ (BaaS First)
 */
import { useCallableMutation, CALLABLE } from "@/lib/callable";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Period, PERIOD_OPTIONS } from "./types";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const PERIOD_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

function periodSinceMs(period: string): number {
  const hours = PERIOD_HOURS[period] ?? 720;
  return Date.now() - hours * 60 * 60 * 1000;
}

function classifyChannel(referrer: string | null, props: Record<string, unknown>): string {
  const utmSource = (props?.utm_source as string | undefined) ?? "";
  if (utmSource) {
    if (/google/i.test(utmSource)) return "Google";
    if (/instagram/i.test(utmSource)) return "Instagram";
    if (/twitter|x\.com/i.test(utmSource)) return "Twitter/X";
    if (/facebook|fb/i.test(utmSource)) return "Facebook";
    if (/tiktok/i.test(utmSource)) return "TikTok";
    if (/line/i.test(utmSource)) return "LINE";
    return utmSource;
  }
  const ref = referrer ?? "";
  if (!ref) return "Direct";
  if (/google\./i.test(ref)) return "Google";
  if (/instagram\.com|l\.instagram/i.test(ref)) return "Instagram";
  if (/t\.co|twitter\.com|x\.com/i.test(ref)) return "Twitter/X";
  if (/facebook\.com|fb\.com/i.test(ref)) return "Facebook";
  if (/tiktok\.com/i.test(ref)) return "TikTok";
  if (/line\.me/i.test(ref)) return "LINE";
  if (/bing\./i.test(ref)) return "Bing";
  if (/yahoo\./i.test(ref)) return "Yahoo";
  return "Other";
}

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Direct",
  organic_search: "Organic Search",
  paid_search: "Paid Search",
  social: "Social",
  paid_social: "Paid Social",
  email: "Email",
  referral: "Referral",
  other_paid: "Other Paid",
  internal: "Internal",
};

export function AnalyticsTab({ period, onPeriodChange }: { period: Period; onPeriodChange: (p: Period) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const aiInsightMutation = useCallableMutation<any, any>(CALLABLE.analyticsGetAiInsights);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setIsLoading(true);
      setIsError(false);
      try {
        const sinceMs = periodSinceMs(period);
        const q = query(collection(getFirebaseDb(), "analytics_events"), where("createdAt", ">=", sinceMs));
        const snap = await getDocs(q);
        if (!mounted) return;
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        if (mounted) setIsError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [period]);

  const summary = useMemo(() => {
    if (!events.length) return null;
    
    const funnel = { page_view: 0, plan_tab_click: 0, plan_select: 0, checkout_start: 0, order_complete: 0 };
    const pageViews: Record<string, number> = {};
    const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
    const languageCounts: Record<string, number> = {};
    const dailyViews: Record<string, number> = {};
    const uniqueSessions = new Set<string>();
    const orderSessions = new Set<string>();
    const channelCounts: Record<string, number> = {};

    for (const ev of events) {
      const name = ev.eventName as keyof typeof funnel;
      if (name in funnel) funnel[name]++;
      if (ev.sessionId) uniqueSessions.add(ev.sessionId);
      if (ev.eventName === "order_complete" && ev.sessionId) orderSessions.add(ev.sessionId);
      if (ev.eventName === "page_view" && ev.page) pageViews[ev.page] = (pageViews[ev.page] ?? 0) + 1;
      if (ev.eventName === "page_view") {
        const props = (ev.properties ?? {}) as Record<string, unknown>;
        const ch = classifyChannel(ev.referrer ?? null, props);
        channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
      }
      const ua = (ev.userAgent ?? "").toLowerCase();
      if (/mobile|android|iphone/.test(ua)) deviceCounts.mobile++;
      else if (/tablet|ipad/.test(ua)) deviceCounts.tablet++;
      else deviceCounts.desktop++;
      if (ev.language) {
        const lang = ev.language.slice(0, 5);
        languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
      }
      if (ev.eventName === "page_view") {
        const day = new Date(ev.createdAt).toISOString().slice(0, 10);
        dailyViews[day] = (dailyViews[day] ?? 0) + 1;
      }
    }

    const topPages = Object.entries(pageViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));
    const trafficSources = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({ channel, count }));
    const uniqueVisitors = uniqueSessions.size;
    const cvr = uniqueVisitors > 0 ? (orderSessions.size / uniqueVisitors) * 100 : 0;

    return {
      period: { period, since: new Date(periodSinceMs(period)).toISOString() },
      funnel,
      topPages,
      deviceCounts,
      languageCounts,
      dailyViews,
      totalEvents: events.length,
      uniqueVisitors,
      cvr: Math.round(cvr * 100) / 100,
      trafficSources,
    };
  }, [events, period]);

  const handleExport = (format: "csv" | "json") => {
    try {
      if (format === "json") {
        const jsonStr = JSON.stringify(events, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yah-analytics-${period}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const headers = ["id", "eventName", "sessionId", "userId", "page", "referrer", "language", "userAgent", "createdAt"];
        const rows = events.map((ev) =>
          [
            ev.id,
            ev.eventName,
            ev.sessionId ?? "",
            ev.userId ?? "",
            ev.page ?? "",
            ev.referrer ?? "",
            ev.language ?? "",
            (ev.userAgent ?? "").replace(/,/g, " "),
            new Date(ev.createdAt).toISOString(),
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yah-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Exported ${events.length} events as ${format.toUpperCase()}`);
    } catch {
      toast.error(`${format.toUpperCase()} export failed.`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700" style={{ fontSize: "0.8125rem" }}>
          Failed to load analytics data. Please refresh the page.
        </div>
      )}

      {/* Period selector + Export + Ask AI */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span style={{ color: "rgba(0,0,0,0.5)" }}>Period</span>
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button key={value} onClick={() => onPeriodChange(value)}
            className={`px-3 py-1.5 border transition-colors duration-150 ${period === value ? "border-black bg-black text-white" : "border-[#D7D7D7] text-black/50 hover:border-black/40"}`}
            style={{ fontSize: "0.6875rem" }}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => handleExport("csv")} disabled={isLoading}
            className="px-3 py-1.5 border border-[#D7D7D7] text-black/50 hover:border-black/40 transition-colors duration-150 disabled:opacity-40"
            style={{ fontSize: "0.6875rem" }}>
            Export CSV
          </button>
          <button onClick={() => handleExport("json")} disabled={isLoading}
            className="px-3 py-1.5 border border-[#D7D7D7] text-black/50 hover:border-black/40 transition-colors duration-150 disabled:opacity-40"
            style={{ fontSize: "0.6875rem" }}>
            Export JSON
          </button>
          <button onClick={() => aiInsightMutation.mutate({ period })} disabled={aiInsightMutation.isPending}
            className="px-3 py-1.5 border border-black bg-black text-white hover:bg-black/80 transition-colors duration-150 disabled:opacity-50"
            style={{ fontSize: "0.6875rem" }}>
            {aiInsightMutation.isPending ? "Analyzing..." : "Ask AI"}
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsightMutation.data && (
        <div className="mb-6 bg-black text-white p-5">
          <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }} className="mb-3">AI INSIGHTS</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Total Events", value: summary?.totalEvents ?? 0 },
          { label: "Page Views", value: summary?.funnel.page_view ?? 0 },
          { label: "Unique Visitors", value: summary?.uniqueVisitors ?? 0 },
          { label: "Orders", value: summary?.funnel.order_complete ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E0E0E0] p-5">
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>{label}</p>
            <p className="text-black mt-2" style={{ fontSize: "2rem", fontWeight: 300 }}>
              {isLoading ? "—" : value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E0E0E0] p-5">
          <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>Conversion Rate (CVR)</p>
          <p className="text-black mt-2" style={{ fontSize: "2rem", fontWeight: 300 }}>{isLoading ? "—" : `${summary?.cvr ?? 0}%`}</p>
          <p style={{ fontSize: "0.6875rem", color: "rgba(0,0,0,0.35)" }} className="mt-1">Orders / Unique Visitors</p>
        </div>
        <div className="bg-white border border-[#E0E0E0] p-5">
          <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>Plan Selects</p>
          <p className="text-black mt-2" style={{ fontSize: "2rem", fontWeight: 300 }}>{isLoading ? "—" : (summary?.funnel.plan_select ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white border border-[#E0E0E0] p-5 mb-6">
        <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Conversion Funnel</h3>
        {isLoading ? (
          <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
        ) : (
          <div className="space-y-3">
            {([
              { key: "page_view", name: "Page View" },
              { key: "plan_tab_click", name: "Plan Tab Click" },
              { key: "plan_select", name: "Plan Select" },
              { key: "checkout_start", name: "Checkout Start" },
              { key: "order_complete", name: "Order Complete" },
            ] as const).map(({ key, name }) => {
              const count = summary?.funnel[key] ?? 0;
              const total = summary?.funnel.page_view ?? 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: "0.8125rem" }}>{name}</span>
                    <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#F0F0F0] rounded-full">
                    <div className="h-2 bg-black rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top pages */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Top Pages</h3>
          {isLoading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : (summary?.topPages ?? []).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No data yet</p>
          ) : (
            <div className="space-y-2">
              {(summary?.topPages ?? []).map(({ page, count }: { page: string; count: any }) => (
                <div key={page} className="flex justify-between py-1.5 border-b border-[#F7F7F5]">
                  <span style={{ fontSize: "0.8125rem" }} className="truncate max-w-[140px]">{page || "/"}</span>
                  <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device breakdown */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Device Breakdown</h3>
          {isLoading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary?.deviceCounts ?? {}).map(([device, count]: [string, any]) => {
                const total = (Object.values(summary?.deviceCounts ?? {}) as number[]).reduce((a: number, b: number) => a + b, 0) || 1;
                const pct = Math.round(((count as number) / total) * 100);
                return (
                  <div key={device}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: "0.8125rem" }} className="capitalize">{device}</span>
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

        {/* Language breakdown */}
        <div className="bg-white border border-[#E0E0E0] p-5">
          <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Language Breakdown</h3>
          {isLoading ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
          ) : Object.keys(summary?.languageCounts ?? {}).length === 0 ? (
            <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No data yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(summary?.languageCounts ?? {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([lang, count]: [string, any]) => (
                <div key={lang} className="flex justify-between py-1.5 border-b border-[#F7F7F5]">
                  <span style={{ fontSize: "0.8125rem" }}>{lang}</span>
                  <span style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.5)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="bg-white border border-[#E0E0E0] p-5 mt-6">
        <h3 style={{ fontSize: "0.6875rem" }} className="mb-4">Traffic Sources</h3>
        {isLoading ? (
          <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>Loading...</p>
        ) : (summary?.trafficSources ?? []).length === 0 ? (
          <p style={{ color: "rgba(0,0,0,0.3)", fontSize: "0.875rem" }}>No data yet — traffic sources will appear once visitors arrive</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(summary?.trafficSources ?? []).map(({ channel, count }: { channel: string; count: any }) => {
              const total = (summary?.trafficSources ?? []).reduce((a: number, b: any) => a + b.count, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={channel} className="border border-[#F0F0F0] p-4">
                  <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>{CHANNEL_LABELS[channel] ?? channel}</p>
                  <p className="text-black mt-1" style={{ fontSize: "1.5rem", fontWeight: 300 }}>{count.toLocaleString()}</p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.35)" }}>{pct}%</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
