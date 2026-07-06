import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";

/**
 * Google ポップアップログインを共通化するフック。
 *
 * - 必ず「ユーザーのクリックハンドラ内」で handleLogin() を呼ぶこと
 *   （setTimeout / Promise.then 経由だとブラウザにポップアップをブロックされる）。
 * - ポップアップのキャンセル/クローズ/連打はエラー扱いしない。
 * - ポップアップがブロックされた場合は fallbackHref（通常 /login?redirect=…）へ遷移。
 *   これによりプラン選択の引き継ぎ等（redirect先のパラメータ）も維持される。
 */
export function useGoogleLogin(opts?: { onSuccess?: () => void; fallbackHref?: string }) {
  const [pending, setPending] = useState(false);

  const handleLogin = async () => {
    if (pending) return;
    setPending(true);
    try {
      await signInWithGoogle();
      // 成功時は useAuth の user が更新され、各画面が自動的に再描画される
      opts?.onSuccess?.();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // ユーザーが閉じた / 連打 — 無視
      } else if (
        (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-environment") &&
        opts?.fallbackHref
      ) {
        // ポップアップがブロックされた場合は /login ページへフォールバック
        window.location.href = opts.fallbackHref;
      } else {
        console.error("Login failed:", e);
      }
    } finally {
      setPending(false);
    }
  };

  return { handleLogin, pending };
}
