import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TenantReportsView } from "@/components/reports/TenantReportsTable";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";
import type { GenerateReportCmd } from "@/types";
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

beforeAll(() => {
  if (!globalThis.crypto) {
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
    return;
  }

  if (!("randomUUID" in globalThis.crypto)) {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: () => "test-uuid",
      configurable: true,
    });
  }
});

describe("TenantReportsTable", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders items for tenant with propertyId", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [buildTenantReportListItem({ report: buildReport({ id: "r-1", month: "2024-02" }) })],
    });

    render(<TenantReportsView propertyId="property-1" initialMonth="2024-02" />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reports?propertyId=property-1"));
    expect(await screen.findByRole("link", { name: /luty 2024/i })).toBeInTheDocument();
  });

  it("handles generate and resend actions with pending state and success toasts", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        items: [
          buildTenantReportListItem({
            report: buildReport({ id: "report-1", month: "2024-02" }),
            permissions: {
              canGenerate: true,
              canSendEmail: true,
            },
          }),
        ],
      })
      .mockResolvedValueOnce({
        items: [
          buildTenantReportListItem({
            report: buildReport({ id: "report-1", month: "2024-02", status: "generated" }),
            permissions: {
              canGenerate: true,
              canSendEmail: true,
            },
          }),
        ],
      })
      .mockResolvedValueOnce({
        items: [
          buildTenantReportListItem({
            report: buildReport({ id: "report-1", month: "2024-02", status: "generated" }),
            permissions: {
              canGenerate: true,
              canSendEmail: true,
            },
            lastEmailAttempt: buildEmailAttempt({ id: "attempt-2", status: "success" }),
          }),
        ],
      });

    apiPostMock.mockResolvedValue({ ok: true });

    render(<TenantReportsView propertyId="property-1" initialMonth="2024-02" />);

    const generateButton = await screen.findByRole("button", { name: /Generuj/i });
    const resendButton = screen.getByRole("button", { name: /Wyślij ponownie/i });

    fireEvent.click(generateButton);

    expect(generateButton).toBeDisabled();
    expect(resendButton).toBeDisabled();

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/generate", expect.any(Object)));
    const [, generatePayload] = apiPostMock.mock.calls[0] as [string, GenerateReportCmd];
    expect(generatePayload).toMatchObject({ contractId: "contract-report-1", month: "2024-02" });

    expect(await screen.findByText(/Raport generowany/i)).toBeInTheDocument();

    await waitFor(() => expect(resendButton).not.toBeDisabled());

    fireEvent.click(resendButton);
    expect(resendButton).toBeDisabled();

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-1/send-email"));
    expect(await screen.findByText(/E-mail wysłany/i)).toBeInTheDocument();
  });

  it("displays disabled reasons on action buttons", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [
        buildTenantReportListItem({
          report: buildReport({ id: "report-1" }),
          permissions: {
            canGenerate: false,
            generateDisabledReason: "Brak danych wejściowych",
            canSendEmail: false,
            sendEmailDisabledReason: "Raport nie został wygenerowany",
          },
        }),
      ],
    });

    render(<TenantReportsView propertyId="property-1" initialMonth="2024-02" />);

    const generateButton = await screen.findByRole("button", { name: /Generuj/i });
    const resendButton = screen.getByRole("button", { name: /Wyślij ponownie/i });

    expect(generateButton).toBeDisabled();
    expect(generateButton).toHaveAttribute("title", "Brak danych wejściowych");
    expect(resendButton).toBeDisabled();
    expect(resendButton).toHaveAttribute("title", "Raport nie został wygenerowany");
  });

  it("renders access error for forbidden response", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do raportów",
    });

    render(<TenantReportsView propertyId="property-1" initialMonth="2024-02" />);

    expect(await screen.findByText(/Brak dostępu do raportów/i)).toBeInTheDocument();
  });

  it("displays warning when no propertyId is provided", async () => {
    render(<TenantReportsView propertyId={null} />);

    expect(
      await screen.findByText(/Brak przypisanej nieruchomości. Skontaktuj się z administratorem/i)
    ).toBeInTheDocument();
  });
});

function buildTenantReportListItem({
  report,
  permissions,
  lastEmailAttempt,
}: {
  report?: ReportDTO;
  permissions?: {
    canGenerate?: boolean;
    generateDisabledReason?: string | null;
    canSendEmail?: boolean;
    sendEmailDisabledReason?: string | null;
  } | null;
  lastEmailAttempt?: ReportEmailAttemptDTO | null;
} = {}) {
  return {
    report: report ?? buildReport({}),
    lastEmailAttempt: lastEmailAttempt ?? null,
    permissions: permissions ?? {
      canGenerate: true,
      generateDisabledReason: null,
      canSendEmail: true,
      sendEmailDisabledReason: null,
    },
  };
}

function buildReport(overrides: Partial<ReportDTO>): ReportDTO {
  return {
    contractId: overrides.contractId ?? `contract-${overrides.id ?? "report-1"}`,
    createdAt: overrides.createdAt ?? new Date("2024-02-01T00:00:00Z").toISOString(),
    id: overrides.id ?? "report-1",
    month: overrides.month ?? "2024-02",
    realizedAt: overrides.realizedAt ?? null,
    sent: overrides.sent ?? false,
    status: overrides.status ?? "pending",
    updatedAt: overrides.updatedAt ?? new Date("2024-02-01T00:00:00Z").toISOString(),
  };
}

function buildEmailAttempt(overrides: Partial<ReportEmailAttemptDTO>): ReportEmailAttemptDTO {
  return {
    attemptedAt: overrides.attemptedAt ?? new Date("2024-02-03T12:00:00Z").toISOString(),
    errorMessage: overrides.errorMessage ?? null,
    id: overrides.id ?? "attempt-1",
    reportEmailId: overrides.reportEmailId ?? "email-1",
    status: overrides.status ?? "queued",
  };
}
