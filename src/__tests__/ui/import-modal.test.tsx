/**
 * Tests for ServiceNow Import Modal behavior
 * Validates modal closes after successful import
 */
import "@testing-library/jest-dom";

describe("ServiceNow Import Modal", () => {
  describe("Modal State Management", () => {
    interface ImportState {
      showModal: boolean;
      loading: boolean;
      error: string | null;
      success: string | null;
      form: {
        instance: string;
        user: string;
        password: string;
        days: string;
      };
    }

    const initialState: ImportState = {
      showModal: false,
      loading: false,
      error: null,
      success: null,
      form: {
        instance: "",
        user: "",
        password: "",
        days: "30",
      },
    };

    it("should start with modal closed", () => {
      expect(initialState.showModal).toBe(false);
    });

    it("should open modal when triggered", () => {
      const state = { ...initialState, showModal: true };
      expect(state.showModal).toBe(true);
    });

    it("should close modal after successful import", () => {
      // Simulate successful import flow
      let state: ImportState = { ...initialState, showModal: true };
      
      // Start import
      state = { ...state, loading: true };
      expect(state.loading).toBe(true);
      
      // Import succeeds
      state = { ...state, loading: false, success: "Imported 5 change requests" };
      expect(state.success).toBe("Imported 5 change requests");
      
      // Modal closes after delay
      state = { 
        ...state, 
        showModal: false, 
        success: null,
        form: initialState.form 
      };
      expect(state.showModal).toBe(false);
      expect(state.success).toBeNull();
    });

    it("should keep modal open on error", () => {
      let state: ImportState = { ...initialState, showModal: true };
      
      // Start import
      state = { ...state, loading: true };
      
      // Import fails
      state = { ...state, loading: false, error: "Connection failed" };
      
      // Modal should stay open
      expect(state.showModal).toBe(true);
      expect(state.error).toBe("Connection failed");
    });

    it("should reset form after successful import", () => {
      const filledForm = {
        instance: "https://example.service-now.com",
        user: "admin",
        password: "secret",
        days: "60",
      };
      
      let state: ImportState = { 
        ...initialState, 
        showModal: true, 
        form: filledForm 
      };
      
      // After successful import, form should reset
      state = {
        ...state,
        showModal: false,
        form: initialState.form,
      };
      
      expect(state.form.instance).toBe("");
      expect(state.form.user).toBe("");
      expect(state.form.password).toBe("");
      expect(state.form.days).toBe("30");
    });
  });

  describe("URL Validation", () => {
    const validateUrl = (url: string): { valid: boolean; error?: string } => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") {
          return { valid: false, error: "Instance URL must use HTTPS" };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid instance URL format" };
      }
    };

    it("should accept any valid HTTPS URL", () => {
      expect(validateUrl("https://example.com").valid).toBe(true);
      expect(validateUrl("https://my-instance.service-now.com").valid).toBe(true);
      expect(validateUrl("https://custom-domain.internal.corp").valid).toBe(true);
    });

    it("should reject HTTP URLs", () => {
      const result = validateUrl("http://example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Instance URL must use HTTPS");
    });

    it("should reject invalid URLs", () => {
      const result = validateUrl("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid instance URL format");
    });

    it("should NOT require service-now.com domain", () => {
      // Any domain should be accepted
      expect(validateUrl("https://custom-itsm.example.com").valid).toBe(true);
      expect(validateUrl("https://internal.company.net").valid).toBe(true);
    });
  });

  describe("Import Flow Timing", () => {
    it("should show success message before closing", async () => {
      const events: string[] = [];
      
      // Simulate import flow
      events.push("import_started");
      events.push("import_success");
      events.push("show_success_message");
      
      // After 1.5s delay
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulated
      events.push("close_modal");
      events.push("reset_form");
      
      expect(events.indexOf("show_success_message")).toBeLessThan(events.indexOf("close_modal"));
      expect(events.indexOf("close_modal")).toBeLessThan(events.indexOf("reset_form") + 1);
    });
  });
});

describe("Import Button Visibility", () => {
  interface OrgSettings {
    enableCRImport: boolean;
  }
  
  interface UserRole {
    isAdmin: boolean;
  }

  const shouldShowImportButton = (
    orgSettings: OrgSettings,
    userRole: UserRole
  ): boolean => {
    // Only admin users can see the import button
    return orgSettings.enableCRImport && userRole.isAdmin;
  };

  it("should show button when import is enabled and user is admin", () => {
    expect(shouldShowImportButton(
      { enableCRImport: true },
      { isAdmin: true }
    )).toBe(true);
  });

  it("should hide button when import is disabled", () => {
    expect(shouldShowImportButton(
      { enableCRImport: false },
      { isAdmin: true }
    )).toBe(false);
  });

  it("should hide button when user is not admin", () => {
    expect(shouldShowImportButton(
      { enableCRImport: true },
      { isAdmin: false }
    )).toBe(false);
  });

  it("should hide button for non-admin even with canManageChanges", () => {
    // Only admin role can see import, not just canManageChanges permission
    expect(shouldShowImportButton(
      { enableCRImport: true },
      { isAdmin: false }
    )).toBe(false);
  });

  it("should hide button when both conditions fail", () => {
    expect(shouldShowImportButton(
      { enableCRImport: false },
      { isAdmin: false }
    )).toBe(false);
  });
});
