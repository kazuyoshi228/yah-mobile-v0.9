import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { labelStyle, bodyStyle } from "./types";


// ---- 小コンポーネント ----

function InlineForm({
  fields,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
  onCancel,
  danger,
}: {
  fields: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }[];
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.label}>
          <label className="block text-black/50 mb-1" style={{ ...labelStyle, fontSize: "0.625rem" }}>
            {f.label}
          </label>
          <input
            type={f.type ?? "text"}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder={f.placeholder}
            className="w-full border border-[#D0D0D0] px-3 py-2 text-[0.875rem] text-black placeholder-black/25 focus:outline-none focus:border-black transition-colors duration-150"
            style={bodyStyle}
            autoFocus={f === fields[0]}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={isPending}
          className={`px-5 py-2 text-[0.75rem] text-white disabled:opacity-40 transition-colors duration-150 active:scale-[0.97] ${
            danger ? "bg-red-500 hover:bg-red-600" : "bg-black hover:bg-black/80"
          }`}
          style={labelStyle}
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 text-[0.75rem] text-black/40 hover:text-black border border-[#D0D0D0] hover:border-black transition-colors duration-150"
          style={labelStyle}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function TogglePanel({
  triggerLabel,
  triggerClass,
  children,
  open,
  onOpen,
}: {
  triggerLabel: string;
  triggerClass: string;
  children: React.ReactNode;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="bg-white border border-[#E0E0E0] p-5">
      {open ? children : (
        <button onClick={onOpen} className={`w-full text-center text-[0.8125rem] py-2 border border-dashed transition-colors duration-150 ${triggerClass}`} style={bodyStyle}>
          {triggerLabel}
        </button>
      )}
    </div>
  );
}

// ---- メインコンポーネント ----

export function AccessTab() {
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [revokeOpenId, setRevokeOpenId] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  const allowedEmailsQuery = useMemo(() => query(collection(getFirebaseDb(), "allowed_emails")), []);
  const { data: emails = [], isLoading } = useFirestoreCollection<any>(() => allowedEmailsQuery, [allowedEmailsQuery]);

  const [isAddingData, setIsAddingData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isRevokingData, setIsRevokingData] = useState(false);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("有効なメールアドレスを入力してください"); return;
    }
    setIsAddingData(true);
    try {
      await setDoc(doc(getFirebaseDb(), "allowed_emails", email), {
        email,
        note: newNote.trim() || null,
        createdAt: Date.now(),
      });
      toast.success("メールアドレスを追加しました");
      setNewEmail(""); setNewNote(""); setIsAdding(false);
    } catch (err: any) {
      toast.error(err.message.includes("permission-denied") ? "追加に失敗しました（権限エラーまたは10分以内の再認証が必要です）" : "追加に失敗しました");
    } finally {
      setIsAddingData(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`${email} を削除しますか？`)) return;
    setIsDeletingData(true);
    try {
      await deleteDoc(doc(getFirebaseDb(), "allowed_emails", email));
      toast.success("削除しました");
    } catch (err: any) {
      toast.error("削除に失敗しました（10分以内の再認証が必要な可能性があります）: " + err.message);
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleRevoke = async () => {
    const uid = revokeOpenId.trim();
    if (!uid) { toast.error("Firebase UIDを入力してください"); return; }
    if (!confirm(`Firebase UID: ${uid} の全セッションを無効化しますか？\n\nユーザーは次回のリクエスト時に強制ログアウトされます。`)) return;
    setIsRevokingData(true);
    try {
      await updateDoc(doc(getFirebaseDb(), "users", uid), {
        sessionRevokedAt: serverTimestamp()
      });
      toast.success("セッションを無効化しました。ユーザーは次回リクエスト時に強制ログアウトされます");
      setRevokeOpenId(""); setIsRevoking(false);
    } catch (err: any) {
      toast.error("無効化に失敗しました（10分以内の再認証が必要な可能性があります）: " + err.message);
    } finally {
      setIsRevokingData(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-black text-[1.125rem] font-medium mb-1" style={bodyStyle}>Access Control</h2>
          <p className="text-black/40 text-[0.875rem]" style={bodyStyle}>
            購入へ進むことを許可するメールアドレスを管理します。リストにないアドレスは決済に進めません。
          </p>
        </div>

        {/* 追加フォーム */}
        <div className="mb-6">
          <TogglePanel
            triggerLabel="+ メールアドレスを追加"
            triggerClass="text-black/40 hover:text-black border-[#D0D0D0] hover:border-black"
            open={isAdding}
            onOpen={() => setIsAdding(true)}
          >
            <InlineForm
              fields={[
                { label: "Email Address *", placeholder: "user@example.com", value: newEmail, onChange: setNewEmail, type: "email" },
                { label: "Note (optional)", placeholder: "例: テストユーザー、社内スタッフ", value: newNote, onChange: setNewNote },
              ]}
              submitLabel="追加"
              pendingLabel="追加中..."
              isPending={isAddingData}
              onSubmit={handleAdd}
              onCancel={() => { setIsAdding(false); setNewEmail(""); setNewNote(""); }}
            />
          </TogglePanel>
        </div>

        {/* セッション強制無効化 */}
        <div className="mb-8">
          <h3 className="text-black text-[0.9375rem] font-medium mb-1" style={bodyStyle}>Session Revocation</h3>
          <p className="text-black/40 text-[0.8125rem] mb-4" style={bodyStyle}>
            不正アクセス発覚時に、指定ユーザーの全セッションを即時無効化します。ユーザーは次回のリクエスト時に強制ログアウトされます。
          </p>
          <TogglePanel
            triggerLabel="⚠️ セッションを無効化する"
            triggerClass="text-red-400 hover:text-red-600 border-red-200 hover:border-red-400"
            open={isRevoking}
            onOpen={() => setIsRevoking(true)}
          >
            <InlineForm
              fields={[
                { label: "Firebase UID *", placeholder: "例: aBcD1234EfGh5678...", value: revokeOpenId, onChange: setRevokeOpenId },
              ]}
              submitLabel="即時無効化"
              pendingLabel="無効化中..."
              isPending={isRevokingData}
              onSubmit={handleRevoke}
              onCancel={() => { setIsRevoking(false); setRevokeOpenId(""); }}
              danger
            />
          </TogglePanel>
        </div>

        {/* メールアドレス一覧 */}
        <div className="bg-white border border-[#E0E0E0]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-[#E0E0E0] bg-[#F7F7F5]">
            {["Email", "Note", "Action"].map((h) => (
              <span key={h} style={{ ...labelStyle, fontSize: "0.625rem" }} className="text-black/40">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="px-5 py-8 text-center text-black/30 text-[0.875rem]" style={bodyStyle}>Loading...</div>
          ) : !emails?.length ? (
            <div className="px-5 py-8 text-center text-black/30 text-[0.875rem]" style={bodyStyle}>許可されたメールアドレスがありません</div>
          ) : (
            emails.map((row, idx) => (
              <div
                key={row.id}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3.5 ${idx < emails.length - 1 ? "border-b border-[#F0F0F0]" : ""}`}
              >
                <span className="text-black text-[0.875rem] truncate" style={bodyStyle}>{row.email}</span>
                <span className="text-black/40 text-[0.8125rem] truncate max-w-[160px]" style={bodyStyle}>{row.note ?? "—"}</span>
                <button
                  onClick={() => handleDelete(row.email)}
                  disabled={isDeletingData}
                  className="text-black/30 hover:text-red-500 text-[0.75rem] transition-colors duration-150 disabled:opacity-30"
                  style={labelStyle}
                >
                  削除
                </button>
              </div>
            ))
          )}

          {!!emails?.length && (
            <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#F7F7F5]">
              <span className="text-black/30 text-[0.75rem]" style={bodyStyle}>{emails.length} アドレス登録済み</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
