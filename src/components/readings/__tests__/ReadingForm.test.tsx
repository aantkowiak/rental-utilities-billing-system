import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/common/ToastProvider";
import { ReadingForm } from "@/components/readings/ReadingForm";
import type { ReadingDTO } from "@/types";
import type { ReadingListResponse, ReadingResponse } from "@/types/readings";
import { apiGet, apiPatch, apiPost } from "@/lib/client/http";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPatch: vi.fn(),
  };
});

const NOW = new Date("2024-05-10T12:00:00Z");

describe("ReadingForm", () => {
  beforeEach(() => {
    (apiGet as unknown as vi.Mock).mockResolvedValue({ items: [] } satisfies ReadingListResponse);
    (apiPost as unknown as vi.Mock).mockResolvedValue({ reading: buildReading() } satisfies ReadingResponse);
    (apiPatch as unknown as vi.Mock).mockResolvedValue({ reading: buildReading() } satisfies ReadingResponse);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderForm = async (options: { propertyId?: string | null; reading?: ReadingDTO | null } = {}) => {
    const { propertyId = "property-1", reading = null } = options;

    if (reading) {
      (apiGet as unknown as vi.Mock).mockResolvedValueOnce({ items: [reading] } satisfies ReadingListResponse);
    }

    const utils = render(
      <ToastProvider>
        <ReadingForm nowFactory={() => NOW} propertyId={propertyId} />
      </ToastProvider>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalled());

    return utils;
  };

  it("clamps decimal precision on blur", async () => {
    await renderForm();

    const coldInput = await screen.findByLabelText(/zimna woda/i);
    fireEvent.change(coldInput, { target: { value: "1,23456" } });
    fireEvent.blur(coldInput);

    expect(coldInput).toHaveValue("1,235");
  });

  it.skip("disables numeric inputs outside submission window", async () => {
    const outsideWindowReading = buildReading({
      readingAt: "2024-05-01T00:00:00.000Z",
    });

    await renderForm({ reading: outsideWindowReading });

    const submitButton = screen.getByRole("button", { name: /zapisz/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/maksymalnie 3 dni wstecz/i)).toBeInTheDocument();

    const coldInput = screen.getByLabelText(/zimna woda/i);
    expect(coldInput).toBeDisabled();
  });

  it("creates a new reading when no existing record is present", async () => {
    await renderForm();

    fillReadingInputs({
      cold: "12,5",
      hot: "34,1",
      heating: "5,678",
    });

    fireEvent.click(screen.getByRole("button", { name: /zapisz odczyt/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    expect(apiPatch).not.toHaveBeenCalled();

    const payload = (apiPost as unknown as vi.Mock).mock.calls[0]?.[1];
    expect(payload).toMatchObject({
      propertyId: "property-1",
      coldM3: 12.5,
      hotM3: 34.1,
      heatingGj: 5.678,
    });

    expect(await screen.findByText(/Dodano odczyt/i)).toBeInTheDocument();
  });

  it("updates an existing reading via PATCH", async () => {
    const existing = buildReading({ id: "existing", coldM3: 10, hotM3: 20, heatingGj: 30 });
    await renderForm({ reading: existing });

    const coldInput = await screen.findByLabelText(/zimna woda/i);
    fireEvent.change(coldInput, { target: { value: "11,5" } });

    fireEvent.click(screen.getByRole("button", { name: /zapisz zmiany/i }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledTimes(1));
    const [url, payload] = (apiPatch as unknown as vi.Mock).mock.calls[0];

    expect(url).toContain("existing");
    expect(payload).toMatchObject({ coldM3: 11.5 });
  });

  it("maps validation errors to inline feedback", async () => {
    (apiPost as unknown as vi.Mock).mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: {
        errors: {
          coldM3: { _errors: ["Zbyt wysoka wartość"] },
        },
      },
    });

    await renderForm();

    fillReadingInputs();

    fireEvent.click(screen.getByRole("button", { name: /zapisz odczyt/i }));

    expect(await screen.findByText("Zbyt wysoka wartość")).toBeInTheDocument();
    const coldInput = screen.getByLabelText(/zimna woda/i);
    await waitFor(() => expect(coldInput).toHaveFocus());
  });

  it("shows conflict toast and refetches latest data", async () => {
    (apiGet as unknown as vi.Mock)
      .mockResolvedValueOnce({ items: [] } satisfies ReadingListResponse)
      .mockResolvedValueOnce({ items: [buildReading({ id: "refetched" })] } satisfies ReadingListResponse);

    (apiPost as unknown as vi.Mock).mockRejectedValueOnce({
      code: "conflict",
      message: "Conflict detected",
    });

    await renderForm();

    fillReadingInputs();
    fireEvent.click(screen.getByRole("button", { name: /zapisz odczyt/i }));

    expect(await screen.findByText(/Nie zapisano odczytu/i)).toBeInTheDocument();
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
  });

  const fillReadingInputs = (values?: { cold?: string; hot?: string; heating?: string; comment?: string }) => {
    const { cold = "1,111", hot = "2,222", heating = "3,333", comment = "Notatka" } = values ?? {};

    fireEvent.change(screen.getByLabelText(/zimna woda/i), { target: { value: cold } });
    fireEvent.change(screen.getByLabelText(/ciepła woda/i), { target: { value: hot } });
    fireEvent.change(screen.getByLabelText(/ogrzewanie/i), { target: { value: heating } });
    fireEvent.change(screen.getByLabelText(/notatka/i), { target: { value: comment } });
  };
});

function buildReading(overrides: Partial<ReadingDTO> = {}): ReadingDTO {
  return {
    id: "reading-id",
    propertyId: "property-1",
    readingAt: overrides.readingAt ?? NOW.toISOString(),
    effectiveMonth: null,
    origin: "tenant",
    readingType: "regular",
    coldM3: 1.23,
    hotM3: 2.34,
    heatingGj: 3.45,
    coldReplaced: false,
    hotReplaced: false,
    heatingReplaced: false,
    commentText: null,
    commentVisibleToTenant: true,
    deletedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}
