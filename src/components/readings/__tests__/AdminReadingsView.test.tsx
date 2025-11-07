import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReadingsView } from "@/components/readings/AdminReadingsView";
import type { ReadingDTO } from "@/types";
import type { ReadingListResponse, ReadingResponse } from "@/types/readings";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client/http";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  };
});

const apiGetMock = apiGet as unknown as vi.Mock;
const apiPostMock = apiPost as unknown as vi.Mock;
const apiPatchMock = apiPatch as unknown as vi.Mock;
const apiDeleteMock = apiDelete as unknown as vi.Mock;

const PROPERTY_KEY = "admin-readings:propertyId";
const MONTH_KEY = "admin-readings:month";

describe("AdminReadingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem(PROPERTY_KEY, "property-1");
    window.localStorage.setItem(MONTH_KEY, "2024-02");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders readings table after successful list fetch", async () => {
    apiGetMock.mockResolvedValueOnce({ items: [buildReading()] } satisfies ReadingListResponse);

    render(<AdminReadingsView />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith(expect.stringContaining("propertyId=property-1")));

    expect(await screen.findByText(/Regularny/i)).toBeInTheDocument();
    expect(screen.getByText(/Zimna woda:/i)).toHaveTextContent("10 m³");
    expect(screen.getByText(/Energia:/i)).toHaveTextContent("5 GJ");
  });

  it("updates a reading and displays success toast", async () => {
    const originalReading = buildReading({ id: "reading-1", coldM3: 10 });
    const updatedReading = buildReading({ id: "reading-1", coldM3: 12, updatedAt: "2024-02-11T10:00:00.000Z" });

    apiGetMock
      .mockResolvedValueOnce({ items: [originalReading] } satisfies ReadingListResponse)
      .mockResolvedValueOnce({ items: [updatedReading] } satisfies ReadingListResponse);
    apiPatchMock.mockResolvedValueOnce({ reading: updatedReading } satisfies ReadingResponse);

    render(<AdminReadingsView />);

    const editButton = await screen.findByRole("button", { name: /Edytuj/i });
    fireEvent.click(editButton);

    const coldInput = await screen.findByLabelText(/Zimna woda/i);
    fireEvent.change(coldInput, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz zmiany/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        expect.stringContaining("reading-1"),
        expect.objectContaining({ coldM3: 12 })
      )
    );

    expect(await screen.findByText(/Zaktualizowano odczyt/i)).toBeInTheDocument();
  });

  it("maps validation errors when update fails with validation_error", async () => {
    const originalReading = buildReading({ id: "reading-422", hotM3: 15 });

    apiGetMock.mockResolvedValueOnce({ items: [originalReading] } satisfies ReadingListResponse);
    apiPatchMock.mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: { hotM3: "Za duża wartość" },
    });

    render(<AdminReadingsView />);

    const editButton = await screen.findByRole("button", { name: /Edytuj/i });
    fireEvent.click(editButton);

    const hotInput = await screen.findByLabelText(/Ciepła woda/i);
    fireEvent.change(hotInput, { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz zmiany/i }));

    expect(await screen.findByText("Za duża wartość")).toBeInTheDocument();
    expect(apiPatchMock).toHaveBeenCalledTimes(1);
  });

  it("deletes a reading after confirmation and refetches list", async () => {
    const reading = buildReading({ id: "to-delete" });

    apiGetMock
      .mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse)
      .mockResolvedValueOnce({ items: [] } satisfies ReadingListResponse);
    apiDeleteMock.mockResolvedValueOnce({});

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminReadingsView />);

    const deleteButton = await screen.findByRole("button", { name: /Usuń/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith(expect.stringContaining("to-delete")));
    expect(await screen.findByText(/Usunięto odczyt/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Regularny/)).not.toBeInTheDocument());

    confirmSpy.mockRestore();
  });

  it("submits replacement form and closes modal after success", async () => {
    const reading = buildReading({ id: "replacement-source" });

    apiGetMock
      .mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse)
      .mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse);
    apiPostMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    render(<AdminReadingsView />);

    const replaceButton = await screen.findByRole("button", { name: /Zastąp/i });
    fireEvent.click(replaceButton);

    expect(await screen.findByRole("dialog", { name: /Odczyt zastępczy/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Zapisz odczyt zastępczy/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenNthCalledWith(
        1,
        "/api/v1/readings/replacement-source/replacement",
        expect.objectContaining({ propertyId: "property-1" })
      )
    );
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenNthCalledWith(
        2,
        "/api/v1/readings/recalculate-anchors",
        expect.objectContaining({ propertyId: "property-1" })
      )
    );

    expect(await screen.findByText(/Dodano odczyt zastępczy/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("plans anchor recalculation and hides overlay after completion", async () => {
    const reading = buildReading({ id: "anchor-reading" });

    apiGetMock
      .mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse)
      .mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse);

    let resolvePost: ((value: unknown) => void) | undefined;
    apiPostMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    render(<AdminReadingsView />);

    const planButton = await screen.findByRole("button", { name: /Zaplanuj przeliczenie/i });
    fireEvent.click(planButton);

    expect(await screen.findByText(/Planowanie przeliczenia kotwic/i)).toBeInTheDocument();

    resolvePost?.({});

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/v1/readings/recalculate-anchors",
        expect.objectContaining({
          propertyId: "property-1",
        })
      )
    );

    await waitFor(() => expect(screen.queryByText(/Planowanie przeliczenia kotwic/i)).not.toBeInTheDocument());
    expect(await screen.findByText(/Rekalkulacja zaplanowana/i)).toBeInTheDocument();
  });
});

function buildReading(overrides: Partial<ReadingDTO> = {}): ReadingDTO {
  return {
    id: "reading-id",
    propertyId: "property-1",
    readingAt: overrides.readingAt ?? "2024-02-10T10:00:00.000Z",
    effectiveMonth: overrides.effectiveMonth ?? null,
    origin: overrides.origin ?? "tenant",
    readingType: overrides.readingType ?? "regular",
    coldM3: overrides.coldM3 ?? 10,
    hotM3: overrides.hotM3 ?? 8,
    heatingGj: overrides.heatingGj ?? 5,
    coldReplaced: overrides.coldReplaced ?? false,
    hotReplaced: overrides.hotReplaced ?? false,
    heatingReplaced: overrides.heatingReplaced ?? false,
    commentText: overrides.commentText ?? null,
    commentVisibleToTenant: overrides.commentVisibleToTenant ?? false,
    deletedAt: overrides.deletedAt ?? null,
    createdAt: overrides.createdAt ?? "2024-02-10T10:10:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-02-10T10:10:00.000Z",
    ...overrides,
  };
}


