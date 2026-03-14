import { describe, it, expect, vi } from "vitest";
import { tailnetToolDefinitions, handleTailnetTool } from "../../src/tools/tailnet.js";
import type { TailscaleClient } from "../../src/client/tailscale-client.js";

const TAILNET = "example.com";

function mockClient(overrides: Partial<TailscaleClient> = {}): TailscaleClient {
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
  } as unknown as TailscaleClient;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

describe("Tailnet Tool Definitions", () => {
  it("exports 4 tool definitions", () => {
    expect(tailnetToolDefinitions).toHaveLength(4);
  });

  it("all tools have tailscale_tailnet_ prefix", () => {
    for (const tool of tailnetToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_tailnet_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of tailnetToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of tailnetToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleTailnetTool
// ---------------------------------------------------------------------------

describe("handleTailnetTool", () => {
  describe("tailscale_tailnet_settings_get", () => {
    it("gets tailnet settings", async () => {
      const mockSettings = {
        devicesApprovalOn: false,
        devicesAutoUpdatesOn: true,
        devicesKeyDurationDays: 180,
        usersApprovalOn: false,
        networkFlowLoggingOn: false,
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockSettings) });

      const result = await handleTailnetTool("tailscale_tailnet_settings_get", {}, client);

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("devicesAutoUpdatesOn");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/settings`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handleTailnetTool("tailscale_tailnet_settings_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_tailnet_settings_get");
    });
  });

  describe("tailscale_tailnet_contacts_get", () => {
    it("gets tailnet contacts", async () => {
      const mockContacts = {
        account: { email: "admin@example.com" },
        support: { email: "support@example.com" },
        security: { email: "security@example.com" },
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockContacts) });

      const result = await handleTailnetTool("tailscale_tailnet_contacts_get", {}, client);

      expect(result.content[0].text).toContain("admin@example.com");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/contacts`);
    });
  });

  describe("tailscale_tailnet_contacts_set", () => {
    it("updates tailnet contacts when confirmed", async () => {
      const mockContacts = {
        account: { email: "newadmin@example.com" },
        support: { email: "support@example.com" },
        security: { email: "security@example.com" },
      };
      const client = mockClient({ patch: vi.fn().mockResolvedValue(mockContacts) });

      const result = await handleTailnetTool("tailscale_tailnet_contacts_set", {
        account: { email: "newadmin@example.com" },
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("newadmin@example.com");
      expect(client.patch).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/contacts`,
        { account: { email: "newadmin@example.com" } },
      );
    });

    it("rejects contacts update without confirm: true", async () => {
      const client = mockClient();

      const result = await handleTailnetTool("tailscale_tailnet_contacts_set", {
        account: { email: "newadmin@example.com" },
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_tailnet_contacts_set");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handleTailnetTool("tailscale_tailnet_contacts_set", {
        account: { email: "newadmin@example.com" },
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_tailnet_contacts_set");
    });

    it("rejects invalid email address", async () => {
      const client = mockClient();

      const result = await handleTailnetTool("tailscale_tailnet_contacts_set", {
        account: { email: "not-an-email" },
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_tailnet_contacts_set");
    });

    it("allows updating only security contact", async () => {
      const client = mockClient({ patch: vi.fn().mockResolvedValue({}) });

      await handleTailnetTool("tailscale_tailnet_contacts_set", {
        security: { email: "sec@example.com" },
        confirm: true,
      }, client);

      expect(client.patch).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/contacts`,
        { security: { email: "sec@example.com" } },
      );
    });
  });

  describe("tailscale_tailnet_lock_status", () => {
    it("gets tailnet lock status", async () => {
      const mockLockStatus = {
        enabled: false,
        nodeKey: "nodekey:abc123",
        publicKey: "nlpub:xyz789",
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockLockStatus) });

      const result = await handleTailnetTool("tailscale_tailnet_lock_status", {}, client);

      expect(result.content[0].text).toContain("enabled");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/lock/status`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handleTailnetTool("tailscale_tailnet_lock_status", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_tailnet_lock_status");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleTailnetTool("tailscale_tailnet_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown tailnet tool");
    });
  });
});
