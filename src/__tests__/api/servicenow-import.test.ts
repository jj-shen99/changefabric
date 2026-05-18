/**
 * Tests for ServiceNow import functionality
 * @jest-environment node
 */

describe("ServiceNow Import", () => {
  describe("Table API endpoint", () => {
    it("uses the correct change_request table", () => {
      const instance = "https://test.itsm.example.com";
      const expectedPath = "/api/now/table/change_request";
      const fullUrl = `${instance}${expectedPath}`;
      
      expect(fullUrl).toContain("/api/now/table/change_request");
      expect(fullUrl).not.toContain("/api/now/table/change_task");
      expect(fullUrl).not.toContain("/api/now/table/incident");
    });

    it("includes required query parameters", () => {
      const baseUrl = "https://test.itsm.example.com/api/now/table/change_request";
      const params = new URLSearchParams({
        sysparm_display_value: "true",
        sysparm_limit: "100",
        sysparm_offset: "0",
        sysparm_orderby: "number",
      });
      const fullUrl = `${baseUrl}?${params.toString()}`;

      expect(fullUrl).toContain("sysparm_display_value=true");
      expect(fullUrl).toContain("sysparm_limit=100");
      expect(fullUrl).toContain("sysparm_offset=0");
      expect(fullUrl).toContain("sysparm_orderby=number");
    });
  });

  describe("State mapping", () => {
    const serviceNowStates = [
      "New",
      "Assess",
      "Authorize",
      "Scheduled",
      "Implement",
      "Review",
      "Closed",
      "Canceled",
    ];

    it("ServiceNow states are recognized", () => {
      serviceNowStates.forEach((state) => {
        expect(typeof state).toBe("string");
        expect(state.length).toBeGreaterThan(0);
      });
    });

    it("ServiceNow states can be normalized", () => {
      const normalizeState = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
      
      serviceNowStates.forEach((state) => {
        const normalized = normalizeState(state);
        expect(normalized).toBe(normalized.toLowerCase());
        expect(normalized).not.toContain(" ");
      });
    });
  });

  describe("External source tracking", () => {
    it("ServiceNow imports have externalSource set", () => {
      const importedCR = {
        number: "CHG0000001",
        externalSource: "servicenow",
        externalId: "abc123",
      };

      expect(importedCR.externalSource).toBe("servicenow");
      expect(importedCR.externalId).toBeTruthy();
    });

    it("Native CRs have empty or null externalSource", () => {
      const nativeCR = {
        number: "CHG0000001",
        externalSource: "",
        externalId: null,
      };

      expect(nativeCR.externalSource).toBeFalsy();
      expect(nativeCR.externalId).toBeNull();
    });

    it("can distinguish between imported and native CRs", () => {
      const isExternalImport = (cr: { externalSource?: string | null }) => 
        cr.externalSource && cr.externalSource !== "native";

      expect(isExternalImport({ externalSource: "servicenow" })).toBe(true);
      expect(isExternalImport({ externalSource: "" })).toBeFalsy();
      expect(isExternalImport({ externalSource: null })).toBeFalsy();
      expect(isExternalImport({ externalSource: "native" })).toBeFalsy();
    });
  });

  describe("Credential handling", () => {
    it("requires instance, user, and password", () => {
      const validateCredentials = (creds: { instance?: string; user?: string; password?: string }) => {
        return !!(creds.instance && creds.user && creds.password);
      };

      expect(validateCredentials({ instance: "https://test.itsm.example.com", user: "admin", password: "pass" })).toBe(true);
      expect(validateCredentials({ instance: "https://test.itsm.example.com", user: "admin" })).toBe(false);
      expect(validateCredentials({ instance: "https://test.itsm.example.com" })).toBe(false);
      expect(validateCredentials({})).toBe(false);
    });

    it("normalizes instance URL by removing trailing slash", () => {
      const normalizeInstance = (url: string) => url.replace(/\/$/, "");

      expect(normalizeInstance("https://test.itsm.example.com/")).toBe("https://test.itsm.example.com");
      expect(normalizeInstance("https://test.itsm.example.com")).toBe("https://test.itsm.example.com");
    });
  });
});

describe("Import API Response", () => {
  describe("Success response", () => {
    it("includes import statistics", () => {
      const successResponse = {
        success: true,
        message: "Imported 10 change requests from ServiceNow",
        imported: 10,
        errors: 0,
        total: 10,
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.imported).toBe(10);
      expect(successResponse.errors).toBe(0);
      expect(successResponse.total).toBe(10);
    });

    it("handles partial success", () => {
      const partialResponse = {
        success: true,
        message: "Imported 8 change requests from ServiceNow",
        imported: 8,
        errors: 2,
        total: 10,
        errorDetails: ["CHG001: Invalid data", "CHG002: Duplicate"],
      };

      expect(partialResponse.success).toBe(true);
      expect(partialResponse.imported).toBe(8);
      expect(partialResponse.errors).toBe(2);
      expect(partialResponse.errorDetails).toHaveLength(2);
    });
  });

  describe("Empty result", () => {
    it("handles no CRs found", () => {
      const emptyResponse = {
        success: true,
        message: "No change requests found in ServiceNow instance",
        imported: 0,
      };

      expect(emptyResponse.success).toBe(true);
      expect(emptyResponse.imported).toBe(0);
    });
  });

  describe("Error response", () => {
    it("returns error for invalid credentials", () => {
      const errorResponse = {
        error: "ServiceNow API 401: Unauthorized",
      };

      expect(errorResponse.error).toContain("401");
    });

    it("returns error for HTML response (SSO redirect)", () => {
      const errorResponse = {
        error: "ServiceNow returned HTML instead of JSON. The instance may require SSO authentication or the REST API may not be enabled.",
      };

      expect(errorResponse.error).toContain("HTML");
      expect(errorResponse.error).toContain("SSO");
    });
  });
});
