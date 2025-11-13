import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MonthlyAdvancesTable } from "@/components/monthly/MonthlyAdvancesTable";
import type { MonthlyAdvanceDTO } from "@/types";
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

const PROPERTY_KEY = "admin-monthly-advances:propertyId";

describe("MonthlyAdvancesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
    cleanup();
    window.localStorage.clear();
    window.localStorage.setItem(PROPERTY_KEY, "property-1");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders rows and shows lock message when save is blocked", async () => {
    const item = buildAdvance({ id: "cond-1", month: "2024-02-01" });

    apiGetMock
      .mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] })
      .mockResolvedValueOnce({ items: [item] });
    apiPatchMock.mockRejectedValueOnce({
      code: "monthly_advance_locked",
      message: "Zaliczka zablokowana przez zaksięgowane raporty.",
    });

    render(<MonthlyAdvancesTable useOwnProvider />);

    const feeInput = await screen.findByDisplayValue("100");
    const saveButton = screen.getByRole("button", { name: /Zapisz/i });

    fireEvent.change(feeInput, { target: { value: "110" } });
    fireEvent.click(saveButton);

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalled());
    expect(await screen.findByText(/Zaliczka.*zablokowana.*raporty/i)).toBeInTheDocument();
  });

  it("updates a monthly advance and shows success toast", async () => {
    const original = buildAdvance({ id: "cond-edit", managerFee: 100, updatedAt: "2024-02-01T00:00:00.000Z" });
    const updated = buildAdvance({
      id: "cond-edit",
      managerFee: 120,
      updatedAt: "2024-02-02T00:00:00.000Z",
    });

    apiGetMock
      .mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] })
      .mockResolvedValueOnce({ items: [original] })
      .mockResolvedValueOnce({ items: [updated] });
    apiPatchMock.mockResolvedValueOnce({ monthlyAdvance: updated });

    render(<MonthlyAdvancesTable useOwnProvider />);

    const feeInput = await screen.findByDisplayValue("100");
    fireEvent.change(feeInput, { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz/i }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(
        expect.stringContaining("cond-edit"),
        expect.objectContaining({ managerFee: 120 })
      )
    );
    expect(await screen.findByText(/Zapisano zaliczkę/i)).toBeInTheDocument();
  });

  it("maps validation errors to inline feedback on save", async () => {
    const original = buildAdvance({ id: "cond-validation" });

    apiGetMock
      .mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] })
      .mockResolvedValueOnce({ items: [original] });
    apiPatchMock.mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: { priceCold: "Niepoprawna wartość" },
    });

    render(<MonthlyAdvancesTable useOwnProvider />);

    const priceColdInput = await screen.findByDisplayValue("50");
    const row = priceColdInput.closest("tr") as HTMLTableRowElement | null;
    expect(row).not.toBeNull();
    fireEvent.change(priceColdInput, { target: { value: "55" } });
    within(row!).getByRole("button", { name: /Zapisz/i });
    fireEvent.click(within(row!).getByRole("button", { name: /Zapisz/i }));

    expect(await within(row!).findByText((content) => content.includes("Niepoprawna wartość"))).toBeInTheDocument();
    expect(apiPatchMock).toHaveBeenCalled();
  });

  it("creates a new monthly advance", async () => {
    const existing = buildAdvance({ id: "existing", month: "2024-01-01" });
    const created = buildAdvance({ id: "created", month: "2024-03-01", managerFee: 200 });

    apiGetMock
      .mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] })
      .mockResolvedValueOnce({ items: [existing] })
      .mockResolvedValueOnce({ items: [existing, created] });

    apiPostMock.mockResolvedValueOnce({ monthlyAdvance: created });

    render(<MonthlyAdvancesTable useOwnProvider />);

    const decimalInputs = await screen.findAllByPlaceholderText("0,00");
    const createRowInputs = decimalInputs.slice(-5);
    createRowInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(100 + index) } });
    });

    const forecastInputs = screen.getAllByPlaceholderText("0,000");
    const createRowForecastInputs = forecastInputs.slice(-3);
    createRowForecastInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: (10 + index).toString() } });
    });

    const table = await screen.findByRole("table");
    const allRows = within(table).getAllByRole("row");
    const createRow = allRows[allRows.length - 1];
    const monthInput = within(createRow).getByDisplayValue(/\d{4}-\d{2}/);
    fireEvent.change(monthInput, { target: { value: "2024-03" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj zaliczkę/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/v1/monthly-advances",
        expect.objectContaining({ month: "2024-03-01" })
      )
    );

    expect(await screen.findByText(/Dodano zaliczkę/i)).toBeInTheDocument();
  });

  it("deletes a monthly advance after confirmation", async () => {
    const item = buildAdvance({ id: "to-delete", month: "2024-05-01" });

    apiGetMock
      .mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] })
      .mockResolvedValueOnce({ items: [item] })
      .mockResolvedValueOnce({ items: [] });
    apiDeleteMock.mockResolvedValueOnce({});

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<MonthlyAdvancesTable useOwnProvider />);

    const deleteButton = await screen.findByRole("button", { name: /Usuń/i });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith(expect.stringContaining("to-delete")));
    expect(await screen.findByText(/Usunięto zaliczkę/i)).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("displays access error when fetching monthly advances is forbidden", async () => {
    apiGetMock.mockResolvedValueOnce({ items: [{ id: "property-1", label: "Property 1" }] }).mockRejectedValueOnce({
      code: "forbidden",
      message: "Brak dostępu do zaliczek.",
    });

    render(<MonthlyAdvancesTable useOwnProvider />);

    expect(await screen.findByText(/Brak dostępu do zaliczek/i)).toBeInTheDocument();
  });
});

function buildAdvance(overrides: Partial<MonthlyAdvanceDTO> = {}): MonthlyAdvanceDTO {
  return {
    id: overrides.id ?? "condition-id",
    propertyId: overrides.propertyId ?? "property-1",
    month: overrides.month ?? "2024-02-01",
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
