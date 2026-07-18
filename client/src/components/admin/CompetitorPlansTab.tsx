/**
 * admin/CompetitorPlansTab.tsx — 「How we compare.」比較テーブル管理タブ (真のNoSQL版)
 *
 * - 行（サービス）×列（比較項目）のスプレッドシート型編集UI
 * - 1つのドキュメント(comparison_tables/main)に行・列・セルの全データを格納
 */
import { useFirestoreDoc } from "@/hooks/useFirestoreCollection";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { ComparisonEditingCell } from "./types";

const FIXED_COL_KEY = "service";

interface TableData {
  columns: {
    id: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
  }[];
  rows: {
    id: string;
    serviceName: string;
    sortOrder: number;
    isActive: boolean;
    isHighlight: boolean;
    cells: Record<string, string>;
  }[];
  updatedAt: number;
}

const DEFAULT_TABLE: TableData = {
  columns: [
    { id: FIXED_COL_KEY, label: "Service", sortOrder: 0, isActive: true },
    { id: "plan", label: "Plan", sortOrder: 1, isActive: true },
    { id: "estPrice", label: "Est. Price", sortOrder: 2, isActive: true },
    { id: "pricePerGb", label: "Price/GB", sortOrder: 3, isActive: true },
    { id: "support", label: "Support", sortOrder: 4, isActive: true },
    { id: "network", label: "Network", sortOrder: 5, isActive: true },
  ],
  rows: [
    {
      id: "row_yah_mobile",
      serviceName: "yah.mobile",
      isActive: true,
      isHighlight: true,
      sortOrder: 0,
      cells: {
        plan: "7 days / 3GB",
        estPrice: "¥1,350",
        pricePerGb: "¥450/GB",
        support: "24/7 multilingual",
        network: "NTT docomo (4G LTE)",
      },
    },
    {
      id: "row_airalo",
      serviceName: "Airalo",
      isActive: true,
      isHighlight: false,
      sortOrder: 1,
      cells: {
        plan: "7 days / 3GB",
        estPrice: "¥1,700",
        pricePerGb: "¥567/GB",
        support: "Email only",
        network: "IIJmio",
      },
    },
    {
      id: "row_holafly",
      serviceName: "Holafly",
      isActive: true,
      isHighlight: false,
      sortOrder: 2,
      cells: {
        plan: "7 days / Unlimited",
        estPrice: "¥3,200",
        pricePerGb: "—",
        support: "Chat",
        network: "Softbank",
      },
    },
    {
      id: "row_ubigi",
      serviceName: "Ubigi",
      isActive: true,
      isHighlight: false,
      sortOrder: 3,
      cells: {
        plan: "30 days / 10GB",
        estPrice: "¥3,500",
        pricePerGb: "¥350/GB",
        support: "Email",
        network: "NTT Docomo",
      },
    },
    {
      id: "row_mobal",
      serviceName: "Mobal",
      isActive: true,
      isHighlight: false,
      sortOrder: 4,
      cells: {
        plan: "30 days / 10GB",
        estPrice: "¥4,200",
        pricePerGb: "¥420/GB",
        support: "Email",
        network: "NTT Docomo",
      },
    },
  ],
  updatedAt: Date.now(),
};

