import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  getByIdMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/services/MonthlyAdvanceService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/MonthlyAdvanceService")>(
    "@/lib/services/MonthlyAdvanceService"
  );

  return {
    ...actual,
    MonthlyAdvanceService: {
      list: serviceMocks.listMock,
      create: serviceMocks.createMock,
      getById: serviceMocks.getByIdMock,
      update: serviceMocks.updateMock,
      delete: serviceMocks.deleteMock,
    },
  };
});

const { listMock, createMock, getByIdMock, updateMock, deleteMock } = serviceMocks;

describe("Monthly advances API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TEST_AUTH_USER_ID = "user-1";
    process.env.TEST_AUTH_ROLE = "admin";
    delete process.env.TEST_AUTH_PROPERTY_ID;
  });

  it("lists monthly advances for authenticated tenant", async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: "mc-1",
          propertyId: "property-tenant",
          month: "2025-01-01",
          managerFee: 123.45,
          priceCold: 1.23,
          priceHotHeating: 2.34,
          priceHeating: 3.45,
          forecastCold: 10.1,
          forecastHot: 11.2,
          forecastHeating: 12.3,
          advancePayment: 345.67,
          createdAt: "2025-01-02T00:00:00.000Z",
          updatedAt: "2025-01-03T00:00:00.000Z",
        },
      ],
    });

    const { GET } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";
    process.env.TEST_AUTH_PROPERTY_ID = "property-tenant";

    const url = new URL("http://localhost/v1/monthly-advances");
    const response = await GET({
      request: new Request(url),
      locals: createLocals(),
      url,
    } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(listMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        role: "tenant",
        tenantPropertyId: "property-tenant",
      },
      expect.objectContaining({ propertyId: "property-tenant" })
    );
  });

  it("prevents non-admin users from creating monthly advances", async () => {
    const { POST } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";

    const url = new URL("http://localhost/v1/monthly-advances");
    const response = await POST({
      request: new Request(url, {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({}),
      }),
      locals: createLocals(),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps locked update errors to 422 status", async () => {
    const { MonthlyAdvanceServiceError } = await import("@/lib/services/MonthlyAdvanceService");

    updateMock.mockRejectedValue(new MonthlyAdvanceServiceError("MONTHLY_ADVANCE_LOCKED_BY_REPORTS", "locked"));

    const { PATCH } = await import("../[id]");

    process.env.TEST_AUTH_ROLE = "admin";

    const url = new URL("http://localhost/v1/monthly-advances/mc-1");
    const response = await PATCH({
      request: new Request(url, {
        method: "PATCH",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ managerFee: 200 }),
      }),
      locals: createLocals(),
      params: { id: "mc-1" },
    } as Parameters<typeof PATCH>[0]);

    expect(response.status).toBe(422);
  });

  it("deletes monthly advances for admin", async () => {
    deleteMock.mockResolvedValue(undefined);

    const { DELETE } = await import("../[id]");

    process.env.TEST_AUTH_ROLE = "admin";

    const url = new URL("http://localhost/v1/monthly-advances/mc-1");
    const response = await DELETE({
      request: new Request(url, {
        method: "DELETE",
      }),
      locals: createLocals(),
      params: { id: "mc-1" },
    } as Parameters<typeof DELETE>[0]);

    expect(response.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        role: "admin",
        tenantPropertyId: null,
      },
      "mc-1"
    );
  });
});

function createLocals() {
  return {
    supabase: {},
  } as unknown as App.Locals;
}
