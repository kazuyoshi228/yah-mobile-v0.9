import * as logger from "firebase-functions/logger";
/**
 * functions/src/adapters/notify.ts — オーナー通知アダプター
 */
export interface NotifyOptions {
  title: string;
  content: string;
}

async function notifyViaForge(opts: NotifyOptions): Promise<boolean> {
  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeApiUrl || !forgeApiKey) {
    logger.warn("[notify/forge] BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set");
    return false;
  }
  const normalizedBase = forgeApiUrl.endsWith("/") ? forgeApiUrl : `${forgeApiUrl}/`;
  const endpoint = new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title: opts.title, content: opts.content }),
    });
    if (!res.ok) {
      logger.warn(`[notify/forge] HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("[notify/forge] Error:", err);
    return false;
  }
}

async function notifyViaSlack(opts: NotifyOptions): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn("[notify/slack] SLACK_WEBHOOK_URL is not set");
    return false;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*${opts.title}*\n${opts.content}` }),
    });
    if (!res.ok) {
      logger.warn(`[notify/slack] HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("[notify/slack] Error:", err);
    return false;
  }
}

export async function notifyOwner(opts: NotifyOptions): Promise<boolean> {
  const provider = process.env.NOTIFY_PROVIDER ?? "forge";
  switch (provider) {
    case "forge":
      return notifyViaForge(opts);
    case "slack":
      return notifyViaSlack(opts);
    default:
      logger.warn(`[notify] Unknown NOTIFY_PROVIDER: "${provider}"`);
      return false;
  }
}
