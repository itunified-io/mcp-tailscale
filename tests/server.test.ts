import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client factory before importing server
vi.mock("../src/client/client-factory.js", () => ({
  createClientFromEnv: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    deleteVoid: vi.fn(),
    postVoid: vi.fn(),
  })),
}));

import { createServer } from "../src/server.js";
import type { ToolHandler, ToolMiddleware, ToolResult } from "../src/types.js";

describe("createServer", () => {
  it("returns server, client, tool definitions, and handlers", () => {
    const result = createServer();

    expect(result.server).toBeDefined();
    expect(result.client).toBeDefined();
    expect(result.allToolDefinitions).toBeDefined();
    expect(result.toolHandlers).toBeDefined();
  });

  it("registers all 49 tool definitions", () => {
    const { allToolDefinitions } = createServer();
    expect(allToolDefinitions.length).toBe(49);
  });

  it("registers handlers for all 49 tools", () => {
    const { toolHandlers } = createServer();
    expect(toolHandlers.size).toBe(49);
  });

  it("all tool definitions have name and description", () => {
    const { allToolDefinitions } = createServer();
    for (const tool of allToolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
    }
  });

  it("every tool definition has a corresponding handler", () => {
    const { allToolDefinitions, toolHandlers } = createServer();
    for (const tool of allToolDefinitions) {
      expect(toolHandlers.has(tool.name)).toBe(true);
    }
  });

  it("accepts custom server name and version", () => {
    const { server } = createServer({
      name: "custom-server",
      version: "1.0.0",
    });
    expect(server).toBeDefined();
  });

  it("uses default name and version when not specified", () => {
    const { server } = createServer();
    expect(server).toBeDefined();
  });

  it("accepts middleware option", () => {
    const middleware: ToolMiddleware = async (name, args, client, next) => {
      return next(name, args, client);
    };

    const { server } = createServer({ middleware });
    expect(server).toBeDefined();
  });
});

describe("ToolMiddleware type", () => {
  it("middleware receives name, args, client, and next", async () => {
    const mockNext: ToolHandler = async (name, args, client) => ({
      content: [{ type: "text", text: `result for ${name}` }],
    });

    const middleware: ToolMiddleware = async (name, args, client, next) => {
      expect(name).toBe("test_tool");
      expect(args).toEqual({ key: "value" });
      expect(client).toBeDefined();
      expect(next).toBe(mockNext);
      return next(name, args, client);
    };

    const mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      deleteVoid: vi.fn(),
      postVoid: vi.fn(),
    };

    // Verify middleware can be called with correct signature
    await expect(
      middleware("test_tool", { key: "value" }, mockClient as any, mockNext),
    ).resolves.toEqual({
      content: [{ type: "text", text: "result for test_tool" }],
    });
  });

  it("middleware can modify result", async () => {
    const mockNext: ToolHandler = async () => ({
      content: [{ type: "text", text: "original" }],
    });

    const middleware: ToolMiddleware = async (name, args, client, next) => {
      const result = await next(name, args, client);
      return {
        content: [
          { type: "text" as const, text: `wrapped: ${result.content[0].text}` },
        ],
      };
    };

    const result = await middleware(
      "tool",
      {},
      {} as any,
      mockNext,
    );

    expect(result.content[0].text).toBe("wrapped: original");
  });

  it("middleware can short-circuit (deny access)", async () => {
    const mockNext: ToolHandler = vi.fn(async () => ({
      content: [{ type: "text", text: "should not reach" }],
    }));

    const denyMiddleware: ToolMiddleware = async (name, args, client, next) => {
      return {
        content: [{ type: "text" as const, text: "Access denied" }],
        isError: true,
      };
    };

    const result = await denyMiddleware("tool", {}, {} as any, mockNext);

    expect(result.content[0].text).toBe("Access denied");
    expect(result.isError).toBe(true);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
