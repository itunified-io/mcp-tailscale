import { describe, it, expect, vi } from "vitest";
import { deviceToolDefinitions, handleDeviceTool } from "../../src/tools/devices.js";
import type { ITailscaleClient } from "../../src/client/types.js";

const DEVICE_ID = "123456789";
const TAILNET = "example.com";

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

describe("Device Tool Definitions", () => {
  it("exports 11 tool definitions", () => {
    expect(deviceToolDefinitions).toHaveLength(11);
  });

  it("all tools have tailscale_device_ prefix", () => {
    for (const tool of deviceToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_device_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of deviceToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of deviceToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleDeviceTool
// ---------------------------------------------------------------------------

describe("handleDeviceTool", () => {
  describe("tailscale_device_list", () => {
    it("lists all devices in the tailnet", async () => {
      const mockDevices = {
        devices: [
          { id: DEVICE_ID, name: "my-laptop", hostname: "my-laptop", os: "linux", addresses: ["100.64.0.1"] },
        ],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockDevices) });

      const result = await handleDeviceTool("tailscale_device_list", {}, client);

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("my-laptop");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/devices`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Unauthorized")) });

      const result = await handleDeviceTool("tailscale_device_list", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_device_list");
    });
  });

  describe("tailscale_device_get", () => {
    it("gets a specific device by ID", async () => {
      const mockDevice = { id: DEVICE_ID, name: "my-laptop", hostname: "my-laptop" };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockDevice) });

      const result = await handleDeviceTool(
        "tailscale_device_get",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain(DEVICE_ID);
      expect(client.get).toHaveBeenCalledWith(`/device/${DEVICE_ID}`);
    });

    it("requires deviceId parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool("tailscale_device_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_device_get");
    });
  });

  describe("tailscale_device_delete", () => {
    it("deletes a device when confirmed", async () => {
      const client = mockClient({ deleteVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_delete",
        { deviceId: DEVICE_ID, confirm: true },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.deviceId).toBe(DEVICE_ID);
      expect(client.deleteVoid).toHaveBeenCalledWith(`/device/${DEVICE_ID}`);
    });

    it("rejects deletion without confirm: true", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_delete",
        { deviceId: DEVICE_ID, confirm: false },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_delete");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_delete",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_delete");
    });
  });

  describe("tailscale_device_authorize", () => {
    it("authorizes a device", async () => {
      const client = mockClient({ postVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_authorize",
        { deviceId: DEVICE_ID },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.authorized).toBe(true);
      expect(parsed.deviceId).toBe(DEVICE_ID);
      expect(client.postVoid).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/authorized`,
        { authorized: true },
      );
    });

    it("requires deviceId parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool("tailscale_device_authorize", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_device_authorize");
    });
  });

  describe("tailscale_device_routes_get", () => {
    it("gets routes for a device", async () => {
      const mockRoutes = {
        advertisedRoutes: ["10.0.0.0/8"],
        enabledRoutes: ["10.0.0.0/8"],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockRoutes) });

      const result = await handleDeviceTool(
        "tailscale_device_routes_get",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain("10.0.0.0/8");
      expect(client.get).toHaveBeenCalledWith(`/device/${DEVICE_ID}/routes`);
    });
  });

  describe("tailscale_device_routes_set", () => {
    it("sets routes for a device", async () => {
      const mockRoutes = {
        advertisedRoutes: ["10.0.0.0/8"],
        enabledRoutes: ["10.0.0.0/8"],
      };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockRoutes) });

      const result = await handleDeviceTool(
        "tailscale_device_routes_set",
        { deviceId: DEVICE_ID, routes: ["10.0.0.0/8"] },
        client,
      );

      expect(result.content[0].text).toContain("10.0.0.0/8");
      expect(client.post).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/routes`,
        { routes: ["10.0.0.0/8"] },
      );
    });

    it("requires at least one route", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_routes_set",
        { deviceId: DEVICE_ID, routes: [] },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_routes_set");
    });
  });

  describe("tailscale_device_tags_set", () => {
    it("sets tags on a device", async () => {
      const client = mockClient({ postVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_tags_set",
        { deviceId: DEVICE_ID, tags: ["tag:server", "tag:prod"] },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tags).toEqual(["tag:server", "tag:prod"]);
      expect(client.postVoid).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/tags`,
        { tags: ["tag:server", "tag:prod"] },
      );
    });

    it("allows clearing tags with empty array", async () => {
      const client = mockClient({ postVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_tags_set",
        { deviceId: DEVICE_ID, tags: [] },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tags).toEqual([]);
    });
  });

  describe("tailscale_device_posture_get", () => {
    it("gets posture attributes for a device", async () => {
      const mockPosture = { attributes: { "custom:status": "compliant" } };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockPosture) });

      const result = await handleDeviceTool(
        "tailscale_device_posture_get",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain("compliant");
      expect(client.get).toHaveBeenCalledWith(`/device/${DEVICE_ID}/attributes`);
    });
  });

  describe("tailscale_device_posture_set", () => {
    it("sets a posture attribute on a device", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({}) });

      await handleDeviceTool("tailscale_device_posture_set", {
        deviceId: DEVICE_ID,
        attributeKey: "custom:compliance-status",
        value: "compliant",
      }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/attributes/custom:compliance-status`,
        { value: "compliant" },
      );
    });

    it("supports boolean values", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({}) });

      await handleDeviceTool("tailscale_device_posture_set", {
        deviceId: DEVICE_ID,
        attributeKey: "custom:is-encrypted",
        value: true,
      }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/attributes/custom:is-encrypted`,
        { value: true },
      );
    });

    it("requires attributeKey parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool("tailscale_device_posture_set", {
        deviceId: DEVICE_ID,
        value: "test",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_device_posture_set");
    });
  });

  describe("tailscale_device_expire", () => {
    it("expires a device key when confirmed", async () => {
      const client = mockClient({ postVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_expire",
        { deviceId: DEVICE_ID, confirm: true },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.expired).toBe(true);
      expect(parsed.deviceId).toBe(DEVICE_ID);
      expect(client.postVoid).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/key`,
        { keyExpiryDisabled: false },
      );
    });

    it("rejects expire without confirm: true", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_expire",
        { deviceId: DEVICE_ID, confirm: false },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_expire");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_expire",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_expire");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ postVoid: vi.fn().mockRejectedValue(new Error("Not found")) });

      const result = await handleDeviceTool(
        "tailscale_device_expire",
        { deviceId: DEVICE_ID, confirm: true },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_expire");
    });
  });

  describe("tailscale_device_rename", () => {
    it("renames a device", async () => {
      const client = mockClient({ postVoid: vi.fn().mockResolvedValue(undefined) });

      const result = await handleDeviceTool(
        "tailscale_device_rename",
        { deviceId: DEVICE_ID, name: "my-new-name" },
        client,
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.renamed).toBe(true);
      expect(parsed.deviceId).toBe(DEVICE_ID);
      expect(parsed.name).toBe("my-new-name");
      expect(client.postVoid).toHaveBeenCalledWith(
        `/device/${DEVICE_ID}/name`,
        { name: "my-new-name" },
      );
    });

    it("requires non-empty name", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_rename",
        { deviceId: DEVICE_ID, name: "" },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_rename");
    });

    it("rejects name exceeding 255 characters", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_rename",
        { deviceId: DEVICE_ID, name: "a".repeat(256) },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_rename");
    });

    it("requires name parameter", async () => {
      const client = mockClient();

      const result = await handleDeviceTool(
        "tailscale_device_rename",
        { deviceId: DEVICE_ID },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_rename");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ postVoid: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handleDeviceTool(
        "tailscale_device_rename",
        { deviceId: DEVICE_ID, name: "new-name" },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_device_rename");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleDeviceTool("tailscale_device_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown device tool");
    });
  });
});
