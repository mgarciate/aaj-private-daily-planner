import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("loads jest-dom matchers", () => {
    render(<main>Test harness ready</main>);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
