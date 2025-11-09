import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminContractsList } from "@/components/contracts/AdminContractsList";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/client/http";
import type { ContractDTO, ContractPeriod } from "@/types";
import type { ContractResponse, ListContractsResponse } from "@/types/contracts";

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
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminContractsList", () => {
  it("creates contract with valid period and shows it after refetch", async () => {
    apiGetMock.mockResolvedValueOnce(buildListResponse([]));
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-2",
          propertyId: "prop-1",
          tenantUserId: "tenant-1",
          period: buildPeriod("2024-05-01", "2024-12-31"),
        }),
      ])
    );
    apiPostMock.mockResolvedValueOnce(buildContractResponse({ id: "contract-2" }));

    render(<AdminContractsList />);

    const propertyInput = await findFormInput("Identyfikator nieruchomości");
    const tenantInput = await findFormInput("Identyfikator najemcy");
    const fromInput = await findFormInput("Data rozpoczęcia");
    const toInput = await findFormInput("Data zakończenia");
    const submitButton = getFormButton("Dodaj umowę");

    fireEvent.change(propertyInput, { target: { value: "prop-1" } });
    fireEvent.change(tenantInput, { target: { value: "tenant-1" } });
    fireEvent.change(fromInput, { target: { value: "2024-05-01" } });
    fireEvent.change(toInput, { target: { value: "2024-12-31" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/v1/contracts", {
        propertyId: "prop-1",
        tenantUserId: "tenant-1",
        period: {
          from: "2024-05-01T00:00:00.000Z",
          to: "2024-12-31T00:00:00.000Z",
        },
      })
    );

    expect(await screen.findByText("Dodano umowę")).toBeInTheDocument();
    expect(await screen.findByText(/contract-2/i)).toBeInTheDocument();
  });

  it("shows inline error when period overlaps existing contract", async () => {
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-3",
          propertyId: "prop-1",
          tenantUserId: "tenant-1",
          period: buildPeriod("2024-01-01", "2024-06-30"),
        }),
      ])
    );

    render(<AdminContractsList />);

    const propertyInput = await findFormInput("Identyfikator nieruchomości");
    const tenantInput = await findFormInput("Identyfikator najemcy");
    const fromInput = await findFormInput("Data rozpoczęcia");
    const toInput = await findFormInput("Data zakończenia");

    fireEvent.change(propertyInput, { target: { value: "prop-1" } });
    fireEvent.change(tenantInput, { target: { value: "tenant-1" } });
    fireEvent.change(fromInput, { target: { value: "2024-05-01" } });
    fireEvent.change(toInput, { target: { value: "2024-07-31" } });

    fireEvent.click(screen.getByRole("button", { name: "Dodaj umowę" }));

    expect(await screen.findByText(/nakłada się z istniejącą umową/i)).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("maps server overlap conflict to inline error", async () => {
    apiGetMock.mockResolvedValueOnce(buildListResponse([]));
    apiPostMock.mockRejectedValueOnce({
      code: "contract_overlap",
      message: "Konflikt okresu",
    });

    render(<AdminContractsList />);

    const propertyInput = await findFormInput("Identyfikator nieruchomości");
    const tenantInput = await findFormInput("Identyfikator najemcy");
    const fromInput = await findFormInput("Data rozpoczęcia");
    const toInput = await findFormInput("Data zakończenia");

    fireEvent.change(propertyInput, { target: { value: "prop-2" } });
    fireEvent.change(tenantInput, { target: { value: "tenant-2" } });
    fireEvent.change(fromInput, { target: { value: "2024-01-01" } });
    fireEvent.change(toInput, { target: { value: "2024-12-31" } });

    fireEvent.click(screen.getByRole("button", { name: "Dodaj umowę" }));

    expect(await screen.findByText(/nakłada się z inną umową/i)).toBeInTheDocument();
  });

  it("displays inline FK error when server rejects identifiers", async () => {
    apiGetMock.mockResolvedValueOnce(buildListResponse([]));
    apiPostMock.mockRejectedValueOnce({
      code: "foreign_key_violation",
      status: 400,
      message: "Nieprawidłowe identyfikatory",
    });

    render(<AdminContractsList />);

    const propertyInput = await findFormInput("Identyfikator nieruchomości");
    const tenantInput = await findFormInput("Identyfikator najemcy");
    const fromInput = await findFormInput("Data rozpoczęcia");
    const toInput = await findFormInput("Data zakończenia");

    fireEvent.change(propertyInput, { target: { value: "prop-x" } });
    fireEvent.change(tenantInput, { target: { value: "tenant-y" } });
    fireEvent.change(fromInput, { target: { value: "2024-01-01" } });
    fireEvent.change(toInput, { target: { value: "2024-12-31" } });

    fireEvent.click(screen.getByRole("button", { name: "Dodaj umowę" }));

    expect(await screen.findAllByText(/Nieprawidłowe identyfikatory/i)).toHaveLength(2);
  });

  it("edits contract period and refetches list", async () => {
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-5",
          propertyId: "prop-1",
          tenantUserId: "tenant-1",
          period: buildPeriod("2024-01-01", "2024-06-30"),
        }),
      ])
    );
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-5",
          propertyId: "prop-1",
          tenantUserId: "tenant-1",
          period: buildPeriod("2024-01-01", "2024-12-31"),
        }),
      ])
    );
    apiPatchMock.mockResolvedValueOnce(buildContractResponse({ id: "contract-5" }));

    render(<AdminContractsList />);

    await screen.findByText(/contract-5/i);
    const editButton = await findTableButton("Edytuj");
    fireEvent.click(editButton);

    const toInput = screen.getByLabelText("Data zakończenia");
    fireEvent.change(toInput, { target: { value: "2024-12-31" } });

    fireEvent.click(getFormButton("Zapisz umowę"));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith("/api/v1/contracts/contract-5", {
        propertyId: "prop-1",
        tenantUserId: "tenant-1",
        period: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-12-31T00:00:00.000Z",
        },
      })
    );

    expect(await screen.findByText("Zaktualizowano umowę")).toBeInTheDocument();
    await waitFor(() => {
      const rowElement = screen.getByText(/contract-5/i).closest("tr");
      expect(rowElement).not.toBeNull();
      const periodCell = within(rowElement as HTMLTableRowElement).getByText(
        (content) => content.includes("Do:") && content.includes("2024")
      );
      expect(periodCell).toBeInTheDocument();
    });
  });

  it("shows toast and refetches when edited contract missing", async () => {
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-7",
          propertyId: "prop-1",
          tenantUserId: "tenant-1",
          period: buildPeriod("2024-01-01", "2024-12-31"),
        }),
      ])
    );
    apiGetMock.mockResolvedValueOnce(buildListResponse([]));
    apiPatchMock.mockRejectedValueOnce({
      code: "not_found",
      status: 404,
      message: "Umowa nie istnieje",
    });

    render(<AdminContractsList />);

    await screen.findByText(/contract-7/i);
    const editButton = await findTableButton("Edytuj");
    fireEvent.click(editButton);

    fireEvent.click(getFormButton("Zapisz umowę"));

    expect(await screen.findByText("Umowa już nie istnieje")).toBeInTheDocument();
    await waitFor(() => expect(getFormInput("Identyfikator nieruchomości")).toHaveValue(""));
  });

  it("deletes contract after confirmation", async () => {
    const confirmMock = vi.mocked(confirm);
    confirmMock.mockReturnValueOnce(true);

    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-8",
          propertyId: "prop-2",
          tenantUserId: "tenant-2",
          period: buildPeriod("2024-02-01", "2024-05-31"),
        }),
      ])
    );
    apiGetMock.mockResolvedValueOnce(buildListResponse([]));
    apiDeleteMock.mockResolvedValueOnce({});

    render(<AdminContractsList />);

    await screen.findByText(/contract-8/i);
    const deleteButton = await findTableButton("Usuń");
    fireEvent.click(deleteButton);

    expect(confirmMock).toHaveBeenCalledOnce();
    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith("/api/v1/contracts/contract-8"));

    expect(await screen.findByText("Usunięto umowę")).toBeInTheDocument();
    expect(await screen.findByText("Nie znaleziono umów dla wybranych filtrów.")).toBeInTheDocument();
  });

  it("locks actions when server returns forbidden", async () => {
    apiGetMock.mockResolvedValueOnce(
      buildListResponse([
        buildContract({
          id: "contract-9",
          propertyId: "prop-existing",
          tenantUserId: "tenant-3",
          period: buildPeriod("2024-04-01", "2024-10-31"),
        }),
      ])
    );
    apiPostMock.mockRejectedValueOnce({
      code: "forbidden",
      status: 403,
      message: "Brak uprawnień do zmian umów",
    });

    render(<AdminContractsList />);

    const propertyInput = await findFormInput("Identyfikator nieruchomości");
    const tenantInput = await findFormInput("Identyfikator najemcy");
    const fromInput = await findFormInput("Data rozpoczęcia");
    const toInput = await findFormInput("Data zakończenia");
    const addButton = getFormButton("Dodaj umowę");

    fireEvent.change(propertyInput, { target: { value: "prop-3" } });
    fireEvent.change(tenantInput, { target: { value: "tenant-3" } });
    fireEvent.change(fromInput, { target: { value: "2024-04-01" } });
    fireEvent.change(toInput, { target: { value: "2024-10-31" } });
    fireEvent.click(addButton);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalled());
    await waitFor(() => {
      const banner = screen.queryByText(/Brak uprawnień do zmian umów/i);
      expect(banner).toBeInTheDocument();
    });
    await waitFor(() => expect(addButton).toBeDisabled());

    const row = await screen.findByText(/contract-9/i);
    const rowActions = within(row.closest("tr")!);
    expect(rowActions.getByRole("button", { name: "Edytuj" })).toBeDisabled();
    expect(rowActions.getByRole("button", { name: "Usuń" })).toBeDisabled();
  });
});

