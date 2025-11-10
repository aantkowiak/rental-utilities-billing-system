import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { apiGet, apiPatch } from "@/lib/client/http";

vi.mock("@/lib/client/http", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/http")>("@/lib/client/http");
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPatch: vi.fn(),
  };
});

const apiGetMock = apiGet as unknown as vi.Mock;
const apiPatchMock = apiPatch as unknown as vi.Mock;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfileForm", () => {
  it("saves display name successfully", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        displayName: "Jan Kowalski",
      },
    });

    apiPatchMock.mockResolvedValueOnce({
      profile: {
        displayName: "Adam Nowak",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Nazwa wyświetlana");
    expect(input).toHaveValue("Jan Kowalski");

    fireEvent.change(input, { target: { value: "Adam Nowak" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith("/api/v1/me", {
        displayName: "Adam Nowak",
      })
    );

    expect(await screen.findByText("Zapisano profil")).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue("Adam Nowak"));
  });

  it("shows field error and focuses input on validation error response", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        displayName: "Jan Kowalski",
      },
    });

    apiPatchMock.mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: {
        displayName: "Nazwa jest za krótka.",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Nazwa wyświetlana");
    fireEvent.change(input, { target: { value: "Adam" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText(/Nazwa jest za krótka\./i)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("shows inline banner when profile is missing", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        displayName: "Jan Kowalski",
      },
    });

    apiPatchMock.mockRejectedValueOnce({
      code: "profile_not_found",
      status: 404,
      message: "Profil nie został odnaleziony",
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Nazwa wyświetlana");
    fireEvent.change(input, { target: { value: "Adam Nowak" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText(/Profil nie został odnaleziony/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Zapisz" })).not.toBeDisabled());
  });

  it("shows toast and re-enables button on network error", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        displayName: "Jan Kowalski",
      },
    });

    apiPatchMock.mockRejectedValueOnce({
      code: "network_error",
      message: "Problemy z siecią",
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Nazwa wyświetlana");
    fireEvent.change(input, { target: { value: "Adam Nowak" } });
    const submitButton = screen.getByRole("button", { name: "Zapisz" });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Nie udało się zapisać profilu/i)).toBeInTheDocument();
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});


