import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProvisioningFailure, ProvisioningContext } from "./esimRetryService";
import * as db from "./db";
import * as notify from "./adapters/notify";

// Mock ENV
vi.mock("./env", () => ({
  ENV: {
    ownerEmail: "owner@example.com",
    omaxTechEmail: "tech@example.com"
  }
}));

// Mock DB
vi.mock("./db", () => ({
  createRetryJob: vi.fn(),
  createIncidentLog: vi.fn(),
  updateOrder: vi.fn(),
  createEsimLink: vi.fn(),
  createEsimActivation: vi.fn(),
  getEsimLinkByOrderId: vi.fn(),
  createNotification: vi.fn(),
  getUserById: vi.fn(),
  getPendingRetryJobs: vi.fn(),
  updateRetryJob: vi.fn(),
  resolveIncident: vi.fn(),
  markIncidentNotified: vi.fn(),
  collections: {}
}));

// Mock notify
vi.mock("./adapters/notify", () => ({
  notifyOwner: vi.fn()
}));

// Mock mailer
vi.mock("./mailer", () => ({
  sendEmail: vi.fn(),
  buildEsimDelayedEmail: vi.fn(),
  buildEsimFailedEmail: vi.fn(),
  buildEsimReadyEmail: vi.fn(),
}));

describe("esimRetryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleProvisioningFailure", () => {
    it("should create a retry job, incident log, and send notifications", async () => {
      (db.createRetryJob as any).mockResolvedValue("job_123");
      (db.createIncidentLog as any).mockResolvedValue("incident_456");

      const ctx: ProvisioningContext = {
        orderId: "order_123",
        userId: "user_123",
        bappyPlanId: "plan_123",
        stripeSessionId: "cs_test_123",
        isTopup: false,
      };

      const error = new Error("Bappy API is down");

      await handleProvisioningFailure(ctx, error);

      expect(db.createRetryJob).toHaveBeenCalledWith({
        orderId: "order_123",
        userId: "user_123",
        bappyPlanId: "plan_123",
        stripeSessionId: "cs_test_123",
        isTopup: false,
        parentOrderId: null,
        esimLinkUuid: null,
        maxRetries: 3,
      });

      expect(db.createIncidentLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "esim_failure",
          severity: "critical",
          orderId: "order_123",
          userId: "user_123",
        })
      );

      expect(notify.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("order_123"),
          content: expect.stringContaining("Bappy API is down")
        })
      );
    });
  });
});