export default function CompetitorPlansTab() {
  const { data: rawTable, isLoading } = useFirestoreDoc<TableData>(
    () => doc(getFirebaseDb(), "competitorPlans", "main"),
    [],
  );

  // ローカルステートで編集中のテーブルを保持
  const [table, setTable] = useState<TableData>(DEFAULT_TABLE);
  
  // Firestoreのデータがロードされたら初期化
  useEffect(() => {
    if (rawTable) {
      setTable({
        columns: rawTable.columns ?? DEFAULT_TABLE.columns,
        rows: rawTable.rows ?? [],
        updatedAt: rawTable.updatedAt ?? Date.now()
      });
    }
  }, [rawTable]);

  // ── 保存処理 ──────────────────────────────
  const saveTable = async (newTable: TableData) => {
    try {
      newTable.updatedAt = Date.now();
      await setDoc(doc(getFirebaseDb(), "competitorPlans", "main"), newTable);
      toast.success("Saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save table");
    }
  };

  const updateTable = (updater: (prev: TableData) => TableData) => {
    setTable((prev) => {
      const next = updater(prev);
      saveTable(next); // 自動保存
      return next;
    });
  };

  // ── インラインセル編集 ──────────────────────
  const [editing, setEditing] = useState<ComparisonEditingCell | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (rowId: string, colKey: string, current: string) => {
    setEditing({ rowId, colKey });
    setDraft(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    updateTable((prev) => {
      const nextRows = prev.rows.map(r => {
        if (r.id !== editing.rowId) return r;
        if (editing.colKey === FIXED_COL_KEY) {
          return { ...r, serviceName: draft };
        } else {
          return { ...r, cells: { ...r.cells, [editing.colKey]: draft } };
        }
      });
      return { ...prev, rows: nextRows };
    });
    setEditing(null);
  };

  // ── 行の更新/削除 ───────────────────────────
  const updateRowField = (rowId: string, field: keyof TableData['rows'][0], value: any) => {
    updateTable(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r)
    }));
  };

  const handleDeleteRow = (rowId: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete row "${name}"?`)) {
      updateTable(prev => ({
        ...prev,
        rows: prev.rows.filter(r => r.id !== rowId)
      }));
    }
  };

  // ── 列の更新/削除 ───────────────────────────
  const updateColField = (colId: string, field: keyof TableData['columns'][0], value: any) => {
    updateTable(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId ? { ...c, [field]: value } : c)
    }));
  };

  const handleDeleteColumn = (colId: string, label: string) => {
    if (colId === FIXED_COL_KEY) return;
    if (window.confirm(`Are you sure you want to permanently delete column "${label}"?`)) {
      updateTable(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.id !== colId)
      }));
    }
  };

  // ── 列ヘッダー編集 ──────────────────────────
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colDraft, setColDraft] = useState("");

  const startColEdit = (colId: string, label: string) => {
    if (colId === FIXED_COL_KEY) return;
    setEditingColId(colId);
    setColDraft(label);
  };

  const commitColEdit = (colId: string) => {
    const label = colDraft.trim();
    if (label) {
      updateColField(colId, "label", label);
    }
    setEditingColId(null);
  };

  const handleAddColumn = () => {
    const label = window.prompt("New column name (e.g. 5G, eKYC, Speed)");
    if (label && label.trim()) {
      const colId = `custom_${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36).padStart(2, "0")}`;
      const maxSort = table.columns.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0);
      updateTable(prev => ({
        ...prev,
        columns: [...prev.columns, { id: colId, label: label.trim(), sortOrder: maxSort + 10, isActive: true }]
      }));
    }
  };

  const handleAddRow = () => {
    const name = window.prompt("New service name");
    if (name && name.trim()) {
      const rowId = `row_${Date.now().toString(36)}`;
      const maxSort = table.rows.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);
      updateTable(prev => ({
        ...prev,
        rows: [...prev.rows, {
          id: rowId,
          serviceName: name.trim(),
          sortOrder: maxSort + 10,
          isActive: true,
          isHighlight: false,
          cells: {}
        }]
      }));
    }
  };

  const handleDeleteColumnPrompt = () => {
    const name = window.prompt("Enter the exact column name to delete:");
    if (!name) return;
    const col = table.columns.find(c => c.label.toLowerCase() === name.toLowerCase());
    if (col) {
      handleDeleteColumn(col.id, col.label);
    } else {
      toast.error(`Column "${name}" not found.`);
    }
  };

  const handleDeleteRowPrompt = () => {
    const name = window.prompt("Enter the exact service name to delete:");
    if (!name) return;
    const row = table.rows.find(r => r.serviceName.toLowerCase() === name.toLowerCase());
    if (row) {
      handleDeleteRow(row.id, row.serviceName);
    } else {
      toast.error(`Row "${name}" not found.`);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  // 表示用にソート
  const displayCols = [...table.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const displayRows = [...table.rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">How we compare</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the landing page comparison table. Click any cell to edit. Columns and rows can be added or removed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddColumn}
            className="text-sm font-medium px-3 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors active:scale-[0.97]"
          >
            + Add column
          </button>
          <button
            onClick={handleDeleteColumnPrompt}
            className="text-sm font-medium px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors active:scale-[0.97]"
          >
            - Delete column
          </button>
          <button
            onClick={handleAddRow}
            className="text-sm font-medium px-3 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition active:scale-[0.97]"
          >
            + Add row
          </button>
          <button
            onClick={handleDeleteRowPrompt}
            className="text-sm font-medium px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors active:scale-[0.97]"
          >
            - Delete row
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {displayCols.map((col) => {
                const isFixed = col.id === FIXED_COL_KEY;
                const inactive = !col.isActive;
                return (
                  <th
                    key={col.id}
                    className={`px-3 py-2 text-left font-medium whitespace-nowrap border-b border-border align-top ${
                      inactive ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {editingColId === col.id ? (
                        <input
                          autoFocus
                          value={colDraft}
                          onChange={(e) => setColDraft(e.target.value)}
                          onBlur={() => commitColEdit(col.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitColEdit(col.id);
                            if (e.key === "Escape") setEditingColId(null);
                          }}
                          className="w-28 px-1.5 py-0.5 rounded border border-input bg-background text-sm"
                        />
                      ) : (
                        <span
                          className={`cursor-pointer hover:underline ${isFixed ? "pointer-events-none" : ""}`}
                          onClick={() => startColEdit(col.id, col.label)}
                        >
                          {col.label}
                        </span>
                      )}
                    </div>
                    {!isFixed && (
                      <div className="mt-2 flex gap-2 font-normal text-xs text-muted-foreground">
                        <button onClick={() => updateColField(col.id, "isActive", inactive)} className="hover:text-foreground">
                          {inactive ? "Show" : "Hide"}
                        </button>
                        <button onClick={() => handleDeleteColumn(col.id, col.label)} className="hover:text-destructive">
                          Delete
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const inactiveRow = !row.isActive;
              return (
                <tr key={row.id} className={`border-b border-border last:border-0 ${inactiveRow ? "opacity-40" : ""}`}>
                  {displayCols.map((col) => {
                    const isFixed = col.id === FIXED_COL_KEY;
                    const val = isFixed ? row.serviceName : (row.cells[col.id] ?? "");
                    const isEditing = editing?.rowId === row.id && editing?.colKey === col.id;

                    return (
                      <td key={`${row.id}-${col.id}`} className="px-3 py-2 align-top">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="w-full px-1.5 py-0.5 rounded border border-input bg-background text-sm"
                          />
                        ) : (
                          <div className="group relative">
                            <span
                              className="cursor-pointer hover:bg-muted/50 px-1 -mx-1 rounded"
                              onClick={() => startEdit(row.id, col.id, val)}
                            >
                              {val || <span className="text-muted-foreground italic">empty</span>}
                            </span>
                            {isFixed && (
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:flex gap-2 text-xs text-muted-foreground bg-background border border-border p-1 rounded shadow z-10">
                                <label className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={row.isHighlight === true}
                                    onChange={(e) => updateRowField(row.id, "isHighlight", e.target.checked)}
                                    className="rounded border-input"
                                  />
                                  Highlight
                                </label>
                                <button
                                  onClick={() => updateRowField(row.id, "isActive", inactiveRow)}
                                  className="hover:text-foreground"
                                >
                                  {inactiveRow ? "Show" : "Hide"}
                                </button>
                                <button onClick={() => handleDeleteRow(row.id, row.serviceName)} className="hover:text-destructive">
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={displayCols.length || 1} className="p-8 text-center text-muted-foreground">
                  No data found. Click "+ Add row" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
