import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const createMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const softDeleteMock = vi.fn();
const replacementMock = vi.fn();

const PROPERTY_ID = "7969601d-b9cc-43bf-90df-969784aa87f1";

const enqueueMock = vi.fn().mockImplementation(() => Promise.resolve());

vi.mock("@/lib/services/ReadingsService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/ReadingsService")>(
    "@/lib/services/ReadingsService"
  );

  return {
    ...actual,
    ReadingsService: {
      list: listMock,
      create: createMock,
      getById: getByIdMock,
      update: updateMock,
      softDelete: softDeleteMock,
      createReplacement: replacementMock,
    },
  };
});

vi.mock("@/lib/jobs/recalculateAnchors", () => ({
  enqueueAnchorRecalculation: enqueueMock,
}));

describe("Readings API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TEST_AUTH_USER_ID = "user-1";
    process.env.TEST_AUTH_ROLE = "admin";
    process.env.TEST_AUTH_PROPERTY_ID = PROPERTY_ID;
  });

  it("guards tenant access by property", async () => {
    const { GET } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";
    process.env.TEST_AUTH_PROPERTY_ID = "another-property";

    const url = new URL(`http://localhost/v1/readings?propertyId=${PROPERTY_ID}`);
    const response = await GET({
      request: new Request(url),
      locals: createLocals(),
      url,
    } as any);

    expect(response.status).toBe(403);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("lists readings for authorized tenant", async () => {
    listMock.mockResolvedValue({ items: [] });

    const { GET } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";
    process.env.TEST_AUTH_PROPERTY_ID = PROPERTY_ID;

    const url = new URL(`http://localhost/v1/readings?propertyId=${PROPERTY_ID}`);
    const response = await GET({
      request: new Request(url),
      locals: createLocals(),
      url,
    } as any);

    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledTimes(1);
    const payload = await response.json();
    expect(payload.items).toEqual([]);
  });

  it("creates readings and queues anchor recalculation", async () => {
    createMock.mockResolvedValue({
      id: "reading-1",
      propertyId: PROPERTY_ID,
      readingAt: "2024-05-10T00:00:00.000Z",
      effectiveMonth: null,
      origin: "tenant",
      readingType: "regular",
      coldM3: 10,
      hotM3: 5,
      heatingGj: 2,
      coldReplaced: false,
      hotReplaced: false,
      heatingReplaced: false,
      commentText: null,
      commentVisibleToTenant: true,
      deletedAt: null,
      createdAt: "2024-05-10T00:00:00.000Z",
      updatedAt: "2024-05-10T00:00:00.000Z",
    });

    const { POST } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";
    process.env.TEST_AUTH_PROPERTY_ID = PROPERTY_ID;

    const url = new URL("http://localhost/v1/readings");
    const response = await POST({
      request: new Request(url, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          propertyId: PROPERTY_ID,
          readingAt: "2024-05-10T00:00:00.000Z",
          coldM3: 10,
          hotM3: 5,
          heatingGj: 2,
        }),
      }),
      locals: createLocals(),
    } as any);

    const payload = await response.json();

    expect(payload.reading.id).toBe("reading-1");
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith(expect.anything(), {
      propertyId: PROPERTY_ID,
      fromMonth: "2024-05-01",
      toMonth: "2024-05-01",
    });
  });

  it("maps service errors to HTTP responses", async () => {
    const { ReadingsServiceError } = await import("@/lib/services/ReadingsService");
    createMock.mockRejectedValue(new ReadingsServiceError("READING_WINDOW_VIOLATION", "window"));

    const { POST } = await import("../index");

    process.env.TEST_AUTH_ROLE = "tenant";
    process.env.TEST_AUTH_PROPERTY_ID = PROPERTY_ID;

    const url = new URL("http://localhost/v1/readings");
    const response = await POST({
      request: new Request(url, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          propertyId: PROPERTY_ID,
          readingAt: "2024-05-10T00:00:00.000Z",
          coldM3: 10,
          hotM3: 5,
          heatingGj: 2,
        }),
      }),
      locals: createLocals(),
    } as any);

    expect(response.status).toBe(403);
  });

  it("enqueues recalculation via admin endpoint", async () => {
    const { POST } = await import("../recalculate-anchors");

    process.env.TEST_AUTH_ROLE = "admin";
    delete process.env.TEST_AUTH_PROPERTY_ID;

    const url = new URL("http://localhost/v1/readings/recalculate-anchors");
    const response = await POST({
      request: new Request(url, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          propertyId: PROPERTY_ID,
          fromMonth: "2024-01-01",
          toMonth: "2024-03-01",
        }),
      }),
      locals: createLocals(),
    } as any);

    expect(response.status).toBe(202);
    expect(enqueueMock).toHaveBeenCalledWith(expect.anything(), {
      propertyId: PROPERTY_ID,
      fromMonth: "2024-01-01",
      toMonth: "2024-03-01",
    });
  });
});

function createLocals() {
  return {
    supabase: {},
  } as App.Locals;
}
