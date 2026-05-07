/**
 * Tests for /api/v2/templates API routes
 * @jest-environment node
 */
import { NextRequest } from "next/server";

// Mock Prisma
const mockPrisma = {
  changeRequestTemplate: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock session for POST (admin only)
const mockAdminSession = {
  user: {
    email: "admin@example.com",
    name: "Admin User",
  },
};

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockAdminSession)),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock user lookup for role check
jest.mock("@/app/api/v2/_helpers", () => ({
  requireSession: jest.fn(() =>
    Promise.resolve({
      email: "admin@example.com",
      role: "admin",
    })
  ),
  badRequest: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  forbidden: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 403 })),
  serverError: jest.fn((err) => new Response(JSON.stringify({ error: String(err) }), { status: 500 })),
}));

describe("Templates API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v2/templates", () => {
    it("returns list of active templates", async () => {
      const mockTemplates = [
        {
          id: "template-1",
          name: "Database Migration",
          description: "Schema changes",
          category: "database",
          type: "normal",
          workflowKey: "standard",
          isActive: true,
        },
        {
          id: "template-2",
          name: "Feature Flag",
          description: "Feature rollout",
          category: "config",
          type: "standard",
          workflowKey: "standard_preapproved",
          isActive: true,
        },
      ];

      mockPrisma.changeRequestTemplate.findMany.mockResolvedValue(mockTemplates);

      const { GET } = await import("@/app/api/v2/templates/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Database Migration");
    });

    it("only returns active templates", async () => {
      mockPrisma.changeRequestTemplate.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/v2/templates/route");

      await GET();

      expect(mockPrisma.changeRequestTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it("orders templates by category and name", async () => {
      mockPrisma.changeRequestTemplate.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/v2/templates/route");

      await GET();

      expect(mockPrisma.changeRequestTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ category: "asc" }, { name: "asc" }],
        })
      );
    });
  });

  describe("POST /api/v2/templates", () => {
    it("creates a new template", async () => {
      const newTemplate = {
        id: "template-new",
        name: "New Template",
        description: "Test template",
        category: "other",
        type: "normal",
        workflowKey: "standard",
        isActive: true,
        createdBy: "admin@example.com",
      };

      mockPrisma.changeRequestTemplate.create.mockResolvedValue(newTemplate);

      const { POST } = await import("@/app/api/v2/templates/route");

      const request = new NextRequest("http://localhost:3600/api/v2/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "New Template",
          description: "Test template",
          category: "other",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Template");
    });

    it("validates required name field", async () => {
      const { POST } = await import("@/app/api/v2/templates/route");

      const request = new NextRequest("http://localhost:3600/api/v2/templates", {
        method: "POST",
        body: JSON.stringify({
          description: "Missing name",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("sets default values for optional fields", async () => {
      mockPrisma.changeRequestTemplate.create.mockResolvedValue({
        id: "template-new",
        name: "Minimal Template",
        category: "other",
        type: "normal",
        workflowKey: "standard",
        priority: "3",
        riskLevel: "moderate",
      });

      const { POST } = await import("@/app/api/v2/templates/route");

      const request = new NextRequest("http://localhost:3600/api/v2/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Minimal Template",
        }),
      });

      await POST(request);

      expect(mockPrisma.changeRequestTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: "other",
            type: "normal",
            workflowKey: "standard",
            priority: "3",
            riskLevel: "moderate",
          }),
        })
      );
    });
  });
});
