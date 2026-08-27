import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../../pages/auth/LoginPage.js";
import { RegisterPage } from "../../pages/auth/RegisterPage.js";
import { authApi } from "../../api/auth.api.js";

vi.mock("../../api/auth.api.js", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

vi.mock("../../api/org.api.js", () => ({
  orgApi: {
    listOrganizations: vi.fn().mockResolvedValue([]),
  },
}));

describe("Frontend Auth UI Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render Login Page form inputs and submit credentials", async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { _id: "user1", name: "Alice", email: "alice@example.com", status: "ACTIVE", createdAt: "2026-01-01" },
      accessToken: "mock.jwt.token",
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText("you@company.com")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText("you@company.com"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "alice@example.com",
        password: "Password123!",
      });
    });
  });

  it("should render Register Page form inputs and validate password match", async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
    expect(screen.getByPlaceholderText("you@company.com")).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText("John Doe"), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), {
      target: { value: "jane@example.com" },
    });

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "Pass1" } });
    fireEvent.change(passwordInputs[1], { target: { value: "Pass2" } });

    fireEvent.click(screen.getByRole("button", { name: /register account/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
  });
});
