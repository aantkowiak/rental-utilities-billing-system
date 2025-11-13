import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMonthsMock = vi.fn();
const getByIdMock = vi.fn();
const recomputeAllMock = vi.fn().mockImplementation(() => Promise.resolve());
const requireAuthMock = vi.fn();

vi.mock("@/lib/services/ReadingsService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/ReadingsService")>(
    "@/lib/services/ReadingsService"
  );
  return {
    ReadingsService: {
      updateMonths: updateMonthsMock,
      getById: getByIdMock,
    },
    ReadingsServiceError: actual.ReadingsServiceError,
  };
});

vi.mock("@/lib/services/ReportService", () => ({
  ReportService: {
    recomputeAll: recomputeAllMock,
  },
}));

vi.mock("@/lib/api/auth", () => ({
  requireAuth: requireAuthMock,
}));

describe("PATCH /v1/readings/:id/months", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAuthMock.mockResolvedValue({
      success: true,
      user: { id: "admin-1" },
      role: "admin",
      propertyId: null,
    });
    getByIdMock.mockResolvedValue({
      id: "reading-1",
      baseForMonth: null,
      finalForMonth: null,
    });
  });

  it("requires admin role", async () => {
    requireAuthMock.mockResolvedValue({
      success: false,
      response: new Response(null, { status: 403 }),
    });

    const { PATCH } = await import("../[id]/months");

    const response = await PATCH({
      request: new Request("http://localhost/v1/readings/reading-1/months", {
        method: "PATCH",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ baseForMonth: "2024-05" }),
      }),
      locals: createLocals(),
      params: { id: "reading-1" },
    } as any);

    expect(response.status).toBe(403);
    expect(updateMonthsMock).not.toHaveBeenCalled();
  });

  it("updates base and final months", async () => {
    getByIdMock.mockResolvedValueOnce({
      id: "reading-1",
      baseForMonth: "2024-04-01",
      finalForMonth: "2024-05-01",
    });
    updateMonthsMock.mockResolvedValue({
      id: "reading-1",
      baseForMonth: "2024-05-01",
      finalForMonth: "2024-06-01",
    });

    const { PATCH } = await import("../[id]/months");

    const response = await PATCH({
      request: new Request("http://localhost/v1/readings/reading-1/months", {
        method: "PATCH",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          baseForMonth: "2024-05",
          finalForMonth: "2024-06",
        }),
      }),
      locals: createLocals(),
      params: { id: "reading-1" },
    } as any);

    expect(response.status).toBe(200);
    expect(updateMonthsMock).toHaveBeenCalledWith(expect.anything(), "reading-1", {
      baseForMonth: "2024-05",
      finalForMonth: "2024-06",
    });
    expect(recomputeAllMock).toHaveBeenCalledWith(expect.anything());

    const payload = await response.json();
    expect(payload.reading.baseForMonth).toBe("2024-05-01");
  });

  it("validates month format", async () => {
    const { PATCH } = await import("../[id]/months");

    const response = await PATCH({
      request: new Request("http://localhost/v1/readings/reading-1/months", {
        method: "PATCH",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ baseForMonth: "invalid" }),
      }),
      locals: createLocals(),
      params: { id: "reading-1" },
    } as any);

    expect(response.status).toBe(400);
    expect(updateMonthsMock).not.toHaveBeenCalled();
  });

  it("allows null values to clear months", async () => {
    getByIdMock.mockResolvedValueOnce({
      id: "reading-1",
      baseForMonth: "2024-04-01",
      finalForMonth: null,
    });
    updateMonthsMock.mockResolvedValue({
      id: "reading-1",
      baseForMonth: null,
      finalForMonth: null,
    });

    const { PATCH } = await import("../[id]/months");

    const response = await PATCH({
      request: new Request("http://localhost/v1/readings/reading-1/months", {
        method: "PATCH",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ baseForMonth: null }),
      }),
      locals: createLocals(),
      params: { id: "reading-1" },
    } as any);

    expect(response.status).toBe(200);
    expect(updateMonthsMock).toHaveBeenCalledWith(expect.anything(), "reading-1", {
      baseForMonth: null,
    });
  });
});

function createLocals() {
  return {
    supabase: {},
  } as App.Locals;
}
