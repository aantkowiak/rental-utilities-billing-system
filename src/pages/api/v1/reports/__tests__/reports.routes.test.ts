import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSentMock = vi.fn();
const regenerateMock = vi.fn();
const getItemsMock = vi.fn();
const getByIdMock = vi.fn();

vi.mock("@/lib/services/ReportService", () => ({
  ReportService: {
    updateSent: updateSentMock,
    regenerate: regenerateMock,
    getItems: getItemsMock,
    getById: getByIdMock,
  },
  ReportServiceError: class ReportServiceError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe("Report API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TEST_AUTH_USER_ID = "user-1";
    process.env.TEST_AUTH_ROLE = "admin";
  });

  describe("PATCH /v1/reports/:id/sent", () => {
    it("requires admin role", async () => {
      process.env.TEST_AUTH_ROLE = "tenant";

      const { PATCH } = await import("../[id]/sent");

      const response = await PATCH({
        request: new Request("http://localhost/v1/reports/report-1/sent", {
          method: "PATCH",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sent: true }),
        }),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(403);
      expect(updateSentMock).not.toHaveBeenCalled();
    });

    it("updates sent status to true", async () => {
      updateSentMock.mockResolvedValue({
        id: "report-1",
        sent: true,
      });

      const { PATCH } = await import("../[id]/sent");

      const response = await PATCH({
        request: new Request("http://localhost/v1/reports/report-1/sent", {
          method: "PATCH",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sent: true }),
        }),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(200);
      expect(updateSentMock).toHaveBeenCalledWith(expect.anything(), "report-1", true);

      const payload = await response.json();
      expect(payload.report.sent).toBe(true);
    });

    it("validates sent field is boolean", async () => {
      const { PATCH } = await import("../[id]/sent");

      const response = await PATCH({
        request: new Request("http://localhost/v1/reports/report-1/sent", {
          method: "PATCH",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sent: "yes" }),
        }),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(400);
      expect(updateSentMock).not.toHaveBeenCalled();
    });
  });

  describe("POST /v1/reports/:id/regenerate", () => {
    it("requires admin role", async () => {
      process.env.TEST_AUTH_ROLE = "tenant";

      const { POST } = await import("../[id]/regenerate");

      const response = await POST({
        request: new Request("http://localhost/v1/reports/report-1/regenerate", {
          method: "POST",
        }),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(403);
      expect(regenerateMock).not.toHaveBeenCalled();
    });

    it("regenerates report", async () => {
      regenerateMock.mockResolvedValue({
        id: "report-1",
        month: "2024-05-01",
      });

      const { POST } = await import("../[id]/regenerate");

      const response = await POST({
        request: new Request("http://localhost/v1/reports/report-1/regenerate", {
          method: "POST",
        }),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(200);
      expect(regenerateMock).toHaveBeenCalledWith(
        expect.anything(),
        { role: "admin", propertyId: undefined },
        "report-1"
      );

      const payload = await response.json();
      expect(payload.report.id).toBe("report-1");
    });
  });

  describe("GET /v1/reports/:id/items", () => {
    it("returns report items", async () => {
      getByIdMock.mockResolvedValue({
        id: "report-1",
        contractId: "contract-1",
      });
      getItemsMock.mockResolvedValue([
        {
          id: "item-1",
          reportId: "report-1",
          propertyId: "property-1",
          meterLabel: "Licznik 1",
          coldM3Usage: 10,
          hotM3Usage: 5,
          heatingGjUsage: 2,
          amount: 25000,
        },
      ]);

      const { GET } = await import("../[id]/items");

      const response = await GET({
        request: new Request("http://localhost/v1/reports/report-1/items"),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(200);
      expect(getByIdMock).toHaveBeenCalled();
      expect(getItemsMock).toHaveBeenCalledWith(expect.anything(), "report-1");

      const payload = await response.json();
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0].meterLabel).toBe("Licznik 1");
    });

    it("requires authentication", async () => {
      const originalUserId = process.env.TEST_AUTH_USER_ID;
      delete process.env.TEST_AUTH_USER_ID;

      const { GET } = await import("../[id]/items");

      const response = await GET({
        request: new Request("http://localhost/v1/reports/report-1/items"),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(401);
      expect(getByIdMock).not.toHaveBeenCalled();
      expect(getItemsMock).not.toHaveBeenCalled();

      // Restore
      if (originalUserId) {
        process.env.TEST_AUTH_USER_ID = originalUserId;
      }
    });
  });
});

function createLocals() {
  return {
    supabase: {},
  } as App.Locals;
}
