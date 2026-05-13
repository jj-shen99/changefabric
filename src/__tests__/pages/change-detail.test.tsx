/**
 * Tests for /changes/[number] page - Change Request Detail
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
  usePathname: () => "/changes/CHG0000001",
}));

const mockCR = {
  number: "CHG0000001",
  title: "Payment Gateway Migration to Stripe v3",
  description: "Migrate payment processing from legacy gateway to Stripe v3 API",
  state: "awaiting_approval",
  approvalState: "pending",
  workflowKey: "standard",
  type: "standard",
  category: "infrastructure",
  priority: "1",
  riskLevel: "high",
  impactLevel: "1",
  computedRiskScore: 75,
  mlRiskScore: 72,
  mlConfidence: 0.85,
  mlExplanation: "High risk due to payment system changes",
  requestedBy: "mike@example.com",
  assignedTo: "mike@example.com",
  assignmentGroup: "Payments",
  businessService: "checkout",
  affectedServices: ["payment-service", "order-service"],
  plannedStart: new Date(Date.now() + 86400000).toISOString(),
  plannedEnd: new Date(Date.now() + 90000000).toISOString(),
  implementationPlan: "1. Deploy v3 SDK to staging.\n2. Run shadow traffic.",
  backoutPlan: "Toggle feature flag stripe.v3.enabled=false",
  testPlan: "Unit + integration tests for payment intent flow",
  riskAndImpactAnalysis: "High blast radius (payments). Mitigated by canary.",
  justification: "End-of-life of v1 SDK",
  createdAt: new Date().toISOString(),
};

const mockApprovalSteps = [
  {
    id: "step-1",
    name: "Tech Review",
    ordering: 1,
    policy: "all",
    status: "pending",
    approvers: [
      { email: "lisa@example.com", group: "Engineering" },
      { email: "raj@example.com", group: "Engineering" },
    ],
    decisions: [
      { email: "lisa@example.com", decision: "approved", comment: "LGTM" },
    ],
  },
  {
    id: "step-2",
    name: "Security Sign-off",
    ordering: 2,
    policy: "any",
    status: "pending",
    approvers: [{ email: "security@example.com", group: "Security" }],
    decisions: [],
  },
];

const mockComments = [
  {
    id: "comment-1",
    body: "Ready for review",
    author: "mike@example.com",
    createdAt: new Date().toISOString(),
  },
];

const mockTransitions = [
  { event: "submit", from: "draft", to: "submitted" },
  { event: "cancel", from: "awaiting_approval", to: "canceled" },
];

global.fetch = jest.fn((url) => {
  if (url.includes("/analyze")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ impact: { score: 75 }, ml: { score: 72 } }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        changeRequest: mockCR,
        approvalSteps: mockApprovalSteps,
        comments: mockComments,
        availableTransitions: mockTransitions,
      }),
  });
}) as jest.Mock;

// Import after mocks
import ChangeDetailPage from "@/app/(dashboard)/changes/[number]/page";

describe("Change Detail Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders CR details after loading", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    expect(screen.getByText(/awaiting.approval/i)).toBeInTheDocument();
  });

  it("displays risk scores", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("75")).toBeInTheDocument();
    });
  });

  it("shows overview tab by default", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Implementation Plan")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Backout Plan")).toBeInTheDocument();
    expect(screen.getByText("Test Plan")).toBeInTheDocument();
  });

  it("switches to approvals tab", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    const approvalsTab = screen.getByRole("button", { name: /approvals/i });
    fireEvent.click(approvalsTab);
    
    await waitFor(() => {
      expect(screen.getByText("Tech Review")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Security Sign-off")).toBeInTheDocument();
  });

  it("switches to comments tab", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    const commentsTab = screen.getByRole("button", { name: /comments/i });
    fireEvent.click(commentsTab);
    
    await waitFor(() => {
      expect(screen.getByText("Ready for review")).toBeInTheDocument();
    });
  });

  it("switches to analysis tab", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    const analysisTab = screen.getByRole("button", { name: /analysis/i });
    fireEvent.click(analysisTab);
    
    await waitFor(() => {
      expect(screen.getByText(/impact.*ml.*analysis/i)).toBeInTheDocument();
    });
  });

  it("has link to impact dashboard", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    const analysisTab = screen.getByRole("button", { name: /analysis/i });
    fireEvent.click(analysisTab);
    
    await waitFor(() => {
      const impactLink = screen.getByText(/view in impact dashboard/i);
      expect(impactLink).toBeInTheDocument();
      expect(impactLink.closest("a")).toHaveAttribute("href", "/impact?cr=CHG0000001");
    });
  });

  it("displays available transitions", async () => {
    render(<ChangeDetailPage params={{ number: "CHG0000001" }} />);
    
    await waitFor(() => {
      expect(screen.getByText("Payment Gateway Migration to Stripe v3")).toBeInTheDocument();
    });
    
    // Should show cancel transition button
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("handles 404 error", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      })
    );
    
    render(<ChangeDetailPage params={{ number: "CHG9999999" }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
