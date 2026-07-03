import * as logger from "firebase-functions/logger";
/**
 * functions/src/scheduled.ts — Consolidated scheduled cron background jobs
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { processPendingRetries } from "./esimRetryService";

import { defineSecret } from "firebase-functions/params";

const omaxClientId = defineSecret("OMAX_CLIENT_ID");
const omaxClientSecret = defineSecret("OMAX_CLIENT_SECRET");
const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");
// リトライ結果のオーナー通知（Forge/Slack）で使用
const forgeApiKey = defineSecret("BUILT_IN_FORGE_API_KEY");
const slackWebhookUrl = defineSecret("SLACK_WEBHOOK_URL");

export const esimRetryJob = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "asia-northeast1",
    timeoutSeconds: 300,
    secrets: [omaxClientId, omaxClientSecret, gmailUser, gmailPass, forgeApiKey, slackWebhookUrl],
  },
  async () => {
    logger.info("[esimRetryJob] Starting eSIM retry job...");
    try {
      const result = await processPendingRetries();
      logger.info(
        `[esimRetryJob] Processed ${result.processed} retries, ${result.succeeded} succeeded, ${result.failed} failed`
      );
    } catch (err) {
      logger.error("[esimRetryJob] Error:", err);
    }
  }
);
