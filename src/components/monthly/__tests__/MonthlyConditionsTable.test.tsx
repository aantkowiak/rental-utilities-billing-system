import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MonthlyConditionsTable } from "@/components/monthly/MonthlyConditionsTable";
import type { MonthlyConditionDTO } from "@/types";
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

const PROPERTY_KEY = "admin-monthly:propertyId";
const MONTH_KEY = "admin-monthly:month";

describe("MonthlyConditionsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
    cleanup();
    window.localStorage.clear();
    window.localStorage.setItem(PROPERTY_KEY, "property-1");
    window.localStorage.setItem(MONTH_KEY, "2024-02");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders rows and shows lock message when save is blocked", async () => {
    const item = buildCondition({ id: "cond-1", month: "2024-02" });

    apiGetMock.mockResolvedValueOnce({ items: [item] });
    apiPatchMock.mockRejectedValueOnce({
      code: "monthly_condition_locked",
      message: "Warunki zablokowane przez zaksięgowane raporty.",
    });

    render(<MonthlyConditionsTable useOwnProvider />);

    const feeInput = await screen.findByDisplayValue("100");
    const saveButton = screen.getByRole("button", { name: /Zapisz/i });

    fireEvent.change(feeInput, { target: { value: "110" } });
    fireEvent.click(saveButton);

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalled());
    expect(await screen.findByText(/Warunki zablokowane przez zaksięgowane raporty/i)).toBeInTheDocument();
  });

  it("updates a monthly condition and shows success toast", async () => {
    const original = buildCondition({ id: "cond-edit", managerFee: 100, updatedAt: "2024-02-01T00:00:00.000Z" });
    const updated = buildCondition({
      id: "cond-edit",
      managerFee: 120,
      updatedAt: "2024-02-02T00:00:00.000Z",
    });

    apiGetMock
      .mockResolvedValueOnce({ items: [original] })
      .mockResolvedValueOnce({ items: [updated] });
    apiPatchMock.mockResolvedValueOnce({ monthlyCondition: updated });

    render(<MonthlyConditionsTable useOwnProvider />);

    const feeInput = await screen.findByDisplayValue("100");
    fireEvent.change(feeInput, { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        expect.stringContaining("cond-edit"),
        expect.objectContaining({ managerFee: 120 })
      )
    );
    expect(await screen.findByText(/Zapisano warunki/i)).toBeInTheDocument();
  });

  it("maps validation errors to inline feedback on save", async () => {
    const original = buildCondition({ id: "cond-validation" });

    apiGetMock.mockResolvedValueOnce({ items: [original] });
    apiPatchMock.mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: { priceCold: "Niepoprawna wartość" },
    });

    render(<MonthlyConditionsTable useOwnProvider />);

    const priceColdInput = await screen.findByDisplayValue("50");
    const row = priceColdInput.closest("tr") as HTMLTableRowElement | null;
    expect(row).not.toBeNull();
    fireEvent.change(priceColdInput, { target: { value: "55" } });
    within(row!).getByRole("button", { name: /Zapisz/i });
    fireEvent.click(within(row!).getByRole("button", { name: /Zapisz/i }));

    expect(
      await within(row!).findByText((content) => content.includes("Niepoprawna wartość"))
    ).toBeInTheDocument();
    expect(apiPatchMock).toHaveBeenCalled();
  });

  it("creates a new monthly condition", async () => {
    const existing = buildCondition({ id: "existing", month: "2024-01" });
    const created = buildCondition({ id: "created", month: "2024-03", managerFee: 200 });

    apiGetMock
      .mockResolvedValueOnce({ items: [existing] })
      .mockResolvedValueOnce({ items: [existing, created] });

    apiPostMock.mockResolvedValueOnce({ monthlyCondition: created });

    render(<MonthlyConditionsTable useOwnProvider />);

    const decimalInputs = await screen.findAllByPlaceholderText("0.00");
    decimalInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(100 + index) } });
    });

    const forecastInputs = screen.getAllByPlaceholderText("0.000");
    forecastInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: (10 + index).toString() } });
    });

    const monthInputs = screen.getAllByDisplayValue("2024-02");
    const createMonthInput = monthInputs[monthInputs.length - 1];
    fireEvent.change(createMonthInput, { target: { value: "2024-03" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj warunki/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/v1/monthly-conditions",
        expect.objectContaining({ month: "2024-03" })
      )
    );

    expect(await screen.findByText(/Dodano warunki/i)).toBeInTheDocument();
  });

  it("deletes a monthly condition after confirmation", async () => {
    const item = buildCondition({ id: "to-delete", month: "2024-05" });

    apiGetMock
      .mockResolvedValueOnce({ items: [item] })
      .mockResolvedValueOnce({ items: [] });
    apiDeleteMock.mockResolvedValueOnce({});

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<MonthlyConditionsTable useOwnProvider />);

    const deleteButton = await screen.findByRole("button", { name: /Usuń/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith(expect.stringContaining("to-delete")));
    expect(await screen.findByText(/Usunięto warunki/i)).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("displays access error when fetching monthly conditions is forbidden", async () => {
    apiGetMock.mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do warunków.",
    });

    render(<MonthlyConditionsTable useOwnProvider />);

    expect(await screen.findByText(/Brak dostępu do warunków/i)).toBeInTheDocument();
  });
});

function buildCondition(overrides: Partial<MonthlyConditionDTO> = {}): MonthlyConditionDTO {
  return {
    id: overrides.id ?? "condition-id",
    propertyId: overrides.propertyId ?? "property-1",
    month: overrides.month ?? "2024-02",
    managerFee: overrides.managerFee ?? 100,
    priceCold: overrides.priceCold ?? 50,
    priceHotHeating: overrides.priceHotHeating ?? 60,
    priceHeating: overrides.priceHeating ?? 70,
    forecastCold: overrides.forecastCold ?? 10,
    forecastHot: overrides.forecastHot ?? 8,
    forecastHeating: overrides.forecastHeating ?? 5,
    advancePayment: overrides.advancePayment ?? 90,
    createdAt: overrides.createdAt ?? "2024-02-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-02-01T00:00:00.000Z",
  };
}


