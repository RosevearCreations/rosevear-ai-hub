import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthView } from "./AuthView";
import { getAuthStatus, login } from "./api";

vi.mock("./api", () => ({
  login: vi.fn(),
  bootstrapOwner: vi.fn(),
  getAuthStatus: vi.fn(),
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const owner = {
  id: 1, username: "owner", role: "owner" as const,
  enabled: true, created_at: "2026-10-13T00:00:00Z",
};
const status = { bootstrap_required: false, authenticated: false, user: null };
function submit() {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "owner" } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct-owner-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Hub login cookie acceptance", () => {
  it("does not enter protected pages when login succeeded but cookie was lost", async () => {
    vi.mocked(login).mockResolvedValue(owner);
    vi.mocked(getAuthStatus).mockResolvedValue(status);
    const onAuthenticated = vi.fn();
    render(<AuthView status={status} onAuthenticated={onAuthenticated} />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("session cookie was not retained");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
  it("enters only after the second request confirms the session", async () => {
    vi.mocked(login).mockResolvedValue(owner);
    vi.mocked(getAuthStatus).mockResolvedValue({
      bootstrap_required: false, authenticated: true, user: owner,
    });
    const onAuthenticated = vi.fn();
    render(<AuthView status={status} onAuthenticated={onAuthenticated} />);
    submit();
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(owner));
  });
});
