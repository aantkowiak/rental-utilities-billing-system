import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReportsTable } from "@/components/reports/AdminReportsTable";
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

describe("AdminReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem("admin-reports:month", "2024-02");
  });

  afterEach(() => {
    cleanup();
  });

  it("loads reports and fetches new data when month changes", async () => {
    const item = buildReportItem();
    apiGetMock.mockResolvedValue({ items: [item] });

    render(<AdminReportsTable />);

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(1));
    expect(apiGetMock.mock.calls[0][0]).toContain("/api/v1/reports");

    apiGetMock.mockClear();

    const monthInput = await screen.findByLabelText(/Miesiąc rozliczeniowy/i);
    fireEvent.change(monthInput, { target: { value: "2024-03" } });

    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(1));
    expect(apiGetMock.mock.calls[0][0]).toContain("month=2024-03");
  });

  it("generates a report and disables button while pending", async () => {
    const item = buildReportItem();
    let resolvePost: (() => void) | undefined;

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolvePost = () => resolve();
        })
    );

    render(<AdminReportsTable />);

    const generateButton = await screen.findByRole("button", { name: /Generuj/i });
    fireEvent.click(generateButton);
    expect(generateButton).toBeDisabled();

    await act(async () => {
      resolvePost?.();
    });

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/v1/reports/generate",
        expect.objectContaining({ contractId: item.report.contractId })
      )
    );

    expect(await screen.findByText(/Raport w kolejce/i)).toBeInTheDocument();
  });

  it("regenerates a report and shows success toast", async () => {
    const item = buildReportItem({ status: "draft" });

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportsTable />);

    const regenerateButton = await screen.findByRole("button", { name: /Przelicz ponownie/i });
    fireEvent.click(regenerateButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(`/api/v1/reports/${encodeURIComponent(item.report.id)}/regenerate`)
    );
    expect(await screen.findByText(/Przeliczanie zaplanowane/i)).toBeInTheDocument();
  });

  it("resends a report email and shows confirmation toast", async () => {
    const item = buildReportItem();

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportsTable />);

    const resendButton = await screen.findByRole("button", { name: /Wyślij ponownie/i });
    fireEvent.click(resendButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(`/api/v1/reports/${encodeURIComponent(item.report.id)}/send-email`)
    );
    expect(await screen.findByText(/E-mail wysłany/i)).toBeInTheDocument();
  });

  it("toggles report to realized status", async () => {
    const item = buildReportItem({ status: "draft" });

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportsTable />);

    const toggleButton = await screen.findByRole("button", { name: /Zaksięguj/i });
    fireEvent.click(toggleButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(`/api/v1/reports/${encodeURIComponent(item.report.id)}`, {
        status: "realized",
      })
    );
    expect(await screen.findByText(/Raport zaksięgowany/i)).toBeInTheDocument();
  });

  it("confirms unlock when toggling from realized to unlocked", async () => {
    const item = buildReportItem({ status: "realized" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockResolvedValueOnce({});

    render(<AdminReportsTable />);

    const toggleButton = await screen.findByRole("button", { name: /Odblokuj/i });
    fireEvent.click(toggleButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(`/api/v1/reports/${encodeURIComponent(item.report.id)}`, {
        status: "unlocked",
      })
    );
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByText(/Raport odblokowany/i)).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("shows access error when list fetch is forbidden", async () => {
    apiGetMock.mockRejectedValueOnce({ code: "forbidden", message: "Brak dostępu" });

    render(<AdminReportsTable />);

    expect(await screen.findByText(/Brak dostępu/i)).toBeInTheDocument();
  });

  it("shows toast and refetches on conflict errors", async () => {
    const item = buildReportItem();

    apiGetMock.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ items: [item] });
    apiPostMock.mockRejectedValueOnce({ code: "conflict", message: "Zmienione dane" });

    render(<AdminReportsTable />);

    const regenerateButton = await screen.findByRole("button", { name: /Przelicz ponownie/i });
    fireEvent.click(regenerateButton);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Nie udało się wykonać akcji/i)).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
  });

  it("lazily renders email attempt details on demand", async () => {
    const attempt = buildEmailAttempt({ status: "failed", errorMessage: "SMTP error" });
    const item = buildReportItem(undefined, attempt);

    apiGetMock.mockResolvedValueOnce({ items: [item] });

    render(<AdminReportsTable />);

    const detailsButton = await screen.findByRole("button", { name: /Szczegóły e-mail/i });
    fireEvent.click(detailsButton);

    expect(await screen.findByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Błąd:/i).closest("p")).toHaveTextContent("SMTP error");
  });
});

function buildReportItem(
  overrides: Partial<ReportDTO> = {},
  attempt: ReportEmailAttemptDTO | null = buildEmailAttempt()
): {
  report: ReportDTO;
  lastEmailAttempt: ReportEmailAttemptDTO | null;
  permissions: {
    canGenerate: boolean;
    canRegenerate: boolean;
    canSendEmail: boolean;
    canToggleRealized: boolean;
    generateDisabledReason: string | null;
    regenerateDisabledReason: string | null;
    sendEmailDisabledReason: string | null;
    toggleRealizedDisabledReason: string | null;
  };
} {
  return {
    report: {
      id: overrides.id ?? "report-id",
      contractId: overrides.contractId ?? "contract-1",
      month: overrides.month ?? "2024-02-01T00:00:00.000Z",
      status: overrides.status ?? "draft",
      anchorReadingId: overrides.anchorReadingId ?? "anchor-1",
      anchorReadingNextId: overrides.anchorReadingNextId ?? "anchor-2",
      monthlyConditionsId: overrides.monthlyConditionsId ?? "conditions-1",
      fixedCostRaw: overrides.fixedCostRaw ?? 12000,
      meterCostColdRaw: overrides.meterCostColdRaw ?? 3400,
      meterCostHotRaw: overrides.meterCostHotRaw ?? 4100,
      meterCostHeatingRaw: overrides.meterCostHeatingRaw ?? 8900,
      actualRentRaw: overrides.actualRentRaw ?? 150000,
      balanceRaw: overrides.balanceRaw ?? 12345,
      realizedAt: overrides.realizedAt ?? null,
      createdAt: overrides.createdAt ?? "2024-02-10T10:00:00.000Z",
      updatedAt: overrides.updatedAt ?? "2024-02-11T10:00:00.000Z",
    },
    lastEmailAttempt: attempt,
    permissions: {
      canGenerate: true,
      canRegenerate: true,
      canSendEmail: true,
      canToggleRealized: true,
      generateDisabledReason: null,
      regenerateDisabledReason: null,
      sendEmailDisabledReason: null,
      toggleRealizedDisabledReason: null,
    },
  };
}

function buildEmailAttempt(overrides: Partial<ReportEmailAttemptDTO> = {}): ReportEmailAttemptDTO {
  return {
    id: overrides.id ?? "attempt-1",
    reportEmailId: overrides.reportEmailId ?? "email-1",
    attemptedAt: overrides.attemptedAt ?? "2024-02-11T09:00:00.000Z",
    status: overrides.status ?? "success",
    errorMessage: overrides.errorMessage ?? "",
  };
}
