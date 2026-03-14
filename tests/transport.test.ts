import { describe, it, expect } from "vitest";
import { createAuthMiddleware, validateTransportConfig } from "../src/transport.js";

// ---------------------------------------------------------------------------
// validateTransportConfig
// ---------------------------------------------------------------------------

describe("validateTransportConfig", () => {
  it("returns stdio config by default", () => {
    const config = validateTransportConfig({});
    expect(config.mode).toBe("stdio");
  });

  it("returns stdio config when explicitly set", () => {
    const config = validateTransportConfig({ TAILSCALE_MCP_TRANSPORT: "stdio" });
    expect(config.mode).toBe("stdio");
  });

  it("returns SSE config with valid settings", () => {
    const config = validateTransportConfig({
      TAILSCALE_MCP_TRANSPORT: "sse",
      TAILSCALE_MCP_AUTH_TOKEN: "test-token-123",
      TAILSCALE_MCP_PORT: "4000",
      TAILSCALE_MCP_HOST: "0.0.0.0",
    });
    expect(config.mode).toBe("sse");
    if (config.mode === "sse") {
      expect(config.authToken).toBe("test-token-123");
      expect(config.port).toBe(4000);
      expect(config.host).toBe("0.0.0.0");
    }
  });

  it("uses default port and host for SSE", () => {
    const config = validateTransportConfig({
      TAILSCALE_MCP_TRANSPORT: "sse",
      TAILSCALE_MCP_AUTH_TOKEN: "test-token-123",
    });
    if (config.mode === "sse") {
      expect(config.port).toBe(3000);
      expect(config.host).toBe("localhost");
    }
  });

  it("throws when SSE mode has no auth token", () => {
    expect(() => validateTransportConfig({
      TAILSCALE_MCP_TRANSPORT: "sse",
    })).toThrow("TAILSCALE_MCP_AUTH_TOKEN is required");
  });

  it("throws for unknown transport mode", () => {
    expect(() => validateTransportConfig({
      TAILSCALE_MCP_TRANSPORT: "websocket",
    })).toThrow("Unknown transport");
  });
});

// ---------------------------------------------------------------------------
// createAuthMiddleware
// ---------------------------------------------------------------------------

describe("createAuthMiddleware", () => {
  function mockReqRes(authHeader?: string) {
    const req = { headers: { authorization: authHeader } } as any;
    const res = {
      status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
    } as any;
    let calledNext = false;
    const next = () => { calledNext = true; };
    return { req, res, next, wasNextCalled: () => calledNext };
  }

  it("calls next() for valid Bearer token", () => {
    const middleware = createAuthMiddleware("secret-token");
    const { req, res, next, wasNextCalled } = mockReqRes("Bearer secret-token");

    middleware(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });

  it("rejects missing Authorization header", () => {
    const middleware = createAuthMiddleware("secret-token");
    const { req, res, next, wasNextCalled } = mockReqRes(undefined);
    let statusCode: number | undefined;
    res.status = (code: number) => {
      statusCode = code;
      return { json: () => {} };
    };

    middleware(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(statusCode).toBe(401);
  });

  it("rejects wrong token", () => {
    const middleware = createAuthMiddleware("secret-token");
    const { req, res, next, wasNextCalled } = mockReqRes("Bearer wrong-token");
    let statusCode: number | undefined;
    res.status = (code: number) => {
      statusCode = code;
      return { json: () => {} };
    };

    middleware(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(statusCode).toBe(401);
  });

  it("rejects non-Bearer auth", () => {
    const middleware = createAuthMiddleware("secret-token");
    const { req, res, next, wasNextCalled } = mockReqRes("Basic dXNlcjpwYXNz");
    let statusCode: number | undefined;
    res.status = (code: number) => {
      statusCode = code;
      return { json: () => {} };
    };

    middleware(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(statusCode).toBe(401);
  });
});
