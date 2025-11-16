import { describe, expect, it, beforeEach, vi } from "vitest";

const listMock = vi.fn();
const createMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

const CONTRACT_ID = "7969601d-b9cc-43bf-90df-969784aa87f1";

vi.mock("@/lib/services/ContractService", () => ({
  ContractService: {
    list: listMock,
    create: createMock,
    getById: getByIdMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

describe.skip("Contracts API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TEST_AUTH_USER_ID = "user-1";
    process.env.TEST_AUTH_ROLE = "admin";
    delete process.env.TEST_AUTH_PROPERTY_ID;
  });

  it("returns contracts for authenticated tenant", async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: "contract-1",
          propertyId: "property-1",
          tenantUserId: "user-1",
          period: { from: "2024-01-01", to: "2024-12-31" },
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });

    const { GET } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";

    const url = new URL("http://localhost/v1/contracts");
    const response = await GET({
      request: new Request(url),
      locals: createLocals(),
      url,
    } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.items).toHaveLength(1);
    expect(listMock).toHaveBeenCalledWith(
      expect.anything(),
      { role: "tenant", userId: "user-1" },
      expect.objectContaining({
        filters: {
          propertyId: undefined,
          tenantUserId: "user-1",
          active: undefined,
        },
      })
    );
  });

  it("rejects contract creation for non-admin users", async () => {
    const { POST } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";

    const url = new URL("http://localhost/v1/contracts");
    const response = await POST({
      request: new Request(url, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          propertyId: "property-1",
          tenantUserId: "user-2",
          period: { from: "2024-01-01", to: "2024-12-31" },
        }),
      }),
      locals: createLocals(),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 404 when contract detail is missing", async () => {
    getByIdMock.mockRejectedValue(new Error("CONTRACT_NOT_FOUND"));

    const { GET } = await import("../[contractId]");

    process.env.TEST_AUTH_ROLE = "tenant";

    const url = new URL(`http://localhost/v1/contracts/${CONTRACT_ID}`);
    const response = await GET({
      request: new Request(url),
      locals: createLocals(),
      params: { contractId: CONTRACT_ID },
      url,
    } as unknown as Parameters<typeof GET>[0]);

    expect(response.status).toBe(404);
    expect(getByIdMock).toHaveBeenCalledWith(expect.anything(), { role: "tenant", userId: "user-1" }, CONTRACT_ID);
  });
});

function createLocals() {
  return {
    supabase: {},
  } as unknown as App.Locals;
}
