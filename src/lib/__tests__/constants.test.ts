import { RISK_THRESHOLDS, RISK_LABELS, NAV_ITEMS, NAV_SECTIONS, PAGINATION, APP_CONFIG } from "../constants";

describe("RISK_THRESHOLDS", () => {
  it("has correct threshold values", () => {
    expect(RISK_THRESHOLDS.CRITICAL).toBe(80);
    expect(RISK_THRESHOLDS.HIGH).toBe(60);
    expect(RISK_THRESHOLDS.MEDIUM).toBe(40);
    expect(RISK_THRESHOLDS.LOW).toBe(0);
  });

  it("thresholds are in descending order", () => {
    expect(RISK_THRESHOLDS.CRITICAL).toBeGreaterThan(RISK_THRESHOLDS.HIGH);
    expect(RISK_THRESHOLDS.HIGH).toBeGreaterThan(RISK_THRESHOLDS.MEDIUM);
    expect(RISK_THRESHOLDS.MEDIUM).toBeGreaterThan(RISK_THRESHOLDS.LOW);
  });
});

describe("RISK_LABELS", () => {
  it("has all 4 labels", () => {
    expect(RISK_LABELS.CRITICAL).toBe("Critical");
    expect(RISK_LABELS.HIGH).toBe("High");
    expect(RISK_LABELS.MEDIUM).toBe("Medium");
    expect(RISK_LABELS.LOW).toBe("Low");
  });
});

describe("NAV_SECTIONS", () => {
  it("has at least 1 section", () => {
    expect(NAV_SECTIONS.length).toBeGreaterThanOrEqual(1);
  });

  it("has Changes section", () => {
    const sectionNames = NAV_SECTIONS.map((s) => s.section);
    expect(sectionNames).toContain("Changes");
  });

  it("has CHG Analytics under Changes", () => {
    const changes = NAV_SECTIONS.find((s) => s.section === "Changes");
    expect(changes?.items.some((i) => i.label === "CHG Analytics")).toBe(true);
  });

  it("has Change Requests under Changes", () => {
    const changes = NAV_SECTIONS.find((s) => s.section === "Changes");
    expect(changes?.items.some((i) => i.label === "Change Requests")).toBe(true);
  });

  it("has Reports under Changes", () => {
    const changes = NAV_SECTIONS.find((s) => s.section === "Changes");
    expect(changes?.items.some((i) => i.label === "Reports")).toBe(true);
  });
});

describe("NAV_ITEMS", () => {
  it("has the correct number of items", () => {
    expect(NAV_ITEMS.length).toBe(6);
  });

  it("starts with Overview", () => {
    expect(NAV_ITEMS[0].label).toBe("Overview");
    expect(NAV_ITEMS[0].href).toBe("/");
  });

  it("all items have href and label", () => {
    NAV_ITEMS.forEach((item) => {
      expect(item.href).toBeTruthy();
      expect(item.label).toBeTruthy();
    });
  });
});

describe("PAGINATION", () => {
  it("has sensible defaults", () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(10);
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(PAGINATION.MAX_PAGE_SIZE);
  });
});

describe("APP_CONFIG", () => {
  it("has name and description", () => {
    expect(APP_CONFIG.name).toBeTruthy();
    expect(APP_CONFIG.description).toBeTruthy();
  });

  it("has a URL", () => {
    expect(APP_CONFIG.url).toContain("localhost");
  });
});
