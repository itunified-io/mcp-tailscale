/**
 * Server factory for mcp-tailscale.
 * Creates an MCP server with all Tailscale tools registered.
 * Supports optional middleware for enterprise extensions (audit, RBAC, etc.).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ITailscaleClient } from "./client/types.js";
import { createClientFromEnv } from "./client/client-factory.js";
import type { ToolHandler, ToolMiddleware } from "./types.js";

import { deviceToolDefinitions, handleDeviceTool } from "./tools/devices.js";
import { dnsToolDefinitions, handleDnsTool } from "./tools/dns.js";
import { aclToolDefinitions, handleAclTool } from "./tools/acl.js";
import { keyToolDefinitions, handleKeyTool } from "./tools/keys.js";
import {
  tailnetToolDefinitions,
  handleTailnetTool,
} from "./tools/tailnet.js";
import {
  diagnosticsToolDefinitions,
  handleDiagnosticsTool,
} from "./tools/diagnostics.js";
import { userToolDefinitions, handleUserTool } from "./tools/users.js";
import {
  webhookToolDefinitions,
  handleWebhookTool,
} from "./tools/webhooks.js";
import {
  postureToolDefinitions,
  handlePostureTool,
} from "./tools/posture.js";

/**
 * Options for creating an MCP Tailscale server.
 */
export interface CreateServerOptions {
  /** Optional middleware to intercept all tool calls (for audit, RBAC, etc.) */
  middleware?: ToolMiddleware;
  /** Server name (default: "mcp-tailscale") */
  name?: string;
  /** Server version (default: "2026.3.16") */
  version?: string;
}

/**
 * Result from createServer().
 */
export interface CreateServerResult {
  /** The MCP server instance, ready to connect a transport */
  server: Server;
  /** The Tailscale API client */
  client: ITailscaleClient;
  /** All 48 tool definitions */
  allToolDefinitions: Tool[];
  /** Map of tool name → handler function */
  toolHandlers: Map<string, ToolHandler>;
}

/**
 * Create an MCP server with all Tailscale tools registered.
 *
 * @example
 * // Basic usage (identical to running `npx tailscale-mcp`)
 * const { server } = createServer();
 *
 * @example
 * // With enterprise middleware
 * const { server } = createServer({
 *   middleware: async (name, args, client, next) => {
 *     console.log(`Tool called: ${name}`);
 *     return next(name, args, client);
 *   },
 * });
 */
export function createServer(
  options?: CreateServerOptions,
): CreateServerResult {
  const {
    middleware,
    name = "mcp-tailscale",
    version = "2026.3.16",
  } = options ?? {};

  // Assemble all tool definitions
  const allToolDefinitions: Tool[] = [
    ...deviceToolDefinitions,
    ...dnsToolDefinitions,
    ...aclToolDefinitions,
    ...keyToolDefinitions,
    ...tailnetToolDefinitions,
    ...diagnosticsToolDefinitions,
    ...userToolDefinitions,
    ...webhookToolDefinitions,
    ...postureToolDefinitions,
  ] as unknown as Tool[];

  // Build tool handler map
  const toolHandlers = new Map<string, ToolHandler>();

  for (const def of deviceToolDefinitions)
    toolHandlers.set(def.name, handleDeviceTool);
  for (const def of dnsToolDefinitions)
    toolHandlers.set(def.name, handleDnsTool);
  for (const def of aclToolDefinitions)
    toolHandlers.set(def.name, handleAclTool);
  for (const def of keyToolDefinitions)
    toolHandlers.set(def.name, handleKeyTool);
  for (const def of tailnetToolDefinitions)
    toolHandlers.set(def.name, handleTailnetTool);
  for (const def of diagnosticsToolDefinitions)
    toolHandlers.set(def.name, handleDiagnosticsTool);
  for (const def of userToolDefinitions)
    toolHandlers.set(def.name, handleUserTool);
  for (const def of webhookToolDefinitions)
    toolHandlers.set(def.name, handleWebhookTool);
  for (const def of postureToolDefinitions)
    toolHandlers.set(def.name, handlePostureTool);

  // Create Tailscale API client
  const client = createClientFromEnv();

  // Create MCP server
  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } },
  );

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allToolDefinitions,
  }));

  // Register CallTools handler (with optional middleware)
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;
    const handler = toolHandlers.get(toolName);

    if (!handler) {
      return {
        content: [
          { type: "text" as const, text: `Unknown tool: ${toolName}` },
        ],
        isError: true,
      };
    }

    const typedArgs = (args ?? {}) as Record<string, unknown>;

    if (middleware) {
      return middleware(toolName, typedArgs, client, handler);
    }

    return handler(toolName, typedArgs, client);
  });

  return { server, client, allToolDefinitions, toolHandlers };
}
