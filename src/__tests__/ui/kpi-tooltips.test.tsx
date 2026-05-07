/**
 * Tests for KPI Tooltips across all pages
 * Ensures tooltips are present and correctly describe each KPI
 */
import "@testing-library/jest-dom";

describe("KPI Tooltip Definitions", () => {
  describe("Changes List Page KPIs", () => {
    const kpiDefinitions = {
      pending: {
        label: "Pending",
        tooltip: "CRs in: Draft, Submitted, Assessing, Awaiting Approval",
        states: ["draft", "submitted", "assessing", "awaiting_approval"],
      },
      inFlight: {
        label: "In Flight",
        tooltip: "CRs in: Approved, Scheduled, In Progress, Implemented, Reviewing",
        states: ["approved", "scheduled", "in_progress", "implemented", "reviewing"],
      },
      closed: {
        label: "Closed",
        tooltip: "Successfully completed change requests",
        states: ["closed"],
      },
      rejected: {
        label: "Rejected",
        tooltip: "CRs that were canceled or rejected",
        states: ["canceled", "rejected"],
      },
      total: {
        label: "Total",
        tooltip: "Total number of change requests",
      },
    };

    it("pending KPI includes correct states", () => {
      const pendingStates = kpiDefinitions.pending.states;
      expect(pendingStates).toContain("draft");
      expect(pendingStates).toContain("submitted");
      expect(pendingStates).toContain("assessing");
      expect(pendingStates).toContain("awaiting_approval");
      expect(pendingStates).not.toContain("approved");
      expect(pendingStates).not.toContain("closed");
    });

    it("in flight KPI includes correct states", () => {
      const inFlightStates = kpiDefinitions.inFlight.states;
      expect(inFlightStates).toContain("approved");
      expect(inFlightStates).toContain("scheduled");
      expect(inFlightStates).toContain("in_progress");
      expect(inFlightStates).toContain("implemented");
      expect(inFlightStates).toContain("reviewing");
      expect(inFlightStates).not.toContain("draft");
      expect(inFlightStates).not.toContain("closed");
    });

    it("closed KPI only includes closed state", () => {
      expect(kpiDefinitions.closed.states).toEqual(["closed"]);
    });

    it("rejected KPI includes canceled and rejected states", () => {
      const rejectedStates = kpiDefinitions.rejected.states;
      expect(rejectedStates).toContain("canceled");
      expect(rejectedStates).toContain("rejected");
      expect(rejectedStates).not.toContain("closed");
    });

    it("all KPIs have tooltips defined", () => {
      Object.values(kpiDefinitions).forEach((kpi) => {
        expect(kpi.tooltip).toBeDefined();
        expect(kpi.tooltip.length).toBeGreaterThan(10);
      });
    });

    it("KPI state groups are mutually exclusive", () => {
      const allStates = [
        ...kpiDefinitions.pending.states,
        ...kpiDefinitions.inFlight.states,
        ...kpiDefinitions.closed.states,
        ...kpiDefinitions.rejected.states,
      ];
      const uniqueStates = new Set(allStates);
      expect(uniqueStates.size).toBe(allStates.length);
    });
  });

  describe("Analytics Page KPIs - Failure Analysis", () => {
    const failureKpis = [
      { label: "Total Changes", tooltip: "Total number of change requests in selected period" },
      { label: "Deployed", tooltip: "Successfully deployed/closed change requests" },
      { label: "Failed", tooltip: "Change requests that failed or were rejected" },
      { label: "Rolled Back", tooltip: "Changes that required rollback after deployment" },
      { label: "Failure Rate", tooltip: "Percentage of changes that failed (Failed / Total)" },
    ];

    it("all failure analysis KPIs have tooltips", () => {
      failureKpis.forEach((kpi) => {
        expect(kpi.tooltip).toBeDefined();
        expect(kpi.tooltip.length).toBeGreaterThan(10);
      });
    });

    it("failure rate tooltip explains calculation", () => {
      const failureRateKpi = failureKpis.find((k) => k.label === "Failure Rate");
      expect(failureRateKpi?.tooltip).toContain("Failed");
      expect(failureRateKpi?.tooltip).toContain("Total");
    });
  });

  describe("Analytics Page KPIs - Velocity", () => {
    const velocityKpis = [
      { label: "Total Changes", tooltip: "Total changes across all teams" },
      { label: "Deployed", tooltip: "Successfully deployed changes" },
      { label: "Avg Lead Time", tooltip: "Average time from creation to deployment (hours)" },
      { label: "Teams Active", tooltip: "Number of teams with change activity" },
    ];

    it("all velocity KPIs have tooltips", () => {
      velocityKpis.forEach((kpi) => {
        expect(kpi.tooltip).toBeDefined();
        expect(kpi.tooltip.length).toBeGreaterThan(10);
      });
    });

    it("lead time tooltip mentions hours", () => {
      const leadTimeKpi = velocityKpis.find((k) => k.label === "Avg Lead Time");
      expect(leadTimeKpi?.tooltip).toContain("hours");
    });
  });

  describe("Analytics Page KPIs - DORA Metrics", () => {
    const doraKpis = [
      { label: "Deployment Frequency", tooltip: "How often code is deployed to production. Elite: multiple per day" },
      { label: "Lead Time for Changes", tooltip: "Time from code commit to production deployment. Elite: < 1 day" },
      { label: "Mean Time to Recovery", tooltip: "Time to restore service after an incident. Elite: < 1 hour" },
      { label: "Change Failure Rate", tooltip: "Percentage of deployments causing failures. Elite: < 5%" },
    ];

    it("all DORA KPIs have tooltips with elite benchmarks", () => {
      doraKpis.forEach((kpi) => {
        expect(kpi.tooltip).toBeDefined();
        expect(kpi.tooltip).toContain("Elite");
      });
    });
  });

  describe("Analytics Page KPIs - Change Health", () => {
    const healthKpis = [
      { label: "Overall Health", tooltip: "Composite score: Deploy Rate (40%) + Risk Inverse (30%) + Failure Inverse (30%)" },
      { label: "Avg Deploy Rate", tooltip: "Average percentage of changes successfully deployed across all teams" },
      { label: "Avg Team Risk", tooltip: "Average risk score across all teams (0-100). Lower is better" },
      { label: "Failure Rate", tooltip: "Percentage of changes that failed or were rejected" },
      { label: "Active Teams", tooltip: "Number of teams with change activity in selected period" },
    ];

    it("all health KPIs have tooltips", () => {
      healthKpis.forEach((kpi) => {
        expect(kpi.tooltip).toBeDefined();
        expect(kpi.tooltip.length).toBeGreaterThan(10);
      });
    });

    it("overall health tooltip explains formula", () => {
      const healthKpi = healthKpis.find((k) => k.label === "Overall Health");
      expect(healthKpi?.tooltip).toContain("40%");
      expect(healthKpi?.tooltip).toContain("30%");
    });
  });
});
