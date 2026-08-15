// Tests the password-recovery OTP flow without sending a real email.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake Auth methods provide predictable success and error responses.
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../src/supabase", () => ({ supabase: { auth } }));

import { ResetPasswordPage } from "../src/ResetPasswordPage";

beforeEach(() => {
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  auth.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  auth.verifyOtp.mockReset().mockResolvedValue({ data: { session: { user: {} } }, error: null });
  auth.updateUser.mockReset().mockResolvedValue({ error: null });
  auth.signOut.mockReset().mockResolvedValue({ error: null });
});

describe("Admin password recovery", () => {
  it("requests an OTP, verifies it, and resets the password", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/reset-password"]}><ResetPasswordPage /></MemoryRouter>);

    await user.type(await screen.findByLabelText("Admin email"), "admin@example.com");
    await user.click(screen.getByRole("button", { name: /Send recovery code/i }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("admin@example.com", expect.objectContaining({ redirectTo: expect.stringContaining("/reset-password") }));

    await user.type(screen.getByLabelText("6-digit recovery code"), "654321");
    await user.click(screen.getByRole("button", { name: /Verify code/i }));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "admin@example.com", token: "654321", type: "recovery" });

    await user.type(screen.getByLabelText("New password"), "newpass123");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass123");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass123" });
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
  });
});
