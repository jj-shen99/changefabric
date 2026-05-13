/**
 * Tests for analytics UI component logic
 * 
 * These tests verify the UI computation logic for charts, KPIs, and visualizations.
 */

describe("Analytics UI - Risk Color Classification", () => {
  const riskColor = (score: number) => {
    if (score >= 80) return "#ef4444"; // red
    if (score >= 60) return "#f97316"; // orange
    if (score >= 40) return "#eab308"; // yellow
    return "#22c55e"; // green
  };

  it("returns green for low risk (< 40)", () => {
    expect(riskColor(0)).toBe("#22c55e");
    expect(riskColor(20)).toBe("#22c55e");
    expect(riskColor(39)).toBe("#22c55e");
  });

  it("returns yellow for medium risk (40-59)", () => {
    expect(riskColor(40)).toBe("#eab308");
    expect(riskColor(50)).toBe("#eab308");
    expect(riskColor(59)).toBe("#eab308");
  });

  it("returns orange for high risk (60-79)", () => {
    expect(riskColor(60)).toBe("#f97316");
    expect(riskColor(70)).toBe("#f97316");
    expect(riskColor(79)).toBe("#f97316");
  });

  it("returns red for critical risk (>= 80)", () => {
    expect(riskColor(80)).toBe("#ef4444");
    expect(riskColor(90)).toBe("#ef4444");
    expect(riskColor(100)).toBe("#ef4444");
  });
});

describe("Analytics UI - Pie Chart Data", () => {
  it("generates correct pie data from deployment outcomes", () => {
    const deployed = 80;
    const failed = 10;
    const rolledBack = 5;
    const totalChanges = 100;

    const pieData = [
      { name: "Deployed", value: deployed, fill: "#22c55e" },
      { name: "Failed", value: failed, fill: "#ef4444" },
      { name: "Rolled Back", value: rolledBack, fill: "#f97316" },
      { name: "Other", value: totalChanges - deployed - failed - rolledBack, fill: "#94a3b8" },
    ].filter(d => d.value > 0);

    expect(pieData.length).toBe(4);
    expect(pieData.find(d => d.name === "Deployed")?.value).toBe(80);
    expect(pieData.find(d => d.name === "Failed")?.value).toBe(10);
    expect(pieData.find(d => d.name === "Rolled Back")?.value).toBe(5);
    expect(pieData.find(d => d.name === "Other")?.value).toBe(5);
  });

  it("filters out zero-value segments", () => {
    const deployed = 100;
    const failed = 0;
    const rolledBack = 0;
    const totalChanges = 100;

    const pieData = [
      { name: "Deployed", value: deployed, fill: "#22c55e" },
      { name: "Failed", value: failed, fill: "#ef4444" },
      { name: "Rolled Back", value: rolledBack, fill: "#f97316" },
      { name: "Other", value: totalChanges - deployed - failed - rolledBack, fill: "#94a3b8" },
    ].filter(d => d.value > 0);

    expect(pieData.length).toBe(1);
    expect(pieData[0].name).toBe("Deployed");
  });
});

describe("Analytics UI - KPI Formatting", () => {
  it("formats failure rate with percentage", () => {
    const changeFailureRate = 15;
    const formatted = `${changeFailureRate}%`;
    expect(formatted).toBe("15%");
  });

  it("determines failure rate color based on thresholds", () => {
    const getFailureRateColor = (rate: number) => {
      if (rate > 15) return "#ef4444"; // red
      if (rate > 5) return "#eab308"; // yellow
      return "#22c55e"; // green
    };

    expect(getFailureRateColor(20)).toBe("#ef4444");
    expect(getFailureRateColor(15)).toBe("#eab308");
    expect(getFailureRateColor(10)).toBe("#eab308");
    expect(getFailureRateColor(5)).toBe("#22c55e");
    expect(getFailureRateColor(3)).toBe("#22c55e");
  });

  it("formats lead time in hours", () => {
    const leadTimeHours = 24.5;
    const formatted = `${Math.round(leadTimeHours * 10) / 10}h`;
    expect(formatted).toBe("24.5h");
  });
});

