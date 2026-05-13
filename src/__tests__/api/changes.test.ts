/**
 * Tests for /api/v2/changes API routes
 * @jest-environment node
 */
import { NextRequest } from "next/server";

// Mock Prisma
const mockPrisma = {
  changeRequest: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  approvalStep: {
    findMany: jest.fn(),
  },
  comment: {
    findMany: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock session
const mockSession = {
  user: {
    email: "admin@example.com",
    name: "Admin User",
  },
};

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock workflow
jest.mock("@/core/workflow/definitions", () => ({
  STANDARD_WORKFLOW: {
    key: "standard",
    states: {
      draft: { name: "Draft" },
      submitted: { name: "Submitted" },
    },
    transitions: [],
  },
  PREAPPROVED_WORKFLOW: { key: "standard_preapproved", states: {}, transitions: [] },
  EMERGENCY_WORKFLOW: { key: "emergency", states: {}, transitions: [] },
  getWorkflowByKey: jest.fn(() => ({
    key: "standard",
    states: { draft: { name: "Draft" } },
    transitions: [],
  })),
}));

describe("Changes API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v2/changes", () => {
    it("returns list of change requests", async () => {
      const mockCRs = [
        {
          number: "CHG0000001",
          title: "Test CR",
          state: "draft",
          type: "standard",
          createdAt: new Date(),
        },
      ];

      mockPrisma.changeRequest.findMany.mockResolvedValue(mockCRs);
      mockPrisma.changeRequest.count.mockResolvedValue(1);

      // Import after mocks
      const { GET } = await import("@/app/api/v2/changes/route");

      const request = new NextRequest("http://localhost:3600/api/v2/changes");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].number).toBe("CHG0000001");
    });

    it("supports pagination", async () => {
      mockPrisma.changeRequest.findMany.mockResolvedValue([]);
      mockPrisma.changeRequest.count.mockResolvedValue(100);

      const { GET } = await import("@/app/api/v2/changes/route");

      const request = new NextRequest(
        "http://localhost:3600/api/v2/changes?limit=10&offset=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("filters by state", async () => {
      mockPrisma.changeRequest.findMany.mockResolvedValue([]);
      mockPrisma.changeRequest.count.mockResolvedValue(0);

      const { GET } = await import("@/app/api/v2/changes/route");

      const request = new NextRequest(
        "http://localhost:3600/api/v2/changes?state=draft"
      );
      await GET(request);

      expect(mockPrisma.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: "draft",
          }),
        })
      );
    });
  });

  describe("POST /api/v2/changes", () => {
    it("creates a new change request", async () => {
      const newCR = {
        number: "CHG0000099",
        title: "New Test CR",
        state: "draft",
        type: "standard",
        category: "infrastructure",
        priority: "3",
        riskLevel: "moderate",
        impactLevel: "2",
        urgency: "3",
        workflowKey: "standard",
        createdAt: new Date(),
      };

      mockPrisma.changeRequest.count.mockResolvedValue(98);
      mockPrisma.changeRequest.create.mockResolvedValue(newCR);

      const { POST } = await import("@/app/api/v2/changes/route");

      const request = new NextRequest("http://localhost:3600/api/v2/changes", {
        method: "POST",
        body: JSON.stringify({
          title: "New Test CR",
          type: "standard",
          category: "infrastructure",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.number).toBe("CHG0000099");
    });

    it("validates required fields", async () => {
      const { POST } = await import("@/app/api/v2/changes/route");

      const request = new NextRequest("http://localhost:3600/api/v2/changes", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});

describe("Change Detail API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v2/changes/[number]", () => {
    it("returns change request details", async () => {
      const mockCR = {
        number: "CHG0000001",
        title: "Test CR",
        state: "draft",
        workflowKey: "standard",
        createdAt: new Date(),
      };

      mockPrisma.changeRequest.findUnique.mockResolvedValue(mockCR);
      mockPrisma.approvalStep.findMany.mockResolvedValue([]);
      mockPrisma.comment.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/v2/changes/[number]/route");

      const request = new NextRequest(
        "http://localhost:3600/api/v2/changes/CHG0000001"
      );
      const response = await GET(request, { params: { number: "CHG0000001" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.changeRequest.number).toBe("CHG0000001");
    });

    it("returns 404 for non-existent CR", async () => {
      mockPrisma.changeRequest.findUnique.mockResolvedValue(null);

      const { GET } = await import("@/app/api/v2/changes/[number]/route");

      const request = new NextRequest(
        "http://localhost:3600/api/v2/changes/CHG9999999"
      );
      const response = await GET(request, { params: { number: "CHG9999999" } });

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/v2/changes/[number]", () => {
    it("updates change request", async () => {
      const mockCR = {
        number: "CHG0000001",
        title: "Test CR",
        state: "draft",
        workflowKey: "standard",
      };

      mockPrisma.changeRequest.findUnique.mockResolvedValue(mockCR);
      mockPrisma.changeRequest.update.mockResolvedValue({
        ...mockCR,
        title: "Updated Title",
      });

      const { PATCH } = await import("@/app/api/v2/changes/[number]/route");

      const request = new NextRequest(
        "http://localhost:3600/api/v2/changes/CHG0000001",
        {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated Title" }),
        }
      );
      const response = await PATCH(request, { params: { number: "CHG0000001" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Title");
    });
  });
});
