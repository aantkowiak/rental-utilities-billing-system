import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TenantReportDetail } from "@/components/reports/TenantReportDetail";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TenantReportDetail", () => {
  it("renders report metadata, line items and totals once detail loads", async () => {
    apiGetMock.mockResolvedValueOnce({
      report: buildReport({ id: "report-42", month: "2024-02", balanceRaw: 12345 }),
      lineItems: [
        {
          id: "item-1",
          label: "Opłata serwisowa",
          description: "Opis pozycji",
          amountRaw: 4500,
          category: "Serwis",
        },
      ],
      lastEmailAttempt: buildEmailAttempt({ status: "sent" }),
      permissions: {
        canSendEmail: true,
      },
    });

    render(<TenantReportDetail reportId="report-42" />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reports/report-42"));

    expect(await screen.findByRole("heading", { name: /luty 2024/i })).toBeInTheDocument();
    expect(screen.getByText("Opłata serwisowa")).toBeInTheDocument();
    expect(screen.getByText("Opis pozycji")).toBeInTheDocument();
    expect(screen.getByText(/^Serwis$/i)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.replace(/\s+/g, " ").includes("123,45"))
    ).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*sent/i)).toBeInTheDocument();
  });

  it("shows error alert when report is not found", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "not_found",
      message: "Raport nie został odnaleziony",
    });

    render(<TenantReportDetail reportId="missing" />);

    expect(await screen.findByText("Raport nie został odnaleziony")).toBeInTheDocument();
  });

  it("shows access error when receiving 403 response", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do raportu",
    });

    render(<TenantReportDetail reportId="restricted" />);

    expect(await screen.findByText("Brak dostępu do raportu")).toBeInTheDocument();
  });

  it("resends report email and refetches details", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-7", month: "2024-03" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canSendEmail: true,
        },
      })
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-7", month: "2024-03", balanceRaw: 500 }),
        lineItems: [],
        lastEmailAttempt: buildEmailAttempt({ status: "sent", id: "attempt-2" }),
        permissions: {
          canSendEmail: true,
        },
      });

    apiPostMock.mockResolvedValueOnce({});

    render(<TenantReportDetail reportId="report-7" />);

    const resendButton = await screen.findByRole("button", { name: /Wyślij ponownie/i });
    fireEvent.click(resendButton);

    expect(resendButton).toBeDisabled();

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-7/send-email"));

    expect(await screen.findByText(/E-mail wysłany/i)).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(resendButton).not.toBeDisabled());
  });
});

function buildReport(overrides: Partial<ReportDTO>): ReportDTO {
  return {
    actualRentRaw: overrides.actualRentRaw ?? 10000,
    anchorReadingId: overrides.anchorReadingId ?? "anchor-1",
    anchorReadingNextId: overrides.anchorReadingNextId ?? "anchor-2",
    balanceRaw: overrides.balanceRaw ?? 0,
    contractId: overrides.contractId ?? "contract-1",
    createdAt: overrides.createdAt ?? "2024-02-01T10:00:00.000Z",
    fixedCostRaw: overrides.fixedCostRaw ?? 2000,
    id: overrides.id ?? "report-1",
    meterCostColdRaw: overrides.meterCostColdRaw ?? 3000,
    meterCostHeatingRaw: overrides.meterCostHeatingRaw ?? 4000,
    meterCostHotRaw: overrides.meterCostHotRaw ?? 5000,
    month: overrides.month ?? "2024-02",
    monthlyConditionsId: overrides.monthlyConditionsId ?? "conditions-1",
    realizedAt: overrides.realizedAt ?? null,
    status: overrides.status ?? "generated",
    updatedAt: overrides.updatedAt ?? "2024-02-02T12:00:00.000Z",
  };
}

function buildEmailAttempt(overrides: Partial<ReportEmailAttemptDTO>): ReportEmailAttemptDTO {
  return {
    attemptedAt: overrides.attemptedAt ?? "2024-02-03T08:00:00.000Z",
    errorMessage: overrides.errorMessage ?? null,
    id: overrides.id ?? "attempt-1",
    reportEmailId: overrides.reportEmailId ?? "email-1",
    status: overrides.status ?? "queued",
  };
}