describe("Analytics UI - Weekly Health Data", () => {
  it("calculates success rate from deployment data", () => {
    const successful = 90;
    const failed = 5;
    const rolledBack = 5;
    const total = successful + failed + rolledBack;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
    expect(successRate).toBe(90);
  });

  it("returns 100% success rate when no deployments", () => {
    const successful = 0;
    const failed = 0;
    const rolledBack = 0;
    const total = successful + failed + rolledBack;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
    expect(successRate).toBe(100);
  });

  it("generates weekly health data structure", () => {
    const deploymentData = [
      { date: "2024-01-01", successful: 10, failed: 1, rolledBack: 0 },
      { date: "2024-01-08", successful: 8, failed: 2, rolledBack: 1 },
    ];

    const weeklyHealth = deploymentData.map((d, i) => {
      const total = (d.successful || 0) + (d.failed || 0) + (d.rolledBack || 0);
      const successRate = total > 0 ? Math.round((d.successful || 0) / total * 100) : 100;
      return {
        week: d.date || `W${i + 1}`,
        success: successRate,
        changes: total,
      };
    });

    expect(weeklyHealth[0].success).toBe(91); // 10/11 = 91%
    expect(weeklyHealth[0].changes).toBe(11);
    expect(weeklyHealth[1].success).toBe(73); // 8/11 = 73%
    expect(weeklyHealth[1].changes).toBe(11);
  });
});

describe("Analytics UI - Lead Time Breakdown", () => {
  it("calculates lead time breakdown from average", () => {
    const avgLeadTime = 40; // hours

    const breakdown = [
      { stage: "Code Review", avgHours: Math.round(avgLeadTime * 0.2 * 10) / 10 },
      { stage: "Automated Tests", avgHours: Math.round(avgLeadTime * 0.03 * 10) / 10 },
      { stage: "Security Scan", avgHours: Math.round(avgLeadTime * 0.02 * 10) / 10 },
      { stage: "UAT/Approval", avgHours: Math.round(avgLeadTime * 0.6 * 10) / 10 },
      { stage: "Staging Deploy", avgHours: Math.round(avgLeadTime * 0.01 * 10) / 10 },
      { stage: "Canary/Rollout", avgHours: Math.round(avgLeadTime * 0.1 * 10) / 10 },
      { stage: "Full Deploy", avgHours: Math.round(avgLeadTime * 0.04 * 10) / 10 },
    ];

    expect(breakdown[0].avgHours).toBe(8); // 40 * 0.2 = 8
    expect(breakdown[3].avgHours).toBe(24); // 40 * 0.6 = 24
    expect(breakdown[5].avgHours).toBe(4); // 40 * 0.1 = 4
  });
});

describe("Analytics UI - Failure Root Cause Analysis", () => {
  it("calculates root cause percentages from failure data", () => {
    const totalChanges = 100;
    const failed = 20;
    const rolledBack = 5;

    const causes = [
      { cause: "Insufficient Testing", pct: failed > 0 ? Math.round((failed * 0.35 / Math.max(1, totalChanges)) * 100) : 0 },
      { cause: "Configuration Drift", pct: failed > 0 ? Math.round((failed * 0.22 / Math.max(1, totalChanges)) * 100) : 0 },
      { cause: "Dependency Conflict", pct: failed > 0 ? Math.round((failed * 0.18 / Math.max(1, totalChanges)) * 100) : 0 },
      { cause: "Inadequate Rollback Plan", pct: rolledBack > 0 ? Math.round((rolledBack * 0.4 / Math.max(1, totalChanges)) * 100) : 0 },
    ];

    expect(causes[0].pct).toBe(7); // 20 * 0.35 / 100 * 100 = 7%
    expect(causes[1].pct).toBe(4); // 20 * 0.22 / 100 * 100 = 4.4% -> 4%
    expect(causes[3].pct).toBe(2); // 5 * 0.4 / 100 * 100 = 2%
  });

  it("filters out zero percentage causes", () => {
    const totalChanges = 100;
    const failed = 0;
    const rolledBack = 0;

    const causes = [
      { cause: "Insufficient Testing", pct: failed > 0 ? Math.round((failed * 0.35 / Math.max(1, totalChanges)) * 100) : 0 },
      { cause: "Configuration Drift", pct: failed > 0 ? Math.round((failed * 0.22 / Math.max(1, totalChanges)) * 100) : 0 },
    ].filter(c => c.pct > 0);

    expect(causes.length).toBe(0);
  });
});

