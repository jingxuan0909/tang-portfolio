// Tests Admin login, OTP, Guest restrictions, editing, deletion, uploads, visibility, and dialogs.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import initialContent from "../data/content.json";

// Hoisted mocks replace Supabase so tests never modify real portfolio data or files.
const mocks = vi.hoisted(() => ({
  context: { content: null, setContent: vi.fn(), refresh: vi.fn() },
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    signOut: vi.fn(),
  },
  upsert: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("../src/content-context", () => ({ useContent: () => mocks.context }));
vi.mock("../src/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: mocks.auth,
    from: () => ({ upsert: mocks.upsert }),
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl }),
    },
  },
}));

import { AdminPage } from "../src/AdminPage";

function renderAdmin() {
  return render(<MemoryRouter initialEntries={["/admin"]}><AdminPage /></MemoryRouter>);
}

function setAuthenticatedSession() {
  sessionStorage.setItem("tang-admin-otp-verified", "true");
  mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { email: "admin@example.com" } } } });
}

beforeEach(() => {
  const savedContent = structuredClone(initialContent);
  mocks.context.content = savedContent;
  mocks.context.setContent.mockReset();
  mocks.context.refresh.mockReset().mockResolvedValue(undefined);
  mocks.auth.getSession.mockReset().mockResolvedValue({ data: { session: null } });
  mocks.auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  mocks.auth.signInWithOtp.mockReset().mockResolvedValue({ error: null });
  mocks.auth.verifyOtp.mockReset().mockResolvedValue({ data: { session: { user: {} } }, error: null });
  mocks.auth.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.remove.mockReset().mockResolvedValue({ error: null });
  mocks.getPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/portfolio-files/2026/new-file.pdf` } });
  mocks.upsert.mockReset().mockImplementation(({ content }) => ({
    select: () => ({ single: async () => ({ data: { content }, error: null }) }),
  }));
  window.confirm = vi.fn(() => true);
});

describe("Admin authentication and editing", () => {
  it("requires password and then verifies the six-digit email OTP", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.type(await screen.findByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({ email: "admin@example.com", password: "password123" });
    expect(mocks.auth.signInWithOtp).toHaveBeenCalled();
    await user.type(screen.getByLabelText("6-digit verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and enter Admin" }));

    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ email: "admin@example.com", token: "123456", type: "email" });
    expect(await screen.findByText("Portfolio Content")).toBeInTheDocument();
  });

  it("marks Guest Preview controls as unavailable to assistive technology", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: /Explore Admin as Guest/i }));

    expect(screen.getByText("Admin Guest Preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add paragraph/i })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/Locked controls are unavailable/i)).toHaveAttribute("id", "guest-read-only-message");
  });

  it("confirms deletion, shows unsaved state, and publishes only after Save changes", async () => {
    setAuthenticatedSession();
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("Portfolio Content");

    const aboutCard = screen.getByRole("heading", { name: "About paragraphs" }).closest("section");
    await user.click(within(aboutCard).getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByRole("dialog", { name: /Delete About paragraphs paragraph/i })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalled());
    expect(await screen.findByText(/Changes saved successfully/i)).toBeInTheDocument();
  });

  it("traps modal focus, closes with Escape, and restores focus to Add", async () => {
    setAuthenticatedSession();
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("Portfolio Content");

    const addButton = screen.getByRole("button", { name: /Add paragraph/i });
    await user.click(addButton);
    const dialog = screen.getByRole("dialog", { name: /Add About paragraphs/i });
    await waitFor(() => expect(within(dialog).getByLabelText("Paragraph")).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(addButton).toHaveFocus();
  });

  it("edits a skill and hides the Semester Results section without deleting it", async () => {
    setAuthenticatedSession();
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("Portfolio Content");

    const skillsCard = screen.getByRole("heading", { name: "Skills" }).closest("section");
    await user.click(within(skillsCard).getByRole("button", { name: /Open/i }));
    await user.click(within(skillsCard).getAllByRole("button", { name: "Edit" })[0]);
    const skillInput = screen.getByRole("dialog").querySelector("input");
    await user.clear(skillInput);
    await user.type(skillInput, "Security Operations");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Update" }));
    expect(within(skillsCard).getByText("Security Operations")).toBeInTheDocument();

    const semesterCard = screen.getByRole("heading", { name: "Semester Results" }).closest("section");
    await user.click(within(semesterCard).getByRole("button", { name: /Open/i }));
    const visibilityToggle = within(semesterCard).getByRole("checkbox");
    expect(visibilityToggle).toBeChecked();
    await user.click(visibilityToggle);
    expect(visibilityToggle).not.toBeChecked();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("uploads a replacement and removes the old Supabase Storage object after saving", async () => {
    const oldUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/portfolio-files/2026/old-file.pdf`;
    mocks.context.content.certifications[0].url = oldUrl;
    setAuthenticatedSession();
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("Portfolio Content");

    const certificateCard = screen.getByRole("heading", { name: "Certificates" }).closest("section");
    await user.click(within(certificateCard).getByRole("button", { name: /Open/i }));
    const fileInput = certificateCard.querySelector('input[type="file"]');
    await user.upload(fileInput, new File(["certificate"], "replacement.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(["2026/old-file.pdf"]));
  });
});
