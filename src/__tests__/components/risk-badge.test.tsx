/**
 * Tests for RiskBadge component
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RiskBadge } from "@/components/risk-badge";

describe("RiskBadge", () => {
  it("renders with low risk score (0-24)", () => {
    render(<RiskBadge score={20} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("(20)")).toBeInTheDocument();
  });

  it("renders with moderate risk score (25-49)", () => {
    render(<RiskBadge score={35} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("renders with high risk score (50-74)", () => {
    render(<RiskBadge score={65} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders with critical risk score (75+)", () => {
    render(<RiskBadge score={85} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("hides score when showScore is false", () => {
    render(<RiskBadge score={50} showScore={false} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText("(50)")).not.toBeInTheDocument();
  });

  it("renders with small size", () => {
    const { container } = render(<RiskBadge score={50} size="sm" />);
    expect(container.firstChild).toHaveClass("text-[10px]");
  });

  it("renders with medium size by default", () => {
    const { container } = render(<RiskBadge score={50} />);
    expect(container.firstChild).toHaveClass("text-xs");
  });

  it("renders with large size", () => {
    const { container } = render(<RiskBadge score={50} size="lg" />);
    expect(container.firstChild).toHaveClass("text-sm");
  });

  it("applies green background for low risk", () => {
    const { container } = render(<RiskBadge score={15} />);
    expect(container.firstChild).toHaveClass("bg-green-100");
  });

  it("applies red background for critical risk", () => {
    const { container } = render(<RiskBadge score={90} />);
    expect(container.firstChild).toHaveClass("bg-red-100");
  });

  it("handles edge case score of 0", () => {
    render(<RiskBadge score={0} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("handles edge case score of 100", () => {
    render(<RiskBadge score={100} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("handles boundary score of 25 (moderate threshold)", () => {
    render(<RiskBadge score={25} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("handles boundary score of 50 (high threshold)", () => {
    render(<RiskBadge score={50} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("handles boundary score of 75 (critical threshold)", () => {
    render(<RiskBadge score={75} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
