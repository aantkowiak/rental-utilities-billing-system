import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSentMock = vi.fn();
const regenerateMock = vi.fn();
const getItemsMock = vi.fn();
const getByIdMock = vi.fn();
const requireAuthMock = vi.fn();

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

vi.mock("@/lib/api/auth", () => ({
  requireAuth: requireAuthMock,
}));

describe("Report API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAuthMock.mockResolvedValue({
      success: true,
      user: { id: "user-1" },
      role: "admin",
      propertyId: null,
    });
  });

  describe("PATCH /v1/reports/:id/sent", () => {
    it("requires admin role", async () => {
      requireAuthMock.mockResolvedValueOnce({
        success: false,
        response: new Response(null, { status: 403 }),
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
      requireAuthMock.mockResolvedValueOnce({
        success: false,
        response: new Response(null, { status: 403 }),
      });

      vi.resetModules();
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
      requireAuthMock.mockResolvedValue({
        success: true,
        user: { id: "user-1" },
        role: "admin",
        propertyId: undefined,
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
    it("returns report items with monthly advance info", async () => {
      getByIdMock.mockResolvedValue({
        id: "report-1",
        contractId: "contract-1",
        propertyId: "property-1",
        month: "2024-05",
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

      const mockMonthlyAdvance = {
        id: "advance-1",
        property_id: "property-1",
        month: "2024-05-01",
        manager_fee: 50000, // 500.00 PLN in raw
        price_cold: 1000, // 10.00 PLN in raw
        price_hot_heating: 1500, // 15.00 PLN in raw
        price_heating: 2000, // 20.00 PLN in raw
        forecast_cold: 10,
        forecast_hot: 5,
        forecast_heating: 2,
        advance_payment: 60000, // 600.00 PLN in raw
      };

      const { GET } = await import("../[id]/items");

      const response = await GET({
        request: new Request("http://localhost/v1/reports/report-1/items"),
        locals: createLocals(mockMonthlyAdvance),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(200);
      expect(getByIdMock).toHaveBeenCalled();
      expect(getItemsMock).toHaveBeenCalledWith(expect.anything(), "report-1");

      const payload = await response.json();
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0].meterLabel).toBe("Licznik 1");
      expect(payload.monthlyAdvance).toBeDefined();
      expect(payload.monthlyAdvance?.managerFeeRaw).toBe(50000);
      // Prices
      expect(payload.monthlyAdvance?.priceColdRaw).toBe(1000);
      expect(payload.monthlyAdvance?.priceHotHeatingRaw).toBe(1500);
      expect(payload.monthlyAdvance?.priceHeatingRaw).toBe(2000);
      // Forecasts
      expect(payload.monthlyAdvance?.forecastColdM3).toBe(10);
      expect(payload.monthlyAdvance?.forecastHotM3).toBe(5);
      expect(payload.monthlyAdvance?.forecastHeatingGj).toBe(2);
      // Advances
      expect(payload.monthlyAdvance?.advanceColdRaw).toBe(10000); // 10 * 1000
      expect(payload.monthlyAdvance?.advanceHotRaw).toBe(12500); // 5 * (1000 + 1500)
      expect(payload.monthlyAdvance?.advanceHeatingRaw).toBe(4000); // 2 * 2000
    });

    it("handles missing monthly advance gracefully", async () => {
      getByIdMock.mockResolvedValue({
        id: "report-1",
        contractId: "contract-1",
        propertyId: "property-1",
        month: "2024-05",
      });
      getItemsMock.mockResolvedValue([
        {
          id: "item-1",
          reportId: "report-1",
          propertyId: "property-1",
          amount: 25000,
        },
      ]);

      const { GET } = await import("../[id]/items");

      const response = await GET({
        request: new Request("http://localhost/v1/reports/report-1/items"),
        locals: createLocals(null),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.monthlyAdvance).toBeNull();
    });

    it("requires authentication", async () => {
      requireAuthMock.mockResolvedValueOnce({
        success: false,
        response: new Response(null, { status: 401 }),
      });

      // Clear module cache to ensure fresh import with new mock
      vi.resetModules();
      const { GET } = await import("../[id]/items");

      const response = await GET({
        request: new Request("http://localhost/v1/reports/report-1/items"),
        locals: createLocals(),
        params: { id: "report-1" },
      } as any);

      expect(response.status).toBe(401);
      expect(getByIdMock).not.toHaveBeenCalled();
      expect(getItemsMock).not.toHaveBeenCalled();
    });
  });
});

function createLocals(monthlyAdvanceData?: any) {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "monthly_advances") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => ({
                    data: monthlyAdvanceData ?? null,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      }),
    },
  } as App.Locals;
}
