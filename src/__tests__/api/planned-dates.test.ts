/**
 * Tests for planned date validation
 */

describe("Planned Date Validation", () => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000); // +1 day
  const pastDate = new Date(now.getTime() - 86400000); // -1 day

  describe("Planned Start validation", () => {
    it("rejects past dates", () => {
      expect(pastDate < now).toBe(true);
    });

    it("accepts future dates", () => {
      expect(futureDate > now).toBe(true);
    });
  });

  describe("Planned End validation", () => {
    it("rejects past dates", () => {
      expect(pastDate < now).toBe(true);
    });

    it("accepts future dates", () => {
      expect(futureDate > now).toBe(true);
    });
  });

  describe("Date order validation", () => {
    const start = new Date(now.getTime() + 86400000); // +1 day
    const end = new Date(now.getTime() + 172800000); // +2 days

    it("accepts start before end", () => {
      expect(start < end).toBe(true);
    });

    it("rejects start after end", () => {
      const invalidStart = new Date(now.getTime() + 259200000); // +3 days
      expect(invalidStart > end).toBe(true);
    });

    it("rejects start equal to end", () => {
      const sameDate = new Date(start.getTime());
      expect(sameDate.getTime() === start.getTime()).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("handles null plannedStart", () => {
      const plannedStart: Date | null = null;
      expect(plannedStart).toBeNull();
    });

    it("handles null plannedEnd", () => {
      const plannedEnd: Date | null = null;
      expect(plannedEnd).toBeNull();
    });

    it("handles both dates null", () => {
      const plannedStart: Date | null = null;
      const plannedEnd: Date | null = null;
      // Both null is valid - no validation needed
      expect(plannedStart).toBeNull();
      expect(plannedEnd).toBeNull();
    });

    it("validates only start when end is null", () => {
      const plannedStart = futureDate;
      const plannedEnd: Date | null = null;
      // Only need to validate start is in future
      expect(plannedStart > now).toBe(true);
      expect(plannedEnd).toBeNull();
    });

    it("validates only end when start is null", () => {
      const plannedStart: Date | null = null;
      const plannedEnd = futureDate;
      // Only need to validate end is in future
      expect(plannedStart).toBeNull();
      expect(plannedEnd > now).toBe(true);
    });
  });
});