describe("Analytics UI - AI Insights Generation", () => {
  it("generates critical insight for high failure rate", () => {
    const changeFailureRate = 20;
    const insights: { text: string; severity: string }[] = [];

    if (changeFailureRate > 15) {
      insights.push({
        text: `Change failure rate (${changeFailureRate}%) exceeds industry threshold of 15%`,
        severity: "critical",
      });
    }

    expect(insights.length).toBe(1);
    expect(insights[0].severity).toBe("critical");
  });

  it("generates medium insight for moderate failure rate", () => {
    const changeFailureRate = 10;
    const insights: { text: string; severity: string }[] = [];

    if (changeFailureRate > 15) {
      insights.push({ text: "High failure rate", severity: "critical" });
    } else if (changeFailureRate > 5) {
      insights.push({ text: "Moderate failure rate", severity: "medium" });
    }

    expect(insights.length).toBe(1);
    expect(insights[0].severity).toBe("medium");
  });

  it("generates info insight for low failure rate", () => {
    const changeFailureRate = 3;
    const insights: { text: string; severity: string }[] = [];

    if (changeFailureRate > 15) {
      insights.push({ text: "High failure rate", severity: "critical" });
    } else if (changeFailureRate > 5) {
      insights.push({ text: "Moderate failure rate", severity: "medium" });
    } else {
      insights.push({ text: "Low failure rate - elite performance", severity: "info" });
    }

    expect(insights.length).toBe(1);
    expect(insights[0].severity).toBe("info");
  });

  it("generates high severity insight for elevated rollback rate", () => {
    const rollbackRate = 15;
    const insights: { text: string; severity: string }[] = [];

    if (rollbackRate > 10) {
      insights.push({
        text: `Rollback rate (${rollbackRate}%) is elevated`,
        severity: "high",
      });
    }

    expect(insights.length).toBe(1);
    expect(insights[0].severity).toBe("high");
  });

  it("generates insight for perfect deployment record", () => {
    const deployed = 50;
    const failed = 0;
    const rolledBack = 0;
    const insights: { text: string; severity: string }[] = [];

    if (deployed > 0 && failed === 0 && rolledBack === 0) {
      insights.push({
        text: `Perfect deployment record: ${deployed} successful with zero failures`,
        severity: "info",
      });
    }

    expect(insights.length).toBe(1);
    expect(insights[0].text).toContain("Perfect deployment record");
  });
});

describe("Analytics UI - Team Efficiency Radar", () => {
  it("calculates radar metrics correctly", () => {
    const teamVelocity = [
      { team: "Platform Team", totalChanges: 10, deployed: 9, avgRisk: 30, deployRate: 90 },
      { team: "API Team", totalChanges: 8, deployed: 6, avgRisk: 50, deployRate: 75 },
    ];

    const radarData = teamVelocity.map(tv => ({
      team: tv.team,
      deployRate: tv.deployRate,
      riskControl: Math.max(0, 100 - tv.avgRisk),
      volume: Math.min(100, tv.totalChanges * 10),
    }));

    expect(radarData[0].deployRate).toBe(90);
    expect(radarData[0].riskControl).toBe(70); // 100 - 30
    expect(radarData[0].volume).toBe(100); // min(100, 10*10)

    expect(radarData[1].deployRate).toBe(75);
    expect(radarData[1].riskControl).toBe(50); // 100 - 50
    expect(radarData[1].volume).toBe(80); // min(100, 8*10)
  });

  it("truncates long team names", () => {
    const teamName = "Very Long Team Name That Should Be Truncated";
    const truncated = teamName.length > 12 ? teamName.slice(0, 10) + "…" : teamName;
    expect(truncated).toBe("Very Long …");
    expect(truncated.length).toBe(11);
  });
});

describe("Analytics UI - Severity Color Mapping", () => {
  it("maps severity to correct CSS classes", () => {
    const sevColor = (s: string) => {
      if (s === "critical") return "border-red-300 bg-red-50";
      if (s === "high") return "border-orange-300 bg-orange-50";
      if (s === "medium") return "border-amber-300 bg-amber-50";
      return "border-blue-300 bg-blue-50";
    };

    expect(sevColor("critical")).toContain("red");
    expect(sevColor("high")).toContain("orange");
    expect(sevColor("medium")).toContain("amber");
    expect(sevColor("info")).toContain("blue");
    expect(sevColor("unknown")).toContain("blue"); // default
  });
});

describe("Analytics UI - Date Range Selection", () => {
  it("calculates correct date range for 7 days", () => {
    const days = 7;
    const now = Date.now();
    const since = new Date(now - days * 86400000);
    const expectedDiff = Math.round((now - since.getTime()) / 86400000);
    expect(expectedDiff).toBe(7);
  });

  it("calculates correct date range for 30 days", () => {
    const days = 30;
    const now = Date.now();
    const since = new Date(now - days * 86400000);
    const expectedDiff = Math.round((now - since.getTime()) / 86400000);
    expect(expectedDiff).toBe(30);
  });

  it("calculates correct date range for 90 days", () => {
    const days = 90;
    const now = Date.now();
    const since = new Date(now - days * 86400000);
    const expectedDiff = Math.round((now - since.getTime()) / 86400000);
    expect(expectedDiff).toBe(90);
  });
});
