import { describe, it, expect, vi } from "vitest";
import { diagnosticsToolDefinitions, handleDiagnosticsTool } from "../../src/tools/diagnostics.js";
import type { ITailscaleClient } from "../../src/client/types.js";

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

describe("Diagnostics Tool Definitions", () => {
  it("exports 6 tool definitions", () => {
    expect(diagnosticsToolDefinitions).toHaveLength(6);
  });

  it("all tools have tailscale_ prefix", () => {
    for (const tool of diagnosticsToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of diagnosticsToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of diagnosticsToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleDiagnosticsTool
// ---------------------------------------------------------------------------

describe("handleDiagnosticsTool", () => {
  describe("tailscale_status", () => {
    it("returns a status summary with device counts", async () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago (online)
      const oldTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 10 minutes ago (offline)

      const mockDevices = {
        devices: [
          { id: "1", name: "laptop", hostname: "laptop", os: "linux", addresses: ["100.64.0.1"], lastSeen: recentTime, authorized: true },
          { id: "2", name: "server", hostname: "server", os: "linux", addresses: ["100.64.0.2"], lastSeen: oldTime, authorized: true },
          { id: "3", name: "phone", hostname: "phone", os: "android", addresses: ["100.64.0.3"], lastSeen: recentTime, authorized: false },
        ],
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockDevices) });

      const result = await handleDiagnosticsTool("tailscale_status", {}, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deviceCount).toBe(3);
      expect(parsed.onlineDevices).toBe(2);
      expect(parsed.offlineDevices).toBe(1);
      expect(parsed.tailnet).toBe(TAILNET);
      expect(parsed.devices).toHaveLength(3);
    });

    it("handles empty device list", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue({ devices: [] }) });

      const result = await handleDiagnosticsTool("tailscale_status", {}, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deviceCount).toBe(0);
      expect(parsed.onlineDevices).toBe(0);
      expect(parsed.offlineDevices).toBe(0);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Unauthorized")) });

      const result = await handleDiagnosticsTool("tailscale_status", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_status");
    });
  });

  describe("tailscale_api_verify", () => {
    it("verifies API connectivity", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue({ devices: [{ id: "1" }] }) });

      const result = await handleDiagnosticsTool("tailscale_api_verify", {}, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.connected).toBe(true);
      expect(parsed.tailnet).toBe(TAILNET);
      expect(typeof parsed.deviceCount).toBe("number");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Connection refused")) });

      const result = await handleDiagnosticsTool("tailscale_api_verify", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_api_verify");
    });
  });

  describe("tailscale_log_stream_get", () => {
    it("gets log stream config for configuration logs", async () => {
      const mockConfig = { logType: "configuration", destinationType: "panther", url: "https://log.example.com" };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockConfig) });

      const result = await handleDiagnosticsTool("tailscale_log_stream_get", {
        logType: "configuration",
      }, client);

      expect(result.content[0].text).toContain("configuration");
      expect(client.get).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/logging/configuration/stream`,
      );
    });

    it("gets log stream config for network logs", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue({}) });

      await handleDiagnosticsTool("tailscale_log_stream_get", {
        logType: "network",
      }, client);

      expect(client.get).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/logging/network/stream`,
      );
    });

    it("rejects invalid logType", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_log_stream_get", {
        logType: "invalid",
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_log_stream_get");
    });

    it("requires logType parameter", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_log_stream_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_log_stream_get");
    });

    it("returns not-configured message on 404", async () => {
      const error = new Error("404 page not found");
      const client = mockClient({ get: vi.fn().mockRejectedValue(error) });

      const result = await handleDiagnosticsTool("tailscale_log_stream_get", {
        logType: "configuration",
      }, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.configured).toBe(false);
      expect(parsed.logType).toBe("configuration");
      expect(parsed.message).toContain("No log streaming configured");
    });
  });

  describe("tailscale_log_stream_set", () => {
    it("sets log stream configuration when confirmed", async () => {
      const mockConfig = { logType: "configuration", destinationType: "panther", url: "https://log.example.com" };
      const client = mockClient({ put: vi.fn().mockResolvedValue(mockConfig) });

      const result = await handleDiagnosticsTool("tailscale_log_stream_set", {
        logType: "configuration",
        destinationType: "panther",
        url: "https://log.example.com",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("configuration");
      expect(client.put).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/logging/configuration/stream`,
        { destinationType: "panther", url: "https://log.example.com" },
      );
    });

    it("rejects log stream set without confirm: true", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_log_stream_set", {
        logType: "configuration",
        destinationType: "panther",
        url: "https://log.example.com",
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_log_stream_set");
    });

    it("rejects invalid URL", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_log_stream_set", {
        logType: "configuration",
        destinationType: "panther",
        url: "not-a-url",
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_log_stream_set");
    });
  });

  describe("tailscale_derp_map", () => {
    it("returns custom DERP map from ACL policy", async () => {
      const mockAcl = {
        acls: [],
        derpMap: {
          Regions: {
            "900": {
              regionId: 900,
              regionCode: "mydc",
              regionName: "My Data Center",
              nodes: [{ name: "900a", regionId: 900, hostName: "derp.example.com", ipv4: "1.2.3.4", ipv6: "::1" }],
            },
          },
        },
      };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockAcl) });

      const result = await handleDiagnosticsTool("tailscale_derp_map", {}, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.source).toBe("acl-policy");
      expect(parsed.derpMap).toBeDefined();
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/acl`);
    });

    it("returns not-configured message when no custom DERP map in ACL", async () => {
      const mockAcl = { acls: [], groups: {} };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockAcl) });

      const result = await handleDiagnosticsTool("tailscale_derp_map", {}, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.configured).toBe(false);
      expect(parsed.message).toContain("No custom DERP map");
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Unauthorized")) });

      const result = await handleDiagnosticsTool("tailscale_derp_map", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_derp_map");
    });
  });

  describe("tailscale_derp_map_set", () => {
    it("updates DERP map in ACL policy when confirmed", async () => {
      const currentAcl = { acls: [], groups: {} };
      const updatedAcl = { acls: [], groups: {}, derpMap: {} };
      const client = mockClient({
        get: vi.fn().mockResolvedValue(currentAcl),
        post: vi.fn().mockResolvedValue(updatedAcl),
      });

      const result = await handleDiagnosticsTool("tailscale_derp_map_set", {
        regions: {
          "900": {
            regionId: 900,
            regionCode: "mydc",
            regionName: "My Data Center",
            nodes: [{ name: "900a", regionId: 900, hostName: "derp.example.com" }],
          },
        },
        confirm: true,
      }, client);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.aclUpdated).toBe(true);
      expect(parsed.message).toContain("DERP map updated");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/acl`);
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl`,
        expect.objectContaining({ derpMap: expect.any(Object) }),
      );
    });

    it("rejects without confirm: true", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_derp_map_set", {
        regions: { "900": { regionId: 900, regionCode: "x", regionName: "X", nodes: [] } },
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_derp_map_set");
    });

    it("supports omitDefaultRegions", async () => {
      const client = mockClient({
        get: vi.fn().mockResolvedValue({ acls: [] }),
        post: vi.fn().mockResolvedValue({}),
      });

      await handleDiagnosticsTool("tailscale_derp_map_set", {
        regions: {
          "900": {
            regionId: 900,
            regionCode: "mydc",
            regionName: "My DC",
            nodes: [{ name: "900a", regionId: 900, hostName: "derp.example.com" }],
          },
        },
        omitDefaultRegions: true,
        confirm: true,
      }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl`,
        expect.objectContaining({
          derpMap: expect.objectContaining({ OmitDefaultRegions: true }),
        }),
      );
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleDiagnosticsTool("tailscale_unknown_tool", {}, client);

      expect(result.content[0].text).toContain("Unknown diagnostics tool");
    });
  });
});
