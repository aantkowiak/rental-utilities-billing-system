import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPropertiesList } from "@/components/properties/AdminPropertiesList";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client/http";
import type { PropertyDTO } from "@/types";

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

describe("AdminPropertiesList", () => {
  it("creates a property and refetches list", async () => {
    apiGetMock.mockResolvedValueOnce({ items: [] });
    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-2", label: "Nowa nieruchomość", startMonth: "2024-05" })],
    });
    apiPostMock.mockResolvedValueOnce({ property: buildProperty({ id: "property-2" }) });

    render(<AdminPropertiesList />);

    const labelInput = await screen.findByLabelText("Nazwa nieruchomości");
    const startMonthInput = screen.getByLabelText("Miesiąc początkowy rozliczeń");
    const submitButton = screen.getByRole("button", { name: "Dodaj nieruchomość" });

    fireEvent.change(labelInput, { target: { value: "Nowa nieruchomość" } });
    fireEvent.change(startMonthInput, { target: { value: "2024-05" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/v1/properties", {
        label: "Nowa nieruchomość",
        startMonth: "2024-05",
      })
    );

    expect(await screen.findByText("Dodano nieruchomość")).toBeInTheDocument();
    expect(await screen.findByText("Nowa nieruchomość")).toBeInTheDocument();
  });

  it("shows inline error when creating property with duplicate label", async () => {
    apiGetMock.mockResolvedValueOnce({ items: [] });
    apiPostMock.mockRejectedValueOnce({
      code: "conflict",
      status: 409,
      message: "Duplikat nazwy",
    });

    render(<AdminPropertiesList />);

    const labelInput = await screen.findByLabelText("Nazwa nieruchomości");
    const startMonthInput = screen.getByLabelText("Miesiąc początkowy rozliczeń");
    const submitButton = screen.getByRole("button", { name: "Dodaj nieruchomość" });

    fireEvent.change(labelInput, { target: { value: "Powielona" } });
    fireEvent.change(startMonthInput, { target: { value: "2024-06" } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Duplikat nazwy/i)).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it("edits property label and refetches data", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-1", label: "Stara nazwa", startMonth: "2024-01" })],
    });
    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-1", label: "Zmieniona nazwa", startMonth: "2024-01" })],
    });
    apiPatchMock.mockResolvedValueOnce({ property: buildProperty({ id: "property-1" }) });

    render(<AdminPropertiesList />);

    const editButton = await screen.findByRole("button", { name: "Edytuj" });
    fireEvent.click(editButton);

    const labelInput = screen.getByLabelText("Nazwa nieruchomości") as HTMLInputElement;
    expect(labelInput.value).toBe("Stara nazwa");

    fireEvent.change(labelInput, { target: { value: "Zmieniona nazwa" } });

    const saveButton = screen.getByRole("button", { name: "Zapisz zmiany" });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith("/api/v1/properties/property-1", {
        label: "Zmieniona nazwa",
        startMonth: "2024-01",
      })
    );

    expect(await screen.findByText("Zaktualizowano nieruchomość")).toBeInTheDocument();
    expect(await screen.findByText("Zmieniona nazwa")).toBeInTheDocument();
  });

  it("shows toast and refetches when edited property no longer exists", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-4", label: "Widoczna", startMonth: "2024-03" })],
    });
    apiGetMock.mockResolvedValueOnce({ items: [] });
    apiPatchMock.mockRejectedValueOnce({
      code: "not_found",
      status: 404,
      message: "Raport nie istnieje",
    });

    render(<AdminPropertiesList />);

    const editButton = await screen.findByRole("button", { name: "Edytuj" });
    fireEvent.click(editButton);

    const saveButton = screen.getByRole("button", { name: "Zapisz zmiany" });
    fireEvent.click(saveButton);

    expect(await screen.findByText("Nieruchomość już nie istnieje")).toBeInTheDocument();
    const labelInput = screen.getByLabelText("Nazwa nieruchomości") as HTMLInputElement;
    await waitFor(() => expect(labelInput.value).toBe(""));
  });

  it("deletes property after confirmation and refetches list", async () => {
    const confirmMock = vi.mocked(confirm);
    confirmMock.mockReturnValueOnce(true);

    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-7", label: "Do usunięcia", startMonth: "2024-02" })],
    });
    apiGetMock.mockResolvedValueOnce({ items: [] });
    apiDeleteMock.mockResolvedValueOnce({});

    render(<AdminPropertiesList />);

    const deleteButton = await screen.findByRole("button", { name: "Usuń" });
    fireEvent.click(deleteButton);

    expect(confirmMock).toHaveBeenCalledOnce();
    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith("/api/v1/properties/property-7"));

    expect(await screen.findByText("Usunięto nieruchomość")).toBeInTheDocument();
    expect(await screen.findByText("Nie dodano jeszcze żadnych nieruchomości.")).toBeInTheDocument();
  });

  it("locks actions when server returns forbidden error", async () => {
    apiGetMock.mockResolvedValueOnce({
      items: [buildProperty({ id: "property-9", label: "Blokowana", startMonth: "2024-01" })],
    });
    apiPostMock.mockRejectedValueOnce({
      code: "forbidden",
      status: 403,
      message: "Brak uprawnień do zmian",
    });

    render(<AdminPropertiesList />);

    const labelInput = await screen.findByLabelText("Nazwa nieruchomości");
    const startMonthInput = screen.getByLabelText("Miesiąc początkowy rozliczeń");
    const addButton = screen.getByRole("button", { name: "Dodaj nieruchomość" });

    fireEvent.change(labelInput, { target: { value: "Blokowana" } });
    fireEvent.change(startMonthInput, { target: { value: "2024-07" } });
    fireEvent.click(addButton);

    expect(await screen.findByText("Brak uprawnień do zmian")).toBeInTheDocument();
    expect(addButton).toBeDisabled();

    const row = await screen.findByText("Blokowana");
    const rowActions = within(row.closest("tr")!);
    expect(rowActions.getByRole("button", { name: "Edytuj" })).toBeDisabled();
    expect(rowActions.getByRole("button", { name: "Usuń" })).toBeDisabled();
  });
});

function buildProperty(overrides: Partial<PropertyDTO>): PropertyDTO {
  return {
    createdAt: overrides.createdAt ?? "2024-01-01T10:00:00.000Z",
    id: overrides.id ?? "property-1",
    label: overrides.label ?? "Nieruchomość testowa",
    startMonth: overrides.startMonth ?? "2024-01",
    updatedAt: overrides.updatedAt ?? "2024-01-02T11:00:00.000Z",
  };
}
