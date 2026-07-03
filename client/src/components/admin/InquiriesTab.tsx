/**
 * admin/InquiriesTab.tsx — お問い合わせ管理タブ (BaaS First版)
 */
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { InquiryStatus, STATUS_COLORS, STATUS_LABELS } from "./types";

export function InquiriesTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(false);

  const inquiriesQuery = useMemo(
    () =>
      query(
        collection(getFirebaseDb(), "contact_inquiries"),
        orderBy("createdAt", "desc"),
        limit(200),
      ),
    [],
  );

  const { data: inquiries = [], isLoading } = useFirestoreCollection<any>(
    () => inquiriesQuery,
    [inquiriesQuery],
  );

  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (id: string, status: InquiryStatus, note?: string) => {
    setIsUpdating(true);
    try {
      const ref = doc(getFirebaseDb(), "contact_inquiries", id);
      const dataToUpdate: any = { status, updatedAt: Date.now() };
      if (note !== undefined) dataToUpdate.note = note;
      await updateDoc(ref, dataToUpdate);
      setEditingNote(false);
      toast.success("Updated successfully");
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const rows = useMemo(() => {
    if (statusFilter === "all") return inquiries;
    return inquiries.filter((r: any) => r.status === statusFilter);
  }, [inquiries, statusFilter]);

  const selectedInquiry = inquiries.find((r: any) => r.id === selectedId) ?? null;

  const statusCounts = inquiries.reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar: list */}
      <div className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 bg-white border-r border-[#E0E0E0] flex flex-col overflow-hidden">
        {/* Stats bar */}
        <div className="px-5 py-4 border-b border-[#E0E0E0] flex gap-4 flex-wrap">
          {(["pending", "in_progress", "resolved", "closed"] as InquiryStatus[]).map((s) => (
            <div key={s} className="text-center">
              <p className="text-black font-medium" style={{ fontSize: "1.25rem" }}>{statusCounts[s] ?? 0}</p>
              <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}>{STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="px-5 py-3 border-b border-[#E0E0E0] flex gap-2 flex-wrap">
          {(["all", "pending", "in_progress", "resolved", "closed"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 border transition-colors duration-150 ${statusFilter === s ? "border-black bg-black text-white" : "border-[#D7D7D7] text-black/50 hover:border-black/40"}`}
              style={{ fontSize: "0.6875rem", letterSpacing: "0.1em" }}>
              {s === "all" ? "ALL" : STATUS_LABELS[s].toUpperCase()}
            </button>
          ))}
        </div>

        {/* Inquiry list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center"><p style={{ color: "rgba(0,0,0,0.3)" }}>Loading...</p></div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center"><p style={{ color: "rgba(0,0,0,0.3)" }}>No inquiries</p></div>
          ) : (
            (rows as any[]).map((row: any) => (
              <button key={row.id} onClick={() => { setSelectedId(row.id); setNoteInput(row.note ?? ""); setEditingNote(false); }}
                className={`w-full text-left px-5 py-4 border-b border-[#F0F0F0] hover:bg-[#F7F7F5] transition-colors duration-100 ${selectedId === row.id ? "bg-[#F7F7F5] border-l-2 border-l-black" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-black font-medium truncate" style={{ fontSize: "0.875rem" }}>{row.name}</p>
                  <span className={`flex-shrink-0 px-2 py-0.5 border text-[0.6rem] font-medium tracking-wider uppercase ${STATUS_COLORS[row.status as InquiryStatus] ?? ""}`}>
                    {STATUS_LABELS[row.status as InquiryStatus] ?? row.status}
                  </span>
                </div>
                <p className="text-black/50 truncate mb-1" style={{ fontSize: "0.8125rem" }}>{row.email}</p>
                {row.category && (
                  <p className="text-black/40 truncate" style={{ fontSize: "0.75rem" }}>
                    {row.category}{row.detail ? ` — ${row.detail}` : ""}
                  </p>
                )}
                <p className="text-black/30 mt-1" style={{ fontSize: "0.6875rem" }}>
                  {new Date(row.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {selectedInquiry ? (
          <>
            <div className="bg-white border-b border-[#E0E0E0] px-8 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-black" style={{ fontSize: "1.125rem", fontWeight: 400 }}>{selectedInquiry.name}</h2>
                <p className="text-black/50" style={{ fontSize: "0.8125rem" }}>{selectedInquiry.email}</p>
              </div>
              <div className="flex gap-2">
                {(["pending", "in_progress", "resolved", "closed"] as InquiryStatus[]).map((s) => (
                  <button key={s}
                    onClick={() => handleUpdate(selectedInquiry.id, s, selectedInquiry.note ?? undefined)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 border transition-colors duration-150 disabled:opacity-50 ${selectedInquiry.status === s ? "border-black bg-black text-white" : "border-[#D7D7D7] text-black/50 hover:border-black/40"}`}
                    style={{ fontSize: "0.6875rem", letterSpacing: "0.1em" }}>
                    {STATUS_LABELS[s].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Location", value: selectedInquiry.location ?? "—" },
                  { label: "Category", value: selectedInquiry.category ?? "—" },
                  { label: "Detail", value: selectedInquiry.detail ?? "—" },
                  { label: "Received", value: new Date(selectedInquiry.createdAt).toLocaleString("ja-JP") },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.6rem" }}>{label}</p>
                    <p className="text-black mt-1" style={{ fontSize: "0.875rem" }}>{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.6rem", marginBottom: "0.5rem" }}>Message</p>
                <div className="bg-[#F7F7F5] border border-[#E0E0E0] px-5 py-4">
                  <p className="text-black whitespace-pre-wrap" style={{ fontSize: "0.9375rem", lineHeight: 1.75 }}>
                    {selectedInquiry.message}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.6rem" }}>Internal Note</p>
                  {!editingNote && (
                    <button onClick={() => { setNoteInput(selectedInquiry.note ?? ""); setEditingNote(true); }}
                      style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.6rem" }}
                      className="hover:text-black transition-colors">
                      {selectedInquiry.note ? "Edit" : "+ Add note"}
                    </button>
                  )}
                </div>
                {editingNote ? (
                  <div>
                    <textarea rows={4} value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full bg-white border border-[#D7D7D7] px-4 py-3 text-black focus:outline-none focus:border-black resize-none"
                      style={{ fontSize: "0.875rem" }} placeholder="Add internal note..." />
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => handleUpdate(selectedInquiry.id, selectedInquiry.status, noteInput)}
                        disabled={isUpdating}
                        className="bg-black text-white px-5 py-2 hover:bg-black/80 transition-colors disabled:opacity-50"
                        style={{ fontSize: "0.6875rem" }}>
                        {isUpdating ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingNote(false)} className="text-black/40 hover:text-black transition-colors" style={{ fontSize: "0.6875rem" }}>Cancel</button>
                    </div>
                  </div>
                ) : selectedInquiry.note ? (
                  <div className="bg-yellow-50 border border-yellow-200 px-5 py-4">
                    <p className="text-black/70 whitespace-pre-wrap" style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>{selectedInquiry.note}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.8125rem", color: "rgba(0,0,0,0.3)" }}>No internal note.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ color: "rgba(0,0,0,0.25)" }}>Select an inquiry to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
