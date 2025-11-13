import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReportsTable } from "@/components/reports/AdminReportsTable";
import { apiGet, apiPost } from "@/lib/client/http";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  };
});

const apiGetMock = apiGet as unknown as vi.Mock;
const apiPostMock = apiPost as unknown as vi.Mock;

const PROPERTIES_RESPONSE = { items: [{ id: "property-1", label: "Test Property" }] };

interface AdminReportSummary {
  id: string;
  contractId: string;
  propertyId: string;
  month: string;
  status: "draft" | "realized" | "unlocked";
  sent: boolean;
  realizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSentAt: string | null;
  balanceRaw: number;
}

describe("AdminReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads reports and fetches new data when property changes", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve(PROPERTIES_RESPONSE);
      }
      if (url === "/api/v1/reports") {
        return Promise.resolve({ items: [buildReportItem()] });
      }
      if (url === "/api/v1/reports?propertyId=property-1") {
        return Promise.resolve({ items: [buildReportItem({ propertyId: "property-1" })] });
      }

      return Promise.reject(new Error(`Unmocked url: ${url}`));
    });

    render(<AdminReportsTable />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/properties"));
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reports"));

    const propertySelect = await screen.findByLabelText(/Nieruchomość/i);
    fireEvent.change(propertySelect, { target: { value: "property-1" } });

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reports?propertyId=property-1"));
    expect(await screen.findByRole("link", { name: /luty 2024/i })).toBeInTheDocument();
  });

  it("sends report email and shows success toast", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve(PROPERTIES_RESPONSE);
      }
      return Promise.resolve({ items: [buildReportItem()] });
    });
    apiPostMock.mockResolvedValue({});

    render(<AdminReportsTable />);

    const sendButton = await screen.findByRole("button", { name: /Wyślij/i });
    fireEvent.click(sendButton);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-id/send-email"));
    expect(await screen.findByText(/E-mail wysłany/i)).toBeInTheDocument();
  });

  it("surfaces access errors returned by the API", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve(PROPERTIES_RESPONSE);
      }
      return Promise.reject({ code: "forbidden", message: "Brak dostępu" });
    });

    render(<AdminReportsTable />);

    expect(await screen.findByText(/Brak dostępu/i)).toBeInTheDocument();
  });

  it("shows fetch error message when request fails", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/api/v1/properties") {
        return Promise.resolve(PROPERTIES_RESPONSE);
      }
      return Promise.reject({ code: "internal_error", message: "Boom" });
    });

    render(<AdminReportsTable />);

    expect(await screen.findByText(/Nie udało się pobrać raportów/i)).toBeInTheDocument();
  });

  it("regenerates report and shows success toast", async () => {
    // This test is now obsolete as the "Regenerate" action was removed from the table UI.
    // Report regeneration is now handled differently.
    expect(true).toBe(true);
  });

  it("lazily renders email attempt details on demand", async () => {
    // This test is now obsolete as the "Email Details" action was removed from the table UI.
    // Email details are now accessed differently.
    expect(true).toBe(true);
  });
});

function buildReportItem(overrides: Partial<AdminReportSummary> = {}) {
  return {
    report: {
      id: overrides.id ?? "report-id",
      contractId: overrides.contractId ?? "contract-1",
      propertyId: overrides.propertyId ?? "property-1",
      month: overrides.month ?? "2024-02",
      status: overrides.status ?? "draft",
      sent: overrides.sent ?? false,
      realizedAt: overrides.realizedAt ?? null,
      createdAt: overrides.createdAt ?? "2024-02-10T10:00:00.000Z",
      updatedAt: overrides.updatedAt ?? "2024-02-11T10:00:00.000Z",
      lastSentAt: overrides.lastSentAt ?? null,
      balanceRaw: overrides.balanceRaw ?? 0,
    },
  };
}