function buildPeriod(from: string, to: string): ContractPeriod {
  return {
    from: `${from}T00:00:00.000Z`,
    to: `${to}T00:00:00.000Z`,
  };
}

function buildContract(overrides: Partial<ContractDTO>): ContractDTO {
  return {
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    id: overrides.id ?? "contract-1",
    propertyId: overrides.propertyId ?? "prop-1",
    tenantUserId: overrides.tenantUserId ?? "tenant-1",
    period: overrides.period ?? buildPeriod("2024-01-01", "2024-12-31"),
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

function buildListResponse(items: ContractDTO[]): ListContractsResponse {
  return {
    items,
  };
}

function buildContractResponse(overrides: Partial<ContractDTO>): ContractResponse {
  return {
    contract: buildContract(overrides),
  };
}

async function findFormInput(label: string): Promise<HTMLInputElement> {
  const inputs = await screen.findAllByLabelText(label);
  return inputs[inputs.length - 1] as HTMLInputElement;
}

function getFormButton(name: string): HTMLButtonElement {
  const buttons = screen.getAllByRole("button", { name });
  return buttons[buttons.length - 1] as HTMLButtonElement;
}

async function findTableButton(name: string): Promise<HTMLButtonElement> {
  const buttons = await screen.findAllByRole("button", { name });
  return buttons[buttons.length - 1] as HTMLButtonElement;
}

function getFormInput(label: string): HTMLInputElement {
  const inputs = screen.getAllByLabelText(label);
  return inputs[inputs.length - 1] as HTMLInputElement;
}


