import { describe, it, expect, vi } from "vitest";
import { keyToolDefinitions, handleKeyTool } from "../../src/tools/keys.js";
import type { ITailscaleClient } from "../../src/client/types.js";

const TAILNET = "example.com";
const KEY_ID = "k12345abcdef";

function mockClient(overrides: Partial<ITailscaleClient> = {}): TailscaleClient {
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

describe("Key Tool Definitions", () => {
  it("exports 4 tool definitions", () => {
    expect(keyToolDefinitions).toHaveLength(4);
  });

  it("all tools have tailscale_key_ prefix", () => {
    for (const tool of keyToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_key_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of keyToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of keyToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleKeyTool
// ---------------------------------------------------------------------------

describe("handleKeyTool", () => {
  describe("tailscale_key_list", () => {
    it("lists all auth keys", async () => {
      const mockKeys = {
        keys: [{ id: KEY_ID, description: "my-key", created: "2026-01-01T00:00:00Z" }],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockKeys) });

      const result = await handleKeyTool("tailscale_key_list", {}, client);

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("my-key");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/keys`);
    });
  });

  describe("tailscale_key_get", () => {
    it("gets a specific auth key", async () => {
      const mockKey = { id: KEY_ID, description: "my-key" };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockKey) });

      const result = await handleKeyTool(
        "tailscale_key_get",
        { keyId: KEY_ID },
        client,
      );

      expect(result.content[0].text).toContain(KEY_ID);
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/keys/${KEY_ID}`);
    });

    it("requires keyId parameter", async () => {
      const client = mockClient();

      const result = await handleKeyTool("tailscale_key_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_key_get");
    });
  });

  describe("tailscale_key_create", () => {
    it("creates an auth key with default settings", async () => {
      const mockKey = { id: KEY_ID, key: "tskey-auth-xxx", description: "" };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockKey) });

      const result = await handleKeyTool("tailscale_key_create", {}, client);

      expect(result.content[0].text).toContain(KEY_ID);
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/keys`,
        {
          capabilities: {
            devices: {
              create: {
                reusable: false,
                ephemeral: false,
                preauthorized: false,
                tags: [],
              },
            },
          },
        },
      );
    });

    it("creates a reusable ephemeral key with tags", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({ id: KEY_ID }) });

      await handleKeyTool("tailscale_key_create", {
        reusable: true,
        ephemeral: true,
        preauthorized: true,
        tags: ["tag:server"],
        description: "server-key",
      }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/keys`,
        expect.objectContaining({
          capabilities: {
            devices: {
              create: {
                reusable: true,
                ephemeral: true,
                preauthorized: true,
                tags: ["tag:server"],
              },
            },
          },
          description: "server-key",
        }),
      );
    });

    it("includes expirySeconds when provided", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({ id: KEY_ID }) });

      await handleKeyTool("tailscale_key_create", {
        expirySeconds: 3600,
      }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/keys`,
        expect.objectContaining({ expirySeconds: 3600 }),
      );
    });

    it("rejects invalid expirySeconds (negative)", async () => {
      const client = mockClient();

      const result = await handleKeyTool("tailscale_key_create", {
        expirySeconds: -100,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_key_create");
    });
  });

  describe("tailscale_key_delete", () => {
    it("deletes an auth key when confirmed", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleKeyTool("tailscale_key_delete", {
        keyId: KEY_ID,
        confirm: true,
      }, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.keyId).toBe(KEY_ID);
      expect(client.deleteVoid).toHaveBeenCalledWith(`/tailnet/${TAILNET}/keys/${KEY_ID}`);
    });

    it("rejects deletion without confirm: true", async () => {
      const client = mockClient();

      const result = await handleKeyTool("tailscale_key_delete", {
        keyId: KEY_ID,
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_key_delete");
    });

    it("requires keyId parameter", async () => {
      const client = mockClient();

      const result = await handleKeyTool("tailscale_key_delete", {
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_key_delete");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleKeyTool("tailscale_key_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown key tool");
    });
  });

  describe("API error handling", () => {
    it("returns error message when API call fails", async () => {
      const client = mockClient({
        get: vi.fn().mockRejectedValue(new Error("Unauthorized")),
      });

      const result = await handleKeyTool("tailscale_key_list", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_key_list");
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });
});
