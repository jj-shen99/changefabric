/**
 * Tests for the Knowledge page
 */

import { render, screen } from "@testing-library/react";
import KnowledgePage from "@/app/(dashboard)/knowledge/page";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("Knowledge Page", () => {
  beforeEach(() => {
    render(<KnowledgePage />);
  });

  describe("Page Header", () => {
    it("renders the page title", () => {
      expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    });

    it("renders the page subtitle", () => {
      expect(
        screen.getByText("Documentation for workflows, change types, and role permissions")
      ).toBeInTheDocument();
    });
  });

  describe("Change Request Workflow Section", () => {
    it("renders the workflow section title", () => {
      expect(screen.getByText("Change Request Workflow")).toBeInTheDocument();
    });

    it("renders workflow states", () => {
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Submitted")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Scheduled")).toBeInTheDocument();
      expect(screen.getByText("Implemented")).toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("renders terminal states", () => {
      expect(screen.getByText("Rejected")).toBeInTheDocument();
      expect(screen.getByText("Canceled")).toBeInTheDocument();
      expect(screen.getByText("Rolled Back")).toBeInTheDocument();
    });
  });

  describe("Change Types & Approval Logic Section", () => {
    it("renders the section title", () => {
      expect(screen.getByText("Change Types & Approval Logic")).toBeInTheDocument();
    });

    it("renders Standard Change type", () => {
      expect(screen.getByText("Standard Change")).toBeInTheDocument();
      expect(screen.getByText("Normal workflow")).toBeInTheDocument();
      expect(screen.getByText("Full approval required")).toBeInTheDocument();
    });

    it("renders Emergency Change type", () => {
      expect(screen.getByText("Emergency Change")).toBeInTheDocument();
      expect(screen.getByText("Fast-track workflow")).toBeInTheDocument();
      expect(screen.getByText("Emergency approval (fast-track)")).toBeInTheDocument();
      expect(screen.getByText("Retrospective approval required")).toBeInTheDocument();
    });

    it("renders Pre-approved Change type", () => {
      expect(screen.getByText("Pre-approved Change")).toBeInTheDocument();
      expect(screen.getByText("Low-risk template")).toBeInTheDocument();
      expect(screen.getByText("No approval gate needed")).toBeInTheDocument();
    });

    it("renders approval tiers", () => {
      expect(screen.getByText("Risk-Based Approval Tiers")).toBeInTheDocument();
      expect(screen.getByText("Critical (80-100)")).toBeInTheDocument();
      expect(screen.getByText("High (60-79)")).toBeInTheDocument();
      expect(screen.getByText("Medium (40-59)")).toBeInTheDocument();
      expect(screen.getByText("Low (0-39)")).toBeInTheDocument();
      expect(screen.getByText("3 Approvers")).toBeInTheDocument();
      expect(screen.getByText("2 Approvers")).toBeInTheDocument();
      expect(screen.getByText("1 Approver")).toBeInTheDocument();
      expect(screen.getByText("Auto-Approve")).toBeInTheDocument();
    });
  });

  describe("Role Permissions Section", () => {
    it("renders the section title", () => {
      expect(screen.getByText("Role Permissions")).toBeInTheDocument();
    });

    it("renders all role cards", () => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
      // Manager and Approver appear multiple times (role card + approval tier/matrix header), use getAllByText
      expect(screen.getAllByText("Manager").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Approver").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Implementer").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Requester").length).toBeGreaterThanOrEqual(1);
    });

    it("renders permissions matrix", () => {
      expect(screen.getByText("Permissions Matrix")).toBeInTheDocument();
      expect(screen.getByText("Manage Users")).toBeInTheDocument();
      expect(screen.getByText("Manage Roles")).toBeInTheDocument();
      expect(screen.getByText("Manage Changes")).toBeInTheDocument();
      expect(screen.getByText("Approve Changes")).toBeInTheDocument();
      expect(screen.getByText("Implement Changes")).toBeInTheDocument();
      expect(screen.getByText("Edit Settings")).toBeInTheDocument();
      expect(screen.getByText("View All Data")).toBeInTheDocument();
      expect(screen.getByText("View Metrics")).toBeInTheDocument();
    });

    it("describes Administrator role correctly", () => {
      expect(screen.getByText("Full system access with all permissions enabled.")).toBeInTheDocument();
    });

    it("describes Requester role correctly", () => {
      expect(screen.getByText("Basic role for creating and managing own change requests.")).toBeInTheDocument();
    });

    it("shows Manager can manage users but not roles", () => {
      expect(screen.getByText("Manage users (non-admin)")).toBeInTheDocument();
      expect(screen.getByText("Cannot manage roles")).toBeInTheDocument();
    });
  });
});

describe("Knowledge Page - Workflow Flows", () => {
  beforeEach(() => {
    render(<KnowledgePage />);
  });

  it("shows Standard workflow flow", () => {
    expect(screen.getByText(/Draft → Submit → Approval → Schedule → Implement → Close/)).toBeInTheDocument();
  });

  it("shows Emergency workflow flow", () => {
    expect(screen.getByText(/Draft → Submit → Emergency Approval → Implement → Retro Approval → Close/)).toBeInTheDocument();
  });

  it("shows Pre-approved workflow flow", () => {
    expect(screen.getByText(/Draft → Schedule → Implement → Close/)).toBeInTheDocument();
  });
});
