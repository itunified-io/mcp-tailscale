import { describe, it, expect, vi } from "vitest";
import { postureToolDefinitions, handlePostureTool } from "../../src/tools/posture.js";
import type { ITailscaleClient } from "../../src/client/types.js";

const TAILNET = "example.com";

function mockClient(overrides: Partial<ITailscaleClient> = {}): ITailscaleClient {
  return {
    tailnet: TAILNET,
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteVoid: vi.fn().mockResolvedValue(undefined),
    postVoid: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ITailscaleClient;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

describe("Posture Tool Definitions", () => {
  it("exports 4 tool definitions", () => {
    expect(postureToolDefinitions).toHaveLength(4);
  });

  it("all tools have tailscale_posture_integration_ prefix", () => {
    for (const tool of postureToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_posture_integration_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of postureToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of postureToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handlePostureTool
// ---------------------------------------------------------------------------

describe("handlePostureTool", () => {
  describe("tailscale_posture_integration_list", () => {
    it("lists all posture integrations", async () => {
      const mockIntegrations = {
        integrations: [
          {
            id: "pi_123",
            provider: "crowdstrike",
            clientId: "cs-client-id",
            created: "2026-01-01T00:00:00Z",
            lastModified: "2026-01-01T00:00:00Z",
          },
        ],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockIntegrations) });

      const result = await handlePostureTool("tailscale_posture_integration_list", {}, client);

      expect(result.content[0].text).toContain("pi_123");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/posture/integrations`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handlePostureTool("tailscale_posture_integration_list", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_list");
    });
  });

  describe("tailscale_posture_integration_get", () => {
    it("gets a posture integration by ID", async () => {
      const mockIntegration = {
        id: "pi_456",
        provider: "intune",
        tenantId: "tenant-123",
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockIntegration) });

      const result = await handlePostureTool(
        "tailscale_posture_integration_get",
        { integrationId: "pi_456" },
        client,
      );

      expect(result.content[0].text).toContain("pi_456");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/posture/integrations/pi_456`);
    });

    it("requires integrationId", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_get");
    });

    it("rejects empty integrationId", async () => {
      const client = mockClient();

      const result = await handlePostureTool(
        "tailscale_posture_integration_get",
        { integrationId: "" },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_get");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handlePostureTool(
        "tailscale_posture_integration_get",
        { integrationId: "pi_456" },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_get");
    });
  });

  describe("tailscale_posture_integration_create", () => {
    it("creates a posture integration", async () => {
      const mockResult = {
        id: "pi_789",
        provider: "crowdstrike",
        clientId: "cs-client-id",
      };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockResult) });

      const result = await handlePostureTool("tailscale_posture_integration_create", {
        provider: "crowdstrike",
        clientId: "cs-client-id",
        clientSecret: "cs-secret",
      }, client);

      expect(result.content[0].text).toContain("pi_789");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/posture/integrations`,
        {
          provider: "crowdstrike",
          clientId: "cs-client-id",
          clientSecret: "cs-secret",
        },
      );
    });

    it("rejects invalid provider", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_create", {
        provider: "invalidProvider",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_create");
    });

    it("requires provider", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_create", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_create");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ post: vi.fn().mockRejectedValue(new Error("Bad request")) });

      const result = await handlePostureTool("tailscale_posture_integration_create", {
        provider: "intune",
        tenantId: "tenant-123",
        clientId: "client-id",
        clientSecret: "client-secret",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_create");
    });
  });

  describe("tailscale_posture_integration_delete", () => {
    it("deletes a posture integration when confirmed", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handlePostureTool("tailscale_posture_integration_delete", {
        integrationId: "pi_789",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("deleted");
      expect(client.deleteVoid).toHaveBeenCalledWith(`/tailnet/${TAILNET}/posture/integrations/pi_789`);
    });

    it("rejects delete without confirm: true", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_delete", {
        integrationId: "pi_789",
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_delete");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_delete", {
        integrationId: "pi_789",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_delete");
    });

    it("requires integrationId", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_delete", {
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_delete");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handlePostureTool("tailscale_posture_integration_delete", {
        integrationId: "pi_789",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_posture_integration_delete");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handlePostureTool("tailscale_posture_integration_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown posture tool");
    });
  });
});
