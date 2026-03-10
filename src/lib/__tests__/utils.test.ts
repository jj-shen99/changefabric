import { getRiskLabel, getRiskBg, getRiskFill, formatDate, formatNumber } from "../utils";

describe("getRiskLabel", () => {
  it("returns Critical for scores >= 80", () => {
    expect(getRiskLabel(80)).toBe("Critical");
    expect(getRiskLabel(100)).toBe("Critical");
  });

  it("returns High for scores >= 60", () => {
    expect(getRiskLabel(60)).toBe("High");
    expect(getRiskLabel(79)).toBe("High");
  });

  it("returns Medium for scores >= 40", () => {
    expect(getRiskLabel(40)).toBe("Medium");
    expect(getRiskLabel(59)).toBe("Medium");
  });

  it("returns Low for scores < 40", () => {
    expect(getRiskLabel(0)).toBe("Low");
    expect(getRiskLabel(39)).toBe("Low");
  });
});

describe("getRiskBg", () => {
  it("returns correct Tailwind classes for each risk level", () => {
    expect(getRiskBg(85)).toContain("red");
    expect(getRiskBg(65)).toContain("orange");
    expect(getRiskBg(45)).toContain("yellow");
    expect(getRiskBg(20)).toContain("green");
  });
});

describe("getRiskFill", () => {
  it("returns hex color for each risk level", () => {
    expect(getRiskFill(85)).toBe("#ef4444");
    expect(getRiskFill(65)).toBe("#f97316");
    expect(getRiskFill(45)).toBe("#eab308");
    expect(getRiskFill(20)).toBe("#22c55e");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-03-09T10:00:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatNumber", () => {
  it("formats large numbers with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles small numbers", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(0)).toBe("0");
  });
});
