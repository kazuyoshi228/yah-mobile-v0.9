/**
 * useFirestoreCollection.ts — Firestore コレクション直接購読フック
 *
 * BaaS ネイティブ設計（AP-04）: Callable Functions を経由せず、
 * フロントエンドから Firestore を直接 onSnapshot / getDocs で購読する。
 *
 * 使い方:
 *   const { data, isLoading } = useFirestoreCollection<DbPlan>(
 *     () => query(collection(db, "plans"), where("isActive", "==", true))
 *   );
 */
import { useState, useEffect, useRef } from "react";
import {
  onSnapshot,
  getDocs,
  type Query,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import type { z } from "zod";

interface UseFirestoreCollectionOptions<T> {
  /** true: onSnapshot でリアルタイム購読（デフォルト）。false: getDocs で1回取得。 */
  realtime?: boolean;
  /** enabled が false のときはクエリを実行しない（認証待ちなどに使用）。 */
  enabled?: boolean;
  /** zod schema to validate the returned documents */
  schema?: z.ZodType<T>;
}

interface UseFirestoreCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Firestore コレクション/クエリを購読するカスタムフック。
 *
 * @param buildQuery - Firestore Query を返す関数。依存配列が変わると再実行される。
 * @param deps - buildQuery の依存配列（useMemo と同様）。
 * @param options - リアルタイム購読 or 1回取得、enabled フラグ。
 */
export function useFirestoreCollection<T = DocumentData>(
  buildQuery: () => Query<DocumentData>,
  deps: unknown[] = [],
  options: UseFirestoreCollectionOptions<T> = {}
): UseFirestoreCollectionResult<T> {
  const { realtime = true, enabled = true, schema } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // buildQuery を ref で安定させる（毎レンダーで新しい関数参照になるのを防ぐ）
  const buildQueryRef = useRef(buildQuery);
  buildQueryRef.current = buildQuery;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const q = buildQueryRef.current();
    // null/undefined クエリが渡された場合は何もしない（enabled チェックの補完）
    if (!q) {
      setIsLoading(false);
      return;
    }

    if (realtime) {
      const unsub = onSnapshot(
        q,
        (snap: QuerySnapshot<DocumentData>) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const validated = schema ? docs.map((doc) => {
            const res = schema.safeParse(doc);
            if (!res.success) {
              console.warn(`[useFirestoreCollection] Zod validation failed for doc ${doc.id}:`, res.error);
              return doc as T; // Fallback to raw data
            }
            return res.data;
          }) : docs as T[];
          setData(validated);
          setIsLoading(false);
        },
        (err) => {
          console.error("[useFirestoreCollection] onSnapshot error:", err);
          setError(err);
          setIsLoading(false);
        }
      );
      return () => unsub();
    } else {
      getDocs(q)
        .then((snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const validated = schema ? docs.map((doc) => {
            const res = schema.safeParse(doc);
            if (!res.success) {
              console.warn(`[useFirestoreCollection] Zod validation failed for doc ${doc.id}:`, res.error);
              return doc as T; // Fallback to raw data
            }
            return res.data;
          }) : docs as T[];
          setData(validated);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("[useFirestoreCollection] getDocs error:", err);
          setError(err);
          setIsLoading(false);
        });
    }
    // deps は呼び出し元が管理する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, realtime, ...deps]);

  return { data, isLoading, error };
}

/**
 * Firestore ドキュメントを1件購読するカスタムフック。
 */
export function useFirestoreDoc<T = DocumentData>(
  buildQuery: () => import("firebase/firestore").DocumentReference<DocumentData>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {}
): { data: T | null; isLoading: boolean; error: Error | null } {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const buildQueryRef = useRef(buildQuery);
  buildQueryRef.current = buildQuery;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = buildQueryRef.current();
    // null/undefined 参照が渡された場合は何もしない
    if (!ref) {
      setIsLoading(false);
      return;
    }
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
        setIsLoading(false);
      },
      (err) => {
        console.error("[useFirestoreDoc] onSnapshot error:", err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, isLoading, error };
}
