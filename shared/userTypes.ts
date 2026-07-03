/**
 * FsUser — Firestore users コレクションのドキュメント型
 * サーバー（functions/src/db.ts）とクライアント（useAuth.ts）で共有する。
 *
 * 唯一の定義は shared/types.ts にあり、ここでは後方互換のため再エクスポートする。
 */
export type { FsUser } from "./types";
