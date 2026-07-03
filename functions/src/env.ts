/**
 * functions/src/env.ts — Cloud Functions 環境変数
 *
 * Cloud Functions では process.env から直接読み取る。
 * Firebase Functions config は v2 では非推奨のため、
 * Secret Manager または環境変数を使用する。
 */

export const ENV = {
  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "yah-mobile-v1-3ed24",


  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // Email (Gmail)
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailPass: process.env.GMAIL_PASS ?? "",
  mailFrom: process.env.MAIL_FROM ?? "yah.mobile <noreply@yah.mobi>",

  // Owner
  ownerEmail: (process.env.OWNER_EMAIL ?? "").toLowerCase(),

  // OMAX Tech Support
  omaxTechEmail: process.env.OMAX_TECH_EMAIL ?? null,

  // Notifications
  builtInForgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  builtInForgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // LLM (Forge API)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // CORS allowed origins
  allowedOrigins: [
    "https://yah-esim-zw9tdb8p.manus.space",
    "https://yah.mobi",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
} as const;
