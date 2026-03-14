import { describe, it, expect, vi } from "vitest";
import { dnsToolDefinitions, handleDnsTool } from "../../src/tools/dns.js";
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

describe("DNS Tool Definitions", () => {
  it("exports 8 tool definitions", () => {
    expect(dnsToolDefinitions).toHaveLength(8);
  });

  it("all tools have tailscale_dns_ prefix", () => {
    for (const tool of dnsToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_dns_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of dnsToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of dnsToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleDnsTool
// ---------------------------------------------------------------------------

describe("handleDnsTool", () => {
  describe("tailscale_dns_nameservers_get", () => {
    it("gets DNS nameservers", async () => {
      const mockNS = { dns: ["1.1.1.1", "8.8.8.8"], magicDNS: true };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockNS) });

      const result = await handleDnsTool("tailscale_dns_nameservers_get", {}, client);

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("1.1.1.1");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/dns/nameservers`);
    });
  });

  describe("tailscale_dns_nameservers_set", () => {
    it("sets DNS nameservers", async () => {
      const mockNS = { dns: ["1.1.1.1"], magicDNS: false };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockNS) });

      const result = await handleDnsTool(
        "tailscale_dns_nameservers_set",
        { dns: ["1.1.1.1"] },
        client,
      );

      expect(result.content[0].text).toContain("1.1.1.1");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/nameservers`,
        { dns: ["1.1.1.1"] },
      );
    });

    it("requires at least one nameserver", async () => {
      const client = mockClient();

      const result = await handleDnsTool(
        "tailscale_dns_nameservers_set",
        { dns: [] },
        client,
      );

      expect(result.content[0].text).toContain("Error executing tailscale_dns_nameservers_set");
    });

    it("requires dns parameter", async () => {
      const client = mockClient();

      const result = await handleDnsTool("tailscale_dns_nameservers_set", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_dns_nameservers_set");
    });
  });

  describe("tailscale_dns_searchpaths_get", () => {
    it("gets DNS search paths", async () => {
      const mockPaths = { searchPaths: ["example.com", "internal.example.com"] };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockPaths) });

      const result = await handleDnsTool("tailscale_dns_searchpaths_get", {}, client);

      expect(result.content[0].text).toContain("example.com");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/dns/searchpaths`);
    });
  });

  describe("tailscale_dns_searchpaths_set", () => {
    it("sets DNS search paths", async () => {
      const mockPaths = { searchPaths: ["example.com"] };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockPaths) });

      const result = await handleDnsTool(
        "tailscale_dns_searchpaths_set",
        { searchPaths: ["example.com"] },
        client,
      );

      expect(result.content[0].text).toContain("example.com");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/searchpaths`,
        { searchPaths: ["example.com"] },
      );
    });

    it("allows empty search paths", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({ searchPaths: [] }) });

      await handleDnsTool("tailscale_dns_searchpaths_set", { searchPaths: [] }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/searchpaths`,
        { searchPaths: [] },
      );
    });
  });

  describe("tailscale_dns_splitdns_get", () => {
    it("gets split DNS configuration", async () => {
      const mockSplitDns = { "internal.example.com": ["10.0.0.53"] };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockSplitDns) });

      const result = await handleDnsTool("tailscale_dns_splitdns_get", {}, client);

      expect(result.content[0].text).toContain("internal.example.com");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/dns/split-dns`);
    });
  });

  describe("tailscale_dns_splitdns_set", () => {
    it("patches split DNS configuration", async () => {
      const mockResult = { "internal.example.com": ["10.0.0.53"] };
      const client = mockClient({ patch: vi.fn().mockResolvedValue(mockResult) });

      const result = await handleDnsTool("tailscale_dns_splitdns_set", {
        splitDns: { "internal.example.com": ["10.0.0.53"] },
      }, client);

      expect(result.content[0].text).toContain("internal.example.com");
      expect(client.patch).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/split-dns`,
        { "internal.example.com": ["10.0.0.53"] },
      );
    });

    it("requires splitDns parameter", async () => {
      const client = mockClient();

      const result = await handleDnsTool("tailscale_dns_splitdns_set", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_dns_splitdns_set");
    });
  });

  describe("tailscale_dns_preferences_get", () => {
    it("gets DNS preferences", async () => {
      const mockPrefs = { magicDNS: true };
      const client = mockClient({ get: vi.fn().mockResolvedValue(mockPrefs) });

      const result = await handleDnsTool("tailscale_dns_preferences_get", {}, client);

      expect(result.content[0].text).toContain("magicDNS");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/dns/preferences`);
    });
  });

  describe("tailscale_dns_preferences_set", () => {
    it("sets MagicDNS to true", async () => {
      const mockPrefs = { magicDNS: true };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockPrefs) });

      const result = await handleDnsTool(
        "tailscale_dns_preferences_set",
        { magicDNS: true },
        client,
      );

      expect(result.content[0].text).toContain("true");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/preferences`,
        { magicDNS: true },
      );
    });

    it("sets MagicDNS to false", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue({ magicDNS: false }) });

      await handleDnsTool("tailscale_dns_preferences_set", { magicDNS: false }, client);

      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/dns/preferences`,
        { magicDNS: false },
      );
    });

    it("requires magicDNS parameter", async () => {
      const client = mockClient();

      const result = await handleDnsTool("tailscale_dns_preferences_set", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_dns_preferences_set");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleDnsTool("tailscale_dns_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown DNS tool");
    });
  });

  describe("API error handling", () => {
    it("returns error message when API call fails", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Network error")) });

      const result = await handleDnsTool("tailscale_dns_nameservers_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_dns_nameservers_get");
      expect(result.content[0].text).toContain("Network error");
    });
  });
});
