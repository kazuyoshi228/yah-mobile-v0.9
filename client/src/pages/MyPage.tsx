import { useAuth } from "@/_core/hooks/useAuth";
import { NATIONALITIES } from "@shared/const";
import { getFirebaseDb } from "@/lib/firebase";
import { safeUrl } from "@/lib/utils";
import { callFunction, CALLABLE } from "@/lib/callable";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { StatusBadge } from "@/components/StatusBadge";

function detectDevice(): "ios" | "android" | "other" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3 h-3 border" : "w-5 h-5 border-2";
  return <div className={`${cls} border-black/20 border-t-black rounded-full animate-spin`} />;
}

// ─── 未読通知バッジ ────────────────────────────────────────────────────────────

function NotificationBell({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) { setCount(0); return; }
    const q = query(
      collection(getFirebaseDb(), "notifications"),
      where("userId", "==", user.id),
      where("isRead", "==", "false"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      setCount(snap.size);
    });
    return unsub;
  }, [user?.id]);
  return (
    <button
      onClick={onOpen}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5 transition-colors duration-200"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-black text-white text-[0.55rem] font-sans font-medium rounded-full flex items-center justify-center px-1"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </button>
  );
}

// ─── 通知パネル ────────────────────────────────────────────────────────────────

type FsNotif = {
  id: string;
  title: string;
  body?: string | null;
  isRead: string;
  createdAt: number;
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState<FsNotif[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // AP-05/AP-09: notificationsMarkRead Callable Function 不要 → Firestore 直接 update
  const handleMarkRead = useCallback(async (notifId: string) => {
    if (!user?.id) return;
    const ref = doc(getFirebaseDb(), "notifications", notifId);
    await updateDoc(ref, { isRead: true, readAt: Date.now() });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setUnread([]); setIsLoading(false); return; }
    const q = query(
      collection(getFirebaseDb(), "notifications"),
      where("userId", "==", user.id),
      where("isRead", "==", "false"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      setUnread(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FsNotif)));
      setIsLoading(false);
    });
    return unsub;
  }, [user?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 bg-white border border-black/10 shadow-xl z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8">
        <p className="text-label text-[0.6875rem] text-black/50">NOTIFICATIONS</p>
        <button onClick={onClose} className="font-sans text-black/30 hover:text-black text-lg leading-none">×</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 flex justify-center"><Spinner /></div>
        ) : !unread || unread.length === 0 ? (
          <p className="font-sans text-black/30 text-sm text-center py-8">No new notifications</p>
        ) : (
          unread.map((n) => (
            <div key={n.id} className="px-4 py-3 border-b border-black/5 hover:bg-black/2 transition-colors duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-black text-sm font-medium mb-0.5">{n.title}</p>
                  {n.body && <p className="font-sans text-black/40 text-xs leading-[1.6]">{n.body}</p>}
                </div>
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="shrink-0 text-label text-[0.55rem] text-black/30 hover:text-black transition-colors duration-150 mt-0.5"
                >
                  ✓
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── アクティブeSIMサマリーカード ──────────────────────────────────────────────

type EsimLink = {
  id: string;
  orderId: string;
  bappyLinkUuid: string | null;
  iccid: string | null;
  lpaProfile: string | null;
  appleActivationUrl: string | null;
  androidActivationUrl: string | null;
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
  expiryDate: Date | string | null;
  status: string | null;
};

function ActiveEsimSummary({
  esimLink,
  planName,
  onViewDetail,
}: {
  esimLink: EsimLink;
  planName?: string | null;
  onViewDetail: () => void;
}) {
  const device = detectDevice();
  const expiryDisplay = esimLink.expiryDate
    ? new Date(esimLink.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const activationUrl = safeUrl(
    device === "ios" ? esimLink.appleActivationUrl :
    device === "android" ? esimLink.androidActivationUrl :
    esimLink.appleActivationUrl ?? esimLink.androidActivationUrl
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 border border-black bg-black text-white p-6 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-label text-[0.6rem] text-white/40 mb-2">ACTIVE eSIM</p>
          <p className="font-sans font-medium text-white text-lg leading-tight">
            {planName ?? "eSIM Ready"}
          </p>
          {esimLink.iccid && (
            <p className="font-sans text-white/30 text-xs mt-0.5 font-mono">{esimLink.iccid}</p>
          )}
          {expiryDisplay && (
            <p className="font-sans text-white/40 text-xs mt-1">Expires {expiryDisplay}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 text-white text-[0.6rem] font-sans font-medium tracking-[0.15em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Active
        </span>
      </div>

      {esimLink.dataRemainingMb != null && esimLink.dataTotalMb != null && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-sans text-white/40 text-xs">Data Remaining</span>
            <span className="font-sans text-white text-xs font-medium">
              {(esimLink.dataRemainingMb / 1024).toFixed(2)} GB / {(esimLink.dataTotalMb / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.round((esimLink.dataRemainingMb / esimLink.dataTotalMb) * 100))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {activationUrl && (
          <a
            href={activationUrl}
            className="text-label text-[0.7rem] inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 hover:bg-white/90 transition-colors duration-200 active:scale-[0.97]"
          >
            {device === "ios" ? (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M17.523 15.341a.75.75 0 0 1-.75.75H7.227a.75.75 0 0 1-.75-.75V8.659a.75.75 0 0 1 .75-.75h9.546a.75.75 0 0 1 .75.75v6.682zM6 6.5l-1.5-2.6M18 6.5l1.5-2.6M8.5 3.9l.5.866M15.5 3.9l-.5.866"/>
              </svg>
            )}
            Activate eSIM
          </a>
        )}
        <button
          onClick={onViewDetail}
          className="text-label text-[0.7rem] inline-flex items-center gap-1.5 border border-white/30 text-white px-5 py-2.5 hover:border-white/60 transition-colors duration-200"
        >
          View details →
        </button>
        {esimLink.bappyLinkUuid && (
          <Link href={`/mypage/topup/${esimLink.id}`}>
            <span className="text-label text-[0.7rem] inline-flex items-center gap-1.5 border border-transparent bg-white text-black px-5 py-2.5 hover:bg-white/90 transition-colors duration-200 cursor-pointer">
              Top-up Data +
            </span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ─── トップアップパネル ────────────────────────────────────────────────────────
// Extracted to TopupPage.tsx

// ─── 注文詳細 ──────────────────────────────────────────────────────────────────
// Extracted to OrderDetailPage.tsx

// ─── 注文カード ────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  bappyPlanId: string;
  planName?: string | null;
  status: string;
  amountJpy: number | null;
  createdAt: number;
};

type EsimPreview = {
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
  expiryDate: Date | string | null;
} | null;

function OrderCard({
  order,
  esimPreview,
  onClick,
  onHide,
}: {
  order: OrderRow;
  esimPreview?: EsimPreview;
  onClick: () => void;
  onHide: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [confirmHide, setConfirmHide] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      const result = await callFunction<{ orderId: string; origin: string }, { checkoutUrl: string }>(
        CALLABLE.orderRetryPayment,
        { orderId: order.id, origin: window.location.origin }
      );
      toast("Redirecting to payment...");
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      toast.error(t("common.paymentFailed"));
    } finally {
      setIsRetrying(false);
    }
  };
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const expiryDisplay = esimPreview?.expiryDate
    ? new Date(esimPreview.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const pct = esimPreview?.dataTotalMb && esimPreview.dataRemainingMb != null
    ? Math.min(100, Math.round((esimPreview.dataRemainingMb / esimPreview.dataTotalMb) * 100))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-black/10 p-5 sm:p-6 cursor-pointer hover:border-black/30 transition-colors duration-200 group active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="font-sans font-medium text-black text-[0.9375rem]">{order.planName ?? "Japan eSIM"}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="font-sans text-black/30 text-xs">{date}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans font-medium text-black">¥{order.amountJpy?.toLocaleString()}</p>
        </div>
      </div>

      {/* eSIMプレビュー（fulfilled状態のみ） */}
      {order.status === "fulfilled" && pct !== null && (
        <div className="mt-4 pt-4 border-t border-black/5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans text-black/30 text-xs">Data</span>
            <span className="font-sans text-black/50 text-xs">{pct}% remaining</span>
          </div>
          <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct > 50 ? "bg-black/40" : pct > 20 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {expiryDisplay && (
            <p className="font-sans text-black/25 text-xs mt-1.5">Expires {expiryDisplay}</p>
          )}
        </div>
      )}

      {/* pending注文の再決済ボタン */}
      {order.status === "pending" && (
        <div className="mt-4 pt-4 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleRetryPayment}
            disabled={isRetrying}
            className="w-full text-label text-[0.7rem] inline-flex items-center justify-center gap-2 bg-black text-white px-5 py-3 hover:bg-black/80 transition-colors duration-200 active:scale-[0.97] disabled:opacity-50"
          >
            {isRetrying ? (
              <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
            ) : (
              <>Complete Payment →</>
            )}
          </button>
          <p className="font-sans text-black/30 text-xs mt-2 text-center">Your order is waiting for payment.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-black/30 group-hover:text-black/60 transition-colors duration-200">
          <span className="text-label text-[0.625rem]">View details</span>
          <span className="text-xs">→</span>
        </div>
        {/* 削除ボタン（済み・失敗・キャンセル注文のみ表示） */}
        {["pending", "paid", "cancelled", "failed", "refunded", "fulfilled"].includes(order.status) && (
          confirmHide ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="font-sans text-black/40 text-[0.625rem]">Remove?</span>
              <button
                onClick={() => onHide(order.id)}
                className="text-label text-[0.625rem] text-red-500 hover:text-red-700 transition-colors duration-150 px-2 py-1"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmHide(false)}
                className="text-label text-[0.625rem] text-black/30 hover:text-black/60 transition-colors duration-150 px-2 py-1"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmHide(true); }}
              className="text-label text-[0.625rem] text-black/20 hover:text-black/50 transition-colors duration-150 px-2 py-1 opacity-0 group-hover:opacity-100"
              aria-label="Remove from history"
            >
              Remove
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}

// ─── 注文一覧（eSIMプレビュー付き） ───────────────────────────────────────────

type EsimPreviewMap = Map<string, EsimPreview>;

function OrderList({
  orders,
  onSelect,
  esimByOrderId,
}: {
  orders: OrderRow[];
  onSelect: (id: string) => void;
  esimByOrderId: EsimPreviewMap;
}) {
  // BaaSネイティブ: ordersHide Callable を廃止し Firestore 直接 updateDoc に移行
  const handleHideOrder = useCallback(async (id: string) => {
    await updateDoc(doc(getFirebaseDb(), "orders", id), {
      hiddenByUser: true,
      updatedAt: Date.now(),
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          esimPreview={esimByOrderId.get(order.id) as EsimPreview ?? null}
          onClick={() => onSelect(order.id)}
          onHide={handleHideOrder}
        />
      ))}
    </div>
  );
}

// ─── プロフィール編集コンポーネント ────────────────────────────────────────────


function ProfileSection() {
  const { t } = useTranslation();
  // useAuth の user は Firestore users/{uid} の onSnapshot で常に最新。
  // getProfile tRPC は不要になった。
  const { user } = useAuth();
  // BaaSネイティブ: userUpdateProfile Callable を廃止し Firestore 直接 updateDoc に移行
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");

  // user が更新されたとき（onSnapshot 経由）にフォームを同期する
  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "");
      setNationality(user.nationality ?? "");
      setAge(user.age ? String(user.age) : "");
      setPhone(user.phoneNumber ?? "");
    }
  }, [user]);

  const handleSave = async () => {
    setError(null);
    const ageNum = age ? parseInt(age, 10) : undefined;
    if (ageNum !== undefined && (isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      setError("Please enter a valid age."); return;
    }
    if (!user?.uid) { setError("Not authenticated."); return; }
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (fullName.trim()) updates.fullName = fullName.trim();
      if (nationality) updates.nationality = nationality;
      if (ageNum !== undefined) updates.age = ageNum;
      if (phone.trim()) updates.phoneNumber = phone.trim();
      await updateDoc(doc(getFirebaseDb(), "users", user.uid), updates);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(t("common.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const nationalityName = NATIONALITIES.find(n => n.code === (user?.nationality ?? nationality))?.name;

  return (
    <div className="border-t border-[#E8E8E8] pt-10 mt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-label text-black/30 mb-1">PROFILE</p>
          <h2 className="font-sans font-light text-black text-[1.25rem] tracking-[-0.02em]">Your information.</h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-label text-[0.7rem] px-4 py-2 border border-[#D7D7D7] text-black hover:border-black transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="border border-black/10 bg-black/5 px-4 py-3 mb-5">
          <p className="font-sans text-black/70 text-[0.8125rem]">Profile updated successfully.</p>
        </div>
      )}

      {/* ログイン中のメールアドレス（Google アカウント / 編集不可） */}
      <div className="bg-white border border-[#E8E8E8] p-5 mb-px">
        <p className="text-label text-black/35 mb-1.5">Email <span className="text-black/25 normal-case tracking-normal">(Google account · read-only)</span></p>
        <p className="font-sans text-black text-[0.9rem] break-all">{user?.email || "—"}</p>
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-px bg-[#E8E8E8]">
          {[
            { label: "Full Name", value: user?.fullName || "—" },
            { label: "Nationality", value: nationalityName || "—" },
            { label: "Age", value: user?.age ? `${user.age} years old` : "—" },
            { label: "Phone", value: user?.phoneNumber || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white p-5">
              <p className="text-label text-black/35 mb-1.5">{label}</p>
              <p className="font-sans text-black text-[0.9rem]">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="text-label text-black/50 block mb-2">Email <span className="text-black/30">(read-only)</span></label>
            <input type="email" value={user?.email || ""} disabled readOnly
              className="font-sans w-full border border-[#E8E8E8] bg-[#F7F7F7] px-4 py-3 text-[0.9rem] text-black/50 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-label text-black/50 block mb-2">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="As shown on your passport"
              className="font-sans w-full border border-[#D7D7D7] px-4 py-3 text-[0.9rem] text-black placeholder:text-black/25 focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="text-label text-black/50 block mb-2">Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)}
              className="font-sans w-full border border-[#D7D7D7] px-4 py-3 text-[0.9rem] text-black bg-white focus:outline-none focus:border-black transition-colors appearance-none">
              <option value="">Select nationality</option>
              {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-label text-black/50 block mb-2">Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)}
              placeholder="e.g. 28" min={1} max={120}
              className="font-sans w-full border border-[#D7D7D7] px-4 py-3 text-[0.9rem] text-black placeholder:text-black/25 focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="text-label text-black/50 block mb-2">Phone Number <span className="text-black/30">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +1 234 567 8900"
              className="font-sans w-full border border-[#D7D7D7] px-4 py-3 text-[0.9rem] text-black placeholder:text-black/25 focus:outline-none focus:border-black transition-colors" />
          </div>
          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3">
              <p className="font-sans text-red-700 text-[0.8125rem]">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setEditing(false); setError(null); }}
              className="text-label px-5 py-3.5 border border-[#D7D7D7] text-black hover:border-black transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isSaving}
              className="text-label flex-1 py-3.5 bg-black text-white hover:bg-black/80 transition-colors duration-200 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <><span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />Saving...</> : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────────────────────────────

export default function MyPage() {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  // orders ・eSIM links を Firestore onSnapshot でリアルタイム監視
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [esimLinks, setEsimLinks] = useState<EsimLink[] | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setOrders(null);
      setOrdersLoading(false);
      setEsimLinks(null);
      return;
    }
    const ordersQuery = query(
      collection(getFirebaseDb(), "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubOrders = onSnapshot(ordersQuery, (snap: QuerySnapshot<DocumentData>) => {
      // hiddenByUser フィールドが存在しない古い注文も含めてクライアント側でフィルタリング
      setOrders(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as OrderRow))
          .filter((o) => (o as any).hiddenByUser !== true)
      );
      setOrdersLoading(false);
    });
    const esimQuery = query(
      collection(getFirebaseDb(), "esim_links"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubEsim = onSnapshot(esimQuery, (snap: QuerySnapshot<DocumentData>) => {
      setEsimLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EsimLink)));
    });
    return () => { unsubOrders(); unsubEsim(); };
  }, [user?.uid]);

  // OrderList用：orderId → esimPreview のMapをメモ化
  const esimByOrderId = useMemo<EsimPreviewMap>(
    () => new Map((esimLinks ?? []).map((e) => [e.orderId, e as EsimPreview])),
    [esimLinks],
  );

  // アクティブeSIMリスト（fulfilled かつ esimLink がある全注文）
  const activeEsimList = useMemo(() => {
    if (!orders || !esimLinks) return [];
    return orders
      .filter((o) => o.status === "fulfilled")
      .map((o) => {
        const link = esimLinks.find((e) => e.orderId === o.id) ?? null;
        return link ? { link, planName: null } : null;
      })
      .filter((x) => x !== null) as { link: EsimLink; planName: string | null }[];
  }, [orders, esimLinks]);

  const [activeEsimIndex, setActiveEsimIndex] = useState(0);
  // リスト件数変化時に index を自動補正
  useEffect(() => {
    if (activeEsimList.length > 0) {
      setActiveEsimIndex((i) => Math.min(i, activeEsimList.length - 1));
    }
  }, [activeEsimList.length]);
  const clampedIndex = Math.min(activeEsimIndex, Math.max(0, activeEsimList.length - 1));
  const activeEsimData = activeEsimList[clampedIndex] ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-sans text-black/20 mb-6 text-[4rem] font-light leading-none">🔒</p>
          <h1 className="font-sans font-light text-black mb-3 text-[clamp(1.5rem,4vw,2.5rem)] tracking-[-0.02em]">
            Sign in to view your orders.
          </h1>
          <p className="font-sans text-black/40 mb-8 max-w-sm text-sm leading-[1.75]">
            Log in to access your purchase history, eSIM QR codes, and account details.
          </p>
          <a
            href="/login?redirect=%2Fmypage"
            className="text-label text-[0.75rem] inline-block bg-black text-white px-8 py-3.5 hover:bg-black/80 transition-colors duration-200 active:scale-[0.97]"
          >
            Sign in
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />

      <main className="flex-1 pt-24 pb-24">
        <div className="container max-w-3xl">

          {/* ヘッダー */}
          <div className="mb-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-black/30 mb-4">MY PAGE</p>
              <h1 className="font-sans font-light text-black mb-2 text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.03em]">
                Your orders.
              </h1>
              {user?.name && (
                <p className="font-sans text-black/60 text-sm">{user.name}</p>
              )}
              {user?.email && (
                <p className="font-sans text-black/40 text-sm">{user.email}</p>
              )}
            </div>

            {/* 通知ベル */}
            <div className="relative mt-2">
              <NotificationBell onOpen={() => setShowNotifications((v) => !v)} />
              <AnimatePresence>
                {showNotifications && (
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* アクティブeSIMサマリーカード（複数対応カルーセル） */}
          {activeEsimList.length > 0 && (
            <div className="mb-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeEsimIndex}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeEsimData && (
                    <ActiveEsimSummary
                      esimLink={activeEsimData.link}
                      planName={activeEsimData.planName}
                      onViewDetail={() => setLocation(`/mypage/orders/${activeEsimData.link.orderId}`)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* 複数eSIMのナビゲーション */}
              {activeEsimList.length > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => setActiveEsimIndex((i) => Math.max(0, i - 1))}
                    disabled={clampedIndex === 0}
                    className="text-label text-[0.6rem] text-black/40 hover:text-black disabled:opacity-20 transition-colors duration-150 px-2 py-1"
                  >
                    ← Prev
                  </button>
                  <div className="flex items-center gap-1.5">
                    {activeEsimList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveEsimIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                          i === clampedIndex ? "bg-black scale-125" : "bg-black/20 hover:bg-black/40"
                        }`}
                        aria-label={`eSIM ${i + 1}`}
                      />
                    ))}
                    <span className="font-sans text-black/30 text-xs ml-2">{clampedIndex + 1} / {activeEsimList.length}</span>
                  </div>
                  <button
                    onClick={() => setActiveEsimIndex((i) => Math.min(activeEsimList.length - 1, i + 1))}
                    disabled={clampedIndex === activeEsimList.length - 1}
                    className="text-label text-[0.6rem] text-black/40 hover:text-black disabled:opacity-20 transition-colors duration-150 px-2 py-1"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* コンテンツ */}
          <div className="mb-10">
            {ordersLoading ? (
              <div className="py-16 flex justify-center"><Spinner /></div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-24">
                <p className="font-sans text-black/20 mb-4 text-[4rem] font-light leading-none">—</p>
                <p className="font-sans text-black/40 mb-8 text-base">No orders yet.</p>
                <Link href="/app">
                  <span className="text-label inline-block bg-black text-white px-8 py-3.5 text-[0.75rem] hover:bg-black/80 transition-colors duration-200 active:scale-[0.97] cursor-pointer">
                    Buy your first eSIM
                  </span>
                </Link>
              </div>
            ) : (
              <OrderList orders={orders} onSelect={(id) => setLocation(`/mypage/orders/${id}`)} esimByOrderId={esimByOrderId} />
            )}
          </div>

          {/* プロフィール編集セクション */}
          <ProfileSection />

        </div>
      </main>

      <Footer />
    </div>
  );
}
