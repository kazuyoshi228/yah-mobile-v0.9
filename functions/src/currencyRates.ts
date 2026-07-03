import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";

const REGION = "asia-northeast1";
const TARGET_CURRENCIES = ["USD", "EUR", "TWD", "KRW", "THB", "SGD", "GBP", "CNY"];
const API_URL = "https://open.er-api.com/v6/latest/JPY";

// 毎日9:00 JST（= 0:00 UTC）に実行
export const updateCurrencyRates = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Tokyo",
    region: REGION,
  },
  async () => {
    const db = getFirestore();

    const response = await fetch(API_URL);
    const data = await response.json();
    if (data.result !== "success") throw new Error("API error: " + JSON.stringify(data));

    const rates: Record<string, number> = {};
    for (const code of TARGET_CURRENCIES) {
      if (data.rates[code]) rates[code] = data.rates[code];
    }

    await db.collection("currency_rates").doc("latest").set({
      base: "JPY",
      rates,
      updatedAt: Date.now(),
      source: "open.er-api.com",
    });

    logger.info(`[updateCurrencyRates] Saved rates for ${Object.keys(rates).length} currencies`);
  }
);
