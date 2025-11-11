import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReportDetail } from "@/components/reports/AdminReportDetail";
import { apiGet, apiPost } from "@/lib/client/http";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";

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

beforeEach(() => {
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true)
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminReportDetail", () => {
  it("renders report metadata, line items and totals after successful load", async () => {
    apiGetMock.mockResolvedValueOnce({
      report: buildReport({ id: "report-42", month: "2024-02" }),
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
        canRegenerate: true,
        canSendEmail: true,
        canToggleRealized: true,
      },
    });

    render(<AdminReportDetail reportId="report-42" />);

    expect(await screen.findByRole("heading", { name: /luty 2024/i })).toBeInTheDocument();
    expect(screen.getByText("Opłata serwisowa")).toBeInTheDocument();
    expect(screen.getByText("Opis pozycji")).toBeInTheDocument();
    expect(screen.getByText(/^Serwis$/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo/i)).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*sent/i)).toBeInTheDocument();
  });

  it("shows error alert when report is not found", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "not_found",
      message: "Raport nie został odnaleziony",
    });

    render(<AdminReportDetail reportId="missing" />);

    expect(await screen.findByText("Raport nie został odnaleziony")).toBeInTheDocument();
  });

  it("shows access error when response is forbidden", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do raportu",
    });

    render(<AdminReportDetail reportId="restricted" />);

    expect(await screen.findByText("Brak dostępu do raportu")).toBeInTheDocument();
  });

  it("resends report email, shows toast and refetches details", async () => {
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

    render(<AdminReportDetail reportId="report-7" />);

    const resendButton = await screen.findByRole("button", { name: /Wyślij e-mail/i });
    fireEvent.click(resendButton);

    expect(resendButton).toBeDisabled();
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-7/send-email"));
    expect(await screen.findByText("E-mail wysłany")).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(resendButton).not.toBeDisabled());
  });

  it("regenerates report and refetches details", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-9", status: "generated" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canRegenerate: true,
        },
      })
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-9", status: "generated", balanceRaw: 999 }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canRegenerate: true,
        },
      });

    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportDetail reportId="report-9" />);

    const regenerateButton = await screen.findByRole("button", { name: /Przelicz/i });
    fireEvent.click(regenerateButton);

    expect(regenerateButton).toBeDisabled();
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-9/regenerate"));
    expect(await screen.findByText("Przeliczanie zaplanowane")).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(regenerateButton).not.toBeDisabled());
  });

  it("toggles report to realized status", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-12", status: "generated" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canToggleRealized: true,
        },
      })
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-12", status: "realized", realizedAt: "2024-04-10T12:00:00.000Z" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canToggleRealized: true,
        },
      });

    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportDetail reportId="report-12" />);

    const toggleButton = await screen.findByRole("button", { name: /Zaksięguj/i });

    const confirmMock = vi.mocked(confirm);
    expect(confirmMock).not.toHaveBeenCalled();

    fireEvent.click(toggleButton);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-12", { status: "realized" }));
    expect(await screen.findByText("Raport zaksięgowany")).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
  });

  it("requires confirmation before unlocking realized report", async () => {
    const confirmSpy = vi.mocked(confirm);
    confirmSpy.mockReturnValueOnce(true);

    apiGetMock
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-15", status: "realized", realizedAt: "2024-03-01T10:00:00.000Z" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canToggleRealized: true,
        },
      })
      .mockResolvedValueOnce({
        report: buildReport({ id: "report-15", status: "unlocked" }),
        lineItems: [],
        lastEmailAttempt: null,
        permissions: {
          canToggleRealized: true,
        },
      });

    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportDetail reportId="report-15" />);

    const toggleButton = await screen.findByRole("button", { name: /Odblokuj/i });
    fireEvent.click(toggleButton);

    expect(confirmSpy).toHaveBeenCalledOnce();
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith("/api/v1/reports/report-15", { status: "unlocked" }));
    expect(await screen.findByText("Raport odblokowany")).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
  });

  it("shows error toast and re-enables controls when resend fails", async () => {
    apiGetMock.mockResolvedValue({
      report: buildReport({ id: "report-21", status: "generated" }),
      lineItems: [],
      lastEmailAttempt: null,
      permissions: {
        canSendEmail: true,
      },
    });

    apiPostMock.mockRejectedValueOnce({
      code: "internal_error",
      message: "Błąd serwera",
      status: 500,
    });

    render(<AdminReportDetail reportId="report-21" />);

    const resendButton = await screen.findByRole("button", { name: /Wyślij e-mail/i });
    fireEvent.click(resendButton);

    expect(resendButton).toBeDisabled();
    expect(await screen.findByText("Nie udało się wysłać e-maila")).toBeInTheDocument();
    await waitFor(() => expect(resendButton).not.toBeDisabled());
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
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
