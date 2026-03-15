/**
 * Shared types for MCP tool handling and middleware.
 * Used by the core server and enterprise extensions.
 */

import type { ITailscaleClient } from "./client/types.js";

/**
 * Result returned by a tool handler.
 */
export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/**
 * Handler function for a single MCP tool.
 * Receives the tool name, validated arguments, and Tailscale client.
 */
export type ToolHandler = (
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
) => Promise<ToolResult>;

/**
 * Middleware that intercepts tool calls before/after execution.
 * Call `next(name, args, client)` to continue to the actual handler.
 * Enterprise uses this for audit logging, RBAC, policy enforcement, etc.
 */
export type ToolMiddleware = (
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
  next: ToolHandler,
) => Promise<ToolResult>;
