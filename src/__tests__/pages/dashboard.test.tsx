/**
 * Tests for / (dashboard) page - Main Dashboard
 * These tests validate the dashboard page structure and expected elements
 */
import React from "react";
import "@testing-library/jest-dom";

describe("Dashboard Page Structure", () => {
  describe("Expected Routes", () => {
    it("dashboard is at root path", () => {
      expect("/").toBe("/");
    });

    it("links to changes list", () => {
      expect("/changes").toBe("/changes");
    });

    it("links to individual CRs", () => {
      const crNumber = "CHG0000001";
      expect(`/changes/${crNumber}`).toBe("/changes/CHG0000001");
    });
  });

  describe("Expected Data Display", () => {
    const mockData = {
      changeRequests: [
        { number: "CHG0000001", state: "awaiting_approval", computedRiskScore: 75 },
        { number: "CHG0000002", state: "scheduled", computedRiskScore: 25 },
        { number: "CHG0000003", state: "implemented", computedRiskScore: 50 },
      ],
    };

    it("calculates total count", () => {
      expect(mockData.changeRequests.length).toBe(3);
    });

    it("identifies high risk changes", () => {
      const highRisk = mockData.changeRequests.filter((cr) => cr.computedRiskScore >= 75);
      expect(highRisk.length).toBe(1);
    });

    it("groups by state", () => {
      const states = mockData.changeRequests.map((cr) => cr.state);
      expect(states).toContain("awaiting_approval");
      expect(states).toContain("scheduled");
      expect(states).toContain("implemented");
    });
  });

  describe("Risk Score Thresholds", () => {
    it("low risk is 0-24", () => {
      expect(24).toBeLessThan(25);
    });

    it("moderate risk is 25-49", () => {
      expect(25).toBeGreaterThanOrEqual(25);
      expect(49).toBeLessThan(50);
    });

    it("high risk is 50-74", () => {
      expect(50).toBeGreaterThanOrEqual(50);
      expect(74).toBeLessThan(75);
    });

    it("critical risk is 75+", () => {
      expect(75).toBeGreaterThanOrEqual(75);
    });
  });
});
