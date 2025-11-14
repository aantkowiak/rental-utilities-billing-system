import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TenantReadingsHistory } from "@/components/readings/TenantReadingsHistory";
import { apiGet } from "@/lib/client/http";
import type { ReadingDTO } from "@/types";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
  };
});

const apiGetMock = apiGet as unknown as vi.Mock;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TenantReadingsHistory", () => {
  it("displays warning when no propertyId is provided", () => {
    render(<TenantReadingsHistory propertyId={null} />);

    expect(
      screen.getByText(/Brak przypisanej nieruchomości. Skontaktuj się z administratorem/i)
    ).toBeInTheDocument();
  });

  it("loads and displays readings for tenant", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [
        buildReading({
          id: "reading-1",
          readingAt: "2024-02-25T10:00:00Z",
          coldM3: 1050.5,
          hotM3: 525.25,
          heatingGj: 305.75,
          readingType: "regular",
        }),
        buildReading({
          id: "reading-2",
          readingAt: "2024-01-25T10:00:00Z",
          coldM3: 1040.0,
          hotM3: 520.0,
          heatingGj: 302.0,
          readingType: "baseline",
        }),
      ],
    });

    render(<TenantReadingsHistory propertyId="property-1" />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/readings?propertyId=property-1"));

    expect(await screen.findByText(/1050,5/i)).toBeInTheDocument();
    expect(screen.getByText(/525,25/i)).toBeInTheDocument();
    expect(screen.getByText(/305,75/i)).toBeInTheDocument();
    expect(screen.getByText(/Regularny/i)).toBeInTheDocument();
    
    // Check for baseline reading type badge (not header)
    const badges = screen.getAllByText(/Bazowy/i);
    const baselineBadge = badges.find((el) => el.tagName === "SPAN" && el.className.includes("border-amber"));
    expect(baselineBadge).toBeInTheDocument();
  });

  it("displays empty state when no readings exist", async () => {
    apiGetMock.mockResolvedValueOnce({ items: [] });

    render(<TenantReadingsHistory propertyId="property-1" />);

    expect(await screen.findByText(/Brak odczytów dla tej nieruchomości/i)).toBeInTheDocument();
  });

  it("displays error message on fetch failure", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do odczytów",
    });

    render(<TenantReadingsHistory propertyId="property-1" />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Brak dostępu do odczytów/i);
  });
});

function buildReading(overrides: Partial<ReadingDTO>): ReadingDTO {
  return {
    id: overrides.id ?? "reading-1",
    propertyId: overrides.propertyId ?? "property-1",
    readingAt: overrides.readingAt ?? "2024-02-25T10:00:00Z",
    effectiveMonth: overrides.effectiveMonth ?? null,
    origin: overrides.origin ?? "tenant",
    readingType: overrides.readingType ?? "regular",
    coldM3: overrides.coldM3 ?? 1000.0,
    hotM3: overrides.hotM3 ?? 500.0,
    heatingGj: overrides.heatingGj ?? 300.0,
    coldReplaced: overrides.coldReplaced ?? false,
    hotReplaced: overrides.hotReplaced ?? false,
    heatingReplaced: overrides.heatingReplaced ?? false,
    commentText: overrides.commentText ?? null,
    commentVisibleToTenant: overrides.commentVisibleToTenant ?? true,
    baseForMonth: overrides.baseForMonth ?? null,
    finalForMonth: overrides.finalForMonth ?? null,
    deletedAt: overrides.deletedAt ?? null,
    createdAt: overrides.createdAt ?? "2024-02-25T10:00:00Z",
    updatedAt: overrides.updatedAt ?? "2024-02-25T10:00:00Z",
  };
}

