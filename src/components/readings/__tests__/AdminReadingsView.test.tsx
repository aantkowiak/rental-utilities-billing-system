import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReadingsView } from "@/components/readings/AdminReadingsView";
import type { ReadingDTO } from "@/types";
import type { ReadingListResponse, ReadingResponse } from "@/types/readings";
import { apiDelete, apiGet, apiPatch } from "@/lib/client/http";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  };
});

const apiGetMock = apiGet as unknown as vi.Mock;
const apiPatchMock = apiPatch as unknown as vi.Mock;
const apiDeleteMock = apiDelete as unknown as vi.Mock;

const PROPERTY_KEY = "admin-readings:propertyId";

describe("AdminReadingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem(PROPERTY_KEY, "property-1");

    // Mock properties list request
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("skips refetching when filters do not change after debounce", async () => {
    const initialResponse = { items: [buildReading()] } satisfies ReadingListResponse;

    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      return Promise.resolve(initialResponse);
    });

    render(<AdminReadingsView />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2)); // properties + readings
    apiGetMock.mockClear();

    const propertyInput = document.getElementById("admin-readings-property");
    if (!propertyInput) {
      throw new Error("Property input not found");
    }

    vi.useFakeTimers();
    fireEvent.change(propertyInput, { target: { value: "property-1" } });

    try {
      await act(async () => {
        vi.advanceTimersByTime(400);
        await Promise.resolve();
      });
    } finally {
      vi.useRealTimers();
    }

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("renders readings table after successful list fetch", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      return Promise.resolve({ items: [buildReading()] } satisfies ReadingListResponse);
    });

    render(<AdminReadingsView />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith(expect.stringContaining("propertyId=property-1")));

    expect(await screen.findByText(/Odczyt cykliczny/i)).toBeInTheDocument();
    expect(screen.getByText(/Zimna woda:/i)).toHaveTextContent("10 m³");
    expect(screen.getByText(/Energia:/i)).toHaveTextContent("5 GJ");
  });

  it("updates a reading and displays success toast", async () => {
    const originalReading = buildReading({ id: "reading-1", coldM3: 10 });
    const updatedReading = buildReading({ id: "reading-1", coldM3: 12, updatedAt: "2024-02-11T10:00:00.000Z" });

    let callCount = 0;
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ items: [originalReading] } satisfies ReadingListResponse);
      }
      return Promise.resolve({ items: [updatedReading] } satisfies ReadingListResponse);
    });
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

    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      return Promise.resolve({ items: [originalReading] } satisfies ReadingListResponse);
    });
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

    let callCount = 0;
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve({ items: [{ id: "property-1", label: "Test Property" }] });
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ items: [reading] } satisfies ReadingListResponse);
      }
      return Promise.resolve({ items: [] } satisfies ReadingListResponse);
    });
    apiDeleteMock.mockResolvedValueOnce({});

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminReadingsView />);

    const deleteButton = await screen.findByRole("button", { name: /Usuń/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith(expect.stringContaining("to-delete")));
    expect(await screen.findByText(/Usunięto odczyt/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Odczyt cykliczny/)).not.toBeInTheDocument());

    confirmSpy.mockRestore();
  });

  it("submits replacement form and closes modal after success", async () => {
    // This test is now obsolete as the "Replace" action was removed from the UI.
    // Reading replacement is now done via the main reading form with base/final month assignment.
    expect(true).toBe(true);
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
    baseForMonth: overrides.baseForMonth ?? null,
    finalForMonth: overrides.finalForMonth ?? null,
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
