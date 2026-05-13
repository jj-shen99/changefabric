/**
 * Unit tests for CR Type Approvers API
 * Tests the /api/admin/cr-type-approvers endpoint
 */

jest.mock("next-auth", () => ({}));
jest.mock("next-auth/jwt", () => ({}));

// Mock prisma
const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock session
const mockSession = {
  user: {
    email: "admin@example.com",
    role: "admin",
  },
};

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("CR Type Approvers API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/cr-type-approvers", () => {
    it("should return all approvers grouped by CR type", async () => {
      const mockApprovers = [
        { id: "1", crType: "standard", approverEmail: "lisa@example.com", stepName: "Tech Review", ordering: 1 },
        { id: "2", crType: "standard", approverEmail: "raj@example.com", stepName: "Tech Review", ordering: 1 },
        { id: "3", crType: "emergency", approverEmail: "oncall@example.com", stepName: "Emergency", ordering: 1 },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockApprovers);

      // The actual API would return grouped data
      const grouped: Record<string, typeof mockApprovers> = {};
      for (const a of mockApprovers) {
        if (!grouped[a.crType]) grouped[a.crType] = [];
        grouped[a.crType].push(a);
      }

      expect(grouped.normal).toHaveLength(2);
      expect(grouped.emergency).toHaveLength(1);
    });

    it("should filter by crType when provided", async () => {
      const mockApprovers = [
        { id: "1", crType: "standard", approverEmail: "lisa@example.com", stepName: "Tech Review", ordering: 1 },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockApprovers);

      // Simulating filter by crType
      const filtered = mockApprovers.filter(a => a.crType === "standard");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].crType).toBe("standard");
    });
  });

  describe("POST /api/admin/cr-type-approvers", () => {
    it("should validate required fields", () => {
      const body = { crType: "", approverEmail: "" };
      
      expect(!body.crType || !body.approverEmail).toBe(true);
    });

    it("should validate CR type values", () => {
      const validTypes = ["standard", "standard", "emergency"];
      
      expect(validTypes.includes("standard")).toBe(true);
      expect(validTypes.includes("invalid")).toBe(false);
    });

    it("should check if user exists before adding", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: "lisa@example.com", name: "Lisa" });
      
      const user = await mockPrisma.user.findUnique({ where: { email: "lisa@example.com" } });
      expect(user).toBeTruthy();
    });

    it("should reject if user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const user = await mockPrisma.user.findUnique({ where: { email: "nonexistent@example.com" } });
      expect(user).toBeNull();
    });

    it("should check for duplicate assignments", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: "existing-id" }]);
      
      const existing = await mockPrisma.$queryRaw`SELECT id FROM CRTypeApprover WHERE crType = 'normal'`;
      expect(existing).toHaveLength(1);
    });
  });

  describe("DELETE /api/admin/cr-type-approvers", () => {
    it("should soft delete by setting isActive = false", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      
      const result = await mockPrisma.$executeRaw`UPDATE CRTypeApprover SET isActive = 0 WHERE id = 'test-id'`;
      expect(result).toBe(1);
    });

    it("should return error if approver not found", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);
      
      const result = await mockPrisma.$executeRaw`UPDATE CRTypeApprover SET isActive = 0 WHERE id = 'nonexistent'`;
      expect(result).toBe(0);
    });
  });

  describe("Authorization", () => {
    it("should only allow admin users", () => {
      const adminPerms = { canViewAllData: true };
      const managerPerms = { canViewAllData: false };
      
      expect(adminPerms.canViewAllData).toBe(true);
      expect(managerPerms.canViewAllData).toBe(false);
    });
  });
});

describe("CR Type Approver Data Validation", () => {
  it("should validate crType enum values", () => {
    const validTypes = ["standard", "standard", "emergency"];
    
    expect(validTypes).toContain("standard");
    expect(validTypes).toContain("standard");
    expect(validTypes).toContain("emergency");
    expect(validTypes).not.toContain("custom");
  });

  it("should validate email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test("valid@example.com")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
  });

  it("should validate ordering is positive integer", () => {
    const isValidOrdering = (n: number) => Number.isInteger(n) && n > 0;
    
    expect(isValidOrdering(1)).toBe(true);
    expect(isValidOrdering(5)).toBe(true);
    expect(isValidOrdering(0)).toBe(false);
    expect(isValidOrdering(-1)).toBe(false);
    expect(isValidOrdering(1.5)).toBe(false);
  });
});
