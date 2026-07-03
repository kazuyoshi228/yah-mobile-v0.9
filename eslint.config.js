// Flat ESLint config — 最小・堅牢志向。
// 目的は「未定義参照(no-undef)」「未使用の変数/インポート(no-unused-vars)」を機械検出し、
// 今回のような未定義プラグイン呼び出しやデッドコードの再発を防ぐこと。
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "dist/**",
      "dev-dist/**",
      "functions/lib/**",
      "client/public/**",
      "**/*.config.js",
      "**/*.config.ts",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,js}"],
    // no-explicit-any を無効化しているため、既存の該当 disable コメントは不要になるが
    // 大量のファイルに散在するため、未使用ディレクティブの警告は抑制する。
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // useEffect の依存配列は段階導入（警告）。既存の disable ディレクティブも解決される。
      "react-hooks/exhaustive-deps": "warn",
      // 未使用変数は警告（_ 接頭辞は意図的な無視として許可）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // 既存コードは any を多用しているため段階導入（まずは無効）
      "@typescript-eslint/no-explicit-any": "off",
      // Firestore の空 catch など、意図的な握りつぶしを許容
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // CommonJS の開発補助スクリプト（require 使用）向けの緩和
    files: ["**/*.cjs", "functions/add-dummy-topup.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
