/**
 * Tests for /changes/new page - Create New Change Request
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/changes/new",
}));

const mockTemplates = [
  {
    id: "template-1",
    name: "Database Migration",
    description: "Schema changes, table alterations, or data migrations",
    category: "database",
    type: "normal",
    workflowKey: "standard",
    priority: "2",
    riskLevel: "high",
    impactLevel: "1",
    urgency: "2",
    assignmentGroup: "Data Engineering",
    implementationPlan: "1. Create migration script\n2. Test on staging",
    backoutPlan: "Execute rollback script",
    testPlan: "Unit tests for migration scripts",
    riskAndImpactAnalysis: "Database changes affect all dependent services",
    justification: "[Describe why this migration is needed]",
  },
  {
    id: "template-2",
    name: "Feature Flag Rollout",
    description: "Enable or modify feature flags for gradual rollout",
    category: "config",
    type: "standard",
    workflowKey: "standard_preapproved",
    priority: "4",
    riskLevel: "low",
    impactLevel: "3",
    urgency: "3",
    assignmentGroup: "Product",
    implementationPlan: "1. Update feature flag configuration",
    backoutPlan: "Disable feature flag immediately",
    testPlan: "Verify flag behavior in staging",
    riskAndImpactAnalysis: "Low risk due to instant rollback capability",
    justification: "[Describe the feature being rolled out]",
  },
];

const mockExistingCRs = {
  items: [
    {
      number: "CHG0000001",
      title: "Payment Gateway Migration",
      description: "Migrate to Stripe v3",
      type: "normal",
      workflowKey: "standard",
      category: "infrastructure",
      priority: "1",
      riskLevel: "high",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Payments",
      implementationPlan: "Deploy v3 SDK",
      backoutPlan: "Toggle feature flag",
      testPlan: "Unit tests",
      riskAndImpactAnalysis: "High blast radius",
      justification: "EOL of v1 SDK",
      affectedServices: ["payment-service"],
    },
  ],
};

global.fetch = jest.fn((url) => {
  if (url.includes("/templates")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTemplates),
    });
  }
  if (url.includes("/changes") && !url.includes("POST")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockExistingCRs),
    });
  }
  // POST to create new CR
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ number: "CHG0000099" }),
  });
}) as jest.Mock;

// Import after mocks
import NewChangePage from "@/app/(dashboard)/changes/new/page";

describe("New Change Request Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("New Change Request")).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("loads templates", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("Start from Template")).toBeInTheDocument();
    });
    
    // Click template dropdown
    const templateButton = screen.getByText(/select template/i);
    fireEvent.click(templateButton);
    
    await waitFor(() => {
      expect(screen.getByText("Database Migration")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Feature Flag Rollout")).toBeInTheDocument();
  });

  it("applies template when selected", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("Start from Template")).toBeInTheDocument();
    });
    
    // Click template dropdown
    const templateButton = screen.getByText(/select template/i);
    fireEvent.click(templateButton);
    
    await waitFor(() => {
      expect(screen.getByText("Database Migration")).toBeInTheDocument();
    });
    
    // Select template
    fireEvent.click(screen.getByText("Database Migration"));
    
    // Check that form fields are populated
    await waitFor(() => {
      const riskSelect = screen.getByLabelText(/risk/i) as HTMLSelectElement;
      expect(riskSelect.value).toBe("high");
    });
  });

  it("loads existing CRs for copy feature", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("Copy from Existing")).toBeInTheDocument();
    });
    
    // Click copy dropdown
    const copyButton = screen.getByText(/select cr to copy/i);
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    });
  });

  it("validates required fields", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("New Change Request")).toBeInTheDocument();
    });
    
    // Try to submit without title
    const submitButton = screen.getByRole("button", { name: /create/i });
    fireEvent.click(submitButton);
    
    // HTML5 validation should prevent submission
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput.validity.valueMissing).toBe(true);
  });

  it("submits form successfully", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("New Change Request")).toBeInTheDocument();
    });
    
    // Fill in required fields
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: "Test Change Request" } });
    
    // Submit form
    const form = titleInput.closest("form");
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v2/changes",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("has back link to changes list", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("New Change Request")).toBeInTheDocument();
    });
    
    const backLink = screen.getByText(/back/i);
    expect(backLink.closest("a")).toHaveAttribute("href", "/changes");
  });

  it("displays all form fields", async () => {
    render(<NewChangePage />);
    
    await waitFor(() => {
      expect(screen.getByText("New Change Request")).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/workflow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/risk/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/impact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/urgency/i)).toBeInTheDocument();
  });
});
