import { describe, it, expect, vi } from "vitest";
import { userToolDefinitions, handleUserTool } from "../../src/tools/users.js";
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

describe("User Tool Definitions", () => {
  it("exports 2 tool definitions", () => {
    expect(userToolDefinitions).toHaveLength(2);
  });

  it("all tools have tailscale_user_ prefix", () => {
    for (const tool of userToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_user_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of userToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of userToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleUserTool
// ---------------------------------------------------------------------------

describe("handleUserTool", () => {
  describe("tailscale_user_list", () => {
    it("lists all users", async () => {
      const mockUsers = {
        users: [
          {
            id: "12345",
            displayName: "Test User",
            loginName: "testuser@example.com",
            type: "member",
            role: "admin",
            status: "active",
            deviceCount: 3,
          },
        ],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockUsers) });

      const result = await handleUserTool("tailscale_user_list", {}, client);

      expect(result.content[0].text).toContain("Test User");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/users`, {});
    });

    it("filters by type", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue({ users: [] }) });

      await handleUserTool("tailscale_user_list", { type: "member" }, client);

      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/users`, { type: "member" });
    });

    it("filters by role", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue({ users: [] }) });

      await handleUserTool("tailscale_user_list", { role: "admin" }, client);

      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/users`, { role: "admin" });
    });

    it("rejects invalid type", async () => {
      const client = mockClient();

      const result = await handleUserTool("tailscale_user_list", { type: "invalid" }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_user_list");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handleUserTool("tailscale_user_list", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_user_list");
    });
  });

  describe("tailscale_user_get", () => {
    it("gets a user by ID", async () => {
      const mockUser = {
        id: "12345",
        displayName: "Test User",
        loginName: "testuser@example.com",
        role: "admin",
        status: "active",
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockUser) });

      const result = await handleUserTool("tailscale_user_get", { userId: "12345" }, client);

      expect(result.content[0].text).toContain("Test User");
      expect(client.get).toHaveBeenCalledWith("/users/12345");
    });

    it("requires userId", async () => {
      const client = mockClient();

      const result = await handleUserTool("tailscale_user_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_user_get");
    });

    it("rejects empty userId", async () => {
      const client = mockClient();

      const result = await handleUserTool("tailscale_user_get", { userId: "" }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_user_get");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handleUserTool("tailscale_user_get", { userId: "12345" }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_user_get");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleUserTool("tailscale_user_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown user tool");
    });
  });
});
