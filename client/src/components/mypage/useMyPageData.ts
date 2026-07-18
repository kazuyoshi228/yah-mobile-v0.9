import { getFirebaseDb } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import { activePlansQuery } from "@/lib/queries";
import { toMillis } from "@/lib/format";
import type { EsimLink, OrderRow, EsimPreview, EsimPreviewMap } from "./types";

/**
 * MyPage の注文・eSIM リンクを Firestore onSnapshot でリアルタイム購読し、
 * 表示用の派生データ（orderId→eSIMプレビュー Map、アクティブeSIM一覧）を返す。
 */
// plan（providerPlanId / doc.id）→ { validityDays, name } の索引
type PlanInfo = { validityDays?: number | null; name?: string | null };

// createdAt の型ゆらぎ正規化は lib/format.ts の toMillis に共有化（OrderDetailPage と共用）

export function useMyPageData(uid: string | undefined) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [esimLinks, setEsimLinks] = useState<EsimLink[] | null>(null);
  const [planMap, setPlanMap] = useState<Map<string, PlanInfo>>(new Map());

  // 有効期間（validityDays）等を注文の providerPlanId / planId から引くための plans 索引
  useEffect(() => {
    const q = activePlansQuery();
    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const m = new Map<string, PlanInfo>();
        snap.docs.forEach((d) => {
          const p = d.data() as { providerPlanId?: string; validityDays?: number; name?: string };
          const info: PlanInfo = { validityDays: p.validityDays ?? null, name: p.name ?? null };
          m.set(d.id, info);
          if (p.providerPlanId) m.set(p.providerPlanId, info);
        });
        setPlanMap(m);
      },
      (err) => console.error("[useMyPageData] plans onSnapshot error:", err),
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) {
      setOrders(null);
      setOrdersLoading(false);
      setEsimLinks(null);
      return;
    }
    const ordersQuery = query(
      collection(getFirebaseDb(), "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap: QuerySnapshot<DocumentData>) => {
        // hiddenByUser フィールドが存在しない古い注文も含めてクライアント側でフィルタリング。
        // createdAt はミリ秒に正規化し、Firestore の型順序に依存せずクライアント側で降順ソートする。
        setOrders(
          snap.docs
            .map((d) => {
              const raw = d.data();
              return { id: d.id, ...raw, createdAt: toMillis(raw.createdAt) } as OrderRow;
            })
            .filter((o) => (o as unknown as { hiddenByUser?: boolean }).hiddenByUser !== true)
            .sort((a, b) => b.createdAt - a.createdAt)
        );
        setOrdersLoading(false);
      },
      (err) => {
        console.error("[useMyPageData] orders onSnapshot error:", err);
        setOrders([]);
        setOrdersLoading(false);
      },
    );
    const esimQuery = query(
      collection(getFirebaseDb(), "esim_links"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const unsubEsim = onSnapshot(
      esimQuery,
      (snap: QuerySnapshot<DocumentData>) => {
        setEsimLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EsimLink)));
      },
      (err) => {
        console.error("[useMyPageData] esim_links onSnapshot error:", err);
        setEsimLinks([]);
      },
    );
    return () => { unsubOrders(); unsubEsim(); };
  }, [uid]);

  // orderId → esimPreview のMap
  const esimByOrderId = useMemo<EsimPreviewMap>(
    () => new Map((esimLinks ?? []).map((e) => [e.orderId, e as EsimPreview])),
    [esimLinks],
  );

  // 注文の planName を plans から解決（古い注文は planName 未保存のため「Japan eSIM」になる）
  const resolvedOrders = useMemo(() => {
    if (!orders) return orders;
    return orders.map((o) => {
      if (o.planName) return o;
      const oo = o as unknown as { providerPlanId?: string; planId?: string };
      const plan = (oo.providerPlanId && planMap.get(oo.providerPlanId)) || (oo.planId && planMap.get(oo.planId)) || null;
      return plan?.name ? { ...o, planName: plan.name } : o;
    });
  }, [orders, planMap]);

  return { orders: resolvedOrders, ordersLoading, esimLinks, esimByOrderId };
}
