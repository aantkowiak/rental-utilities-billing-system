import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMonthsMock = vi.fn();
const recomputeForReadingMock = vi.fn().mockImplementation(() => Promise.resolve());

vi.mock("@/lib/services/ReadingsService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/ReadingsService")>(
    "@/lib/services/ReadingsService"
  );
  return {
    ReadingsService: {
      updateMonths: updateMonthsMock,
    },
    ReadingsServiceError: actual.ReadingsServiceError,
  };
});

vi.mock("@/lib/services/ReportService", () => ({
  ReportService: {
    recomputeForReading: recomputeForReadingMock,
  },
}));

describe("PATCH /v1/readings/:id/months", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TEST_AUTH_USER_ID = "user-1";
    process.env.TEST_AUTH_ROLE = "admin";
  });

  it("requires admin role", async () => {
    process.env.TEST_AUTH_ROLE = "tenant";

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
    expect(recomputeForReadingMock).toHaveBeenCalledWith(expect.anything(), "reading-1");

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
