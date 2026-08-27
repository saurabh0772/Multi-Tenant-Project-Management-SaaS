import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../../components/common/ErrorBoundary.js";

const ProblemChild = () => {
  throw new Error("Simulated rendering failure");
};

describe("Frontend ErrorBoundary Test Suite", () => {
  it("should render children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Normal Content")).toBeDefined();
  });

  it("should render fallback UI when child component throws unhandled error", () => {
    // Suppress console.error log for expected test exception
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(
      screen.getByText("An unexpected error occurred while rendering the application interface.")
    ).toBeDefined();
    expect(screen.getByText("Reload Application")).toBeDefined();

    spy.mockRestore();
  });
});
