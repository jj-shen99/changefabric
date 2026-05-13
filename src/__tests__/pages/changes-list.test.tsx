/**
 * Tests for /changes page - Change Request List
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/changes",
}));

// Mock fetch
const mockChangeRequests = [
  {
    number: "CHG0000001",
    title: "Payment Gateway Migration",
    state: "awaiting_approval",
    type: "standard",
    category: "infrastructure",
    priority: "1",
    riskLevel: "high",
    computedRiskScore: 75,
    mlRiskScore: 72,
    requestedBy: "mike@example.com",
    assignedTo: "mike@example.com",
    createdAt: new Date().toISOString(),
    affectedServices: ["payment-service"],
  },
  {
    number: "CHG0000002",
    title: "Redis Caching",
    state: "scheduled",
    type: "standard",
    category: "feature",
    priority: "3",
    riskLevel: "low",
    computedRiskScore: 25,
    mlRiskScore: 20,
    requestedBy: "raj@example.com",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    affectedServices: ["user-service"],
  },
];

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ items: mockChangeRequests }),
  })
) as jest.Mock;

// Import after mocks
import ChangesPage from "@/app/(dashboard)/changes/page";

describe("Changes List Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<ChangesPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders change requests after loading", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Payment Gateway Migration")).toBeInTheDocument();
    expect(screen.getByText("CHG0000002")).toBeInTheDocument();
    expect(screen.getByText("Redis Caching")).toBeInTheDocument();
  });

  it("displays correct state badges", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("awaiting approval")).toBeInTheDocument();
    });
    
    expect(screen.getByText("scheduled")).toBeInTheDocument();
  });

  it("displays risk scores", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("75")).toBeInTheDocument();
    });
    
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("filters by search term", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Payment" } });
    
    expect(screen.getByText("Payment Gateway Migration")).toBeInTheDocument();
    expect(screen.queryByText("Redis Caching")).not.toBeInTheDocument();
  });

  it("filters by state", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    });
    
    const stateSelect = screen.getByRole("combobox");
    fireEvent.change(stateSelect, { target: { value: "scheduled" } });
    
    expect(screen.queryByText("CHG0000001")).not.toBeInTheDocument();
    expect(screen.getByText("CHG0000002")).toBeInTheDocument();
  });

  it("shows correct counts in stats", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // Total
    });
  });

  it("has link to create new change request", async () => {
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText("CHG0000001")).toBeInTheDocument();
    });
    
    const newButton = screen.getByText(/new change request/i);
    expect(newButton).toBeInTheDocument();
    expect(newButton.closest("a")).toHaveAttribute("href", "/changes/new");
  });

  it("handles API error gracefully", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );
    
    render(<ChangesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
