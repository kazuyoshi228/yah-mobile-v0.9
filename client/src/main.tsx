import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // i18n初期化
import { loadUmamiIfConsented } from "@/lib/analytics";

// 同意済みユーザーの場合のみ、サードパーティ解析を起動時に動的ロードする
loadUmamiIfConsented();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5分
    },
  },
});

// Callable Functions のエラーハンドリング（未認証 → ログインページへ）
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error as Error | null;
    if (!error) return;
    console.error("[API Query Error]", error);
    // Firebase Callable Functions の未認証エラー
    if (error.message?.includes("unauthenticated") || error.message?.includes("UNAUTHENTICATED")) {
      window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
    }
    if (error.message?.includes("EMAIL_NOT_ALLOWED") || error.message?.includes("email-not-allowed")) {
      window.location.href = "/unauthorized";
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error as Error | null;
    if (!error) return;
    console.error("[API Mutation Error]", error);
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
