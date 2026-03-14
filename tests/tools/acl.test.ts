import { describe, it, expect, vi } from "vitest";
import { aclToolDefinitions, handleAclTool } from "../../src/tools/acl.js";
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

const SAMPLE_POLICY = {
  acls: [
    { action: "accept", src: ["*"], dst: ["*:*"] },
  ],
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

describe("ACL Tool Definitions", () => {
  it("exports 5 tool definitions", () => {
    expect(aclToolDefinitions).toHaveLength(5);
  });

  it("all tools have tailscale_acl_ prefix", () => {
    for (const tool of aclToolDefinitions) {
      expect(tool.name).toMatch(/^tailscale_acl_/);
    }
  });

  it("all tools have non-empty descriptions", () => {
    for (const tool of aclToolDefinitions) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have inputSchema with type object", () => {
    for (const tool of aclToolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// handleAclTool
// ---------------------------------------------------------------------------

describe("handleAclTool", () => {
  describe("tailscale_acl_get", () => {
    it("gets the current ACL policy", async () => {
      const client = mockClient({ get: vi.fn().mockResolvedValue(SAMPLE_POLICY) });

      const result = await handleAclTool("tailscale_acl_get", {}, client);

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("accept");
      expect(client.get).toHaveBeenCalledWith(`/tailnet/${TAILNET}/acl`);
    });

    it("handles API errors gracefully", async () => {
      const client = mockClient({ get: vi.fn().mockRejectedValue(new Error("Forbidden")) });

      const result = await handleAclTool("tailscale_acl_get", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_get");
    });
  });

  describe("tailscale_acl_set", () => {
    it("sets the ACL policy when confirmed", async () => {
      const client = mockClient({ post: vi.fn().mockResolvedValue(SAMPLE_POLICY) });

      const result = await handleAclTool("tailscale_acl_set", {
        policy: SAMPLE_POLICY,
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("accept");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl`,
        SAMPLE_POLICY,
      );
    });

    it("rejects ACL set without confirm: true", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_set", {
        policy: SAMPLE_POLICY,
        confirm: false,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_set");
    });

    it("requires confirm parameter", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_set", {
        policy: SAMPLE_POLICY,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_set");
    });

    it("requires policy parameter", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_set", {
        confirm: true,
      }, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_set");
    });
  });

  describe("tailscale_acl_preview", () => {
    it("previews ACL policy", async () => {
      const mockPreview = { matches: [{ user: "user@example.com", src: "100.64.0.1", dst: "100.64.0.2:80", allowed: true }] };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockPreview) });

      const result = await handleAclTool("tailscale_acl_preview", {
        policy: SAMPLE_POLICY,
      }, client);

      expect(result.content[0].text).toContain("allowed");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl/preview`,
        expect.objectContaining({ acls: SAMPLE_POLICY.acls }),
      );
    });

    it("requires policy parameter", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_preview", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_preview");
    });
  });

  describe("tailscale_acl_validate", () => {
    it("validates ACL policy", async () => {
      const mockValidation = { message: "" };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockValidation) });

      const result = await handleAclTool("tailscale_acl_validate", {
        policy: SAMPLE_POLICY,
      }, client);

      expect(result.content[0].type).toBe("text");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl/validate`,
        SAMPLE_POLICY,
      );
    });

    it("requires policy parameter", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_validate", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_validate");
    });
  });

  describe("tailscale_acl_test", () => {
    it("runs ACL tests", async () => {
      const mockTestResult = {
        results: [{ user: "user@example.com", errors: [], passed: true }],
      };
      const policyWithTests = {
        ...SAMPLE_POLICY,
        tests: [{ src: "user@example.com", accept: ["100.64.0.2:80"] }],
      };
      const client = mockClient({ post: vi.fn().mockResolvedValue(mockTestResult) });

      const result = await handleAclTool("tailscale_acl_test", {
        policy: policyWithTests,
      }, client);

      expect(result.content[0].text).toContain("passed");
      expect(client.post).toHaveBeenCalledWith(
        `/tailnet/${TAILNET}/acl/test`,
        policyWithTests,
      );
    });

    it("requires policy parameter", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_test", {}, client);

      expect(result.content[0].text).toContain("Error executing tailscale_acl_test");
    });
  });

  describe("unknown tool", () => {
    it("returns unknown tool message", async () => {
      const client = mockClient();

      const result = await handleAclTool("tailscale_acl_unknown", {}, client);

      expect(result.content[0].text).toContain("Unknown ACL tool");
    });
  });
});
