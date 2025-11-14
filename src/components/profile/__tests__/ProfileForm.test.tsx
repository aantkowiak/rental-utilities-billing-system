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
  it("saves email successfully", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        email: "jan.kowalski@example.com",
      },
    });

    apiPatchMock.mockResolvedValueOnce({
      profile: {
        email: "adam.nowak@example.com",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Adres email");
    expect(input).toHaveValue("jan.kowalski@example.com");

    fireEvent.change(input, { target: { value: "adam.nowak@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith("/api/v1/me", {
        email: "adam.nowak@example.com",
      })
    );

    expect(await screen.findByText("Zapisano profil")).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue("adam.nowak@example.com"));
  });

  it("shows field error and focuses input on validation error response", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        email: "jan.kowalski@example.com",
      },
    });

    apiPatchMock.mockRejectedValueOnce({
      code: "validation_error",
      message: "Validation failed",
      details: {
        email: "Wprowadź poprawny adres email.",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Adres email");
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText(/Wprowadź poprawny adres email\./i)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("validates required email field", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        email: "jan.kowalski@example.com",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Adres email");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText(/Wprowadź adres email\./i)).toBeInTheDocument();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    apiGetMock.mockResolvedValueOnce({
      profile: {
        email: "jan.kowalski@example.com",
      },
    });

    render(<ProfileForm />);

    const input = await screen.findByLabelText("Adres email");
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText(/Wprowadź poprawny adres email\./i)).toBeInTheDocument();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});
