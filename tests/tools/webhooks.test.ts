import { describe, it, expect, vi } from "vitest";
import { webhookToolDefinitions, handleWebhookTool } from "../../src/tools/webhooks.js";
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

describe("Webhook Tool Definitions", () => {
  it("exports 4 tool definitions", () => {
    expect(webhookToolDefinitions).toHaveLength(4);
  });

  it("all tools have tailscale_webhook_ prefix", () => {
    for (const tool of webhookToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_webhook_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of webhookToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of webhookToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleWebhookTool
// ---------------------------------------------------------------------------

describe("handleWebhookTool", () => {
  describe("tailscale_webhook_list", () => {
    it("lists all webhooks", async () => {
      const mockWebhooks = {
        webhooks: [
          {
            endpointId: "wh_123",
            endpointUrl: "https://hooks.example.com/tailscale",
            providerType: "slack",
            subscriptions: ["nodeCreated", "nodeDeleted"],
          },
        ],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockWebhooks) });

      const result = await handleWebhookTool("tailscale_webhook_list", {}, client);

      expect(result.content[0].text).toContain("wh_123");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/webhooks`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handleWebhookTool("tailscale_webhook_list", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_list");
    });
  });

  describe("tailscale_webhook_create", () => {
    it("creates a webhook", async () => {
      const mockWebhook = {
        endpointId: "wh_456",
        endpointUrl: "https://hooks.example.com/tailscale",
        providerType: "slack",
        subscriptions: ["nodeCreated"],
        secret: "tswhk_secret_abc123",
      };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockWebhook) });

      const result = await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "https://hooks.example.com/tailscale",
        providerType: "slack",
        subscriptions: ["nodeCreated"],
      }, client);

      expect(result.content[0].text).toContain("wh_456");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/webhooks`,
        {
          endpointUrl: "https://hooks.example.com/tailscale",
          providerType: "slack",
          subscriptions: ["nodeCreated"],
        },
      );
    });

    it("omits providerType when not specified", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({}) });

      await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "https://hooks.example.com/test",
        subscriptions: ["policyUpdate"],
      }, client);

      const callArgs = (client.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty("providerType");
    });

    it("requires endpointUrl", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_create", {
        subscriptions: ["nodeCreated"],
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_create");
    });

    it("requires at least one subscription", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "https://hooks.example.com/test",
        subscriptions: [],
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_create");
    });

    it("rejects invalid URL", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "not-a-url",
        subscriptions: ["nodeCreated"],
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_create");
    });

    it("rejects invalid event type", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "https://hooks.example.com/test",
        subscriptions: ["invalidEvent"],
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_create");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ post: vi.fn().mockRejectedValue(new Error("Bad request")) });

      const result = await handleWebhookTool("tailscale_webhook_create", {
        endpointUrl: "https://hooks.example.com/test",
        subscriptions: ["nodeCreated"],
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_create");
    });
  });

  describe("tailscale_webhook_get", () => {
    it("gets a webhook by ID", async () => {
      const mockWebhook = {
        endpointId: "wh_789",
        endpointUrl: "https://hooks.example.com/tailscale",
        providerType: "slack",
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockWebhook) });

      const result = await handleWebhookTool("tailscale_webhook_get", { webhookId: "wh_789" }, client);

      expect(result.content[0].text).toContain("wh_789");
      expect(client.get).toHaveBeenCalledWith("/webhooks/wh_789");
    });

    it("requires webhookId", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_get");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handleWebhookTool("tailscale_webhook_get", { webhookId: "wh_789" }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_get");
    });
  });

  describe("tailscale_webhook_delete", () => {
    it("deletes a webhook when confirmed", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleWebhookTool("tailscale_webhook_delete", {
        webhookId: "wh_789",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("deleted");
      expect(client.deleteVoid).toHaveBeenCalledWith("/webhooks/wh_789");
    });

    it("rejects delete without confirm: true", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_delete", {
        webhookId: "wh_789",
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_delete");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_delete", {
        webhookId: "wh_789",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_delete");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handleWebhookTool("tailscale_webhook_delete", {
        webhookId: "wh_789",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_webhook_delete");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleWebhookTool("tailscale_webhook_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown webhook tool");
    });
  });
});
