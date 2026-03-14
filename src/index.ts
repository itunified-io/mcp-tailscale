import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ITailscaleClient } from "./client/types.js";
import { createClientFromEnv } from "./client/client-factory.js";
import { deviceToolDefinitions, handleDeviceTool } from "./tools/devices.js";
import { dnsToolDefinitions, handleDnsTool } from "./tools/dns.js";
import { aclToolDefinitions, handleAclTool } from "./tools/acl.js";
import { keyToolDefinitions, handleKeyTool } from "./tools/keys.js";
import { tailnetToolDefinitions, handleTailnetTool } from "./tools/tailnet.js";
import { diagnosticsToolDefinitions, handleDiagnosticsTool } from "./tools/diagnostics.js";
import { userToolDefinitions, handleUserTool } from "./tools/users.js";
import { webhookToolDefinitions, handleWebhookTool } from "./tools/webhooks.js";

const allToolDefinitions: Tool[] = ([
  ...deviceToolDefinitions,
  ...dnsToolDefinitions,
  ...aclToolDefinitions,
  ...keyToolDefinitions,
  ...tailnetToolDefinitions,
  ...diagnosticsToolDefinitions,
  ...userToolDefinitions,
  ...webhookToolDefinitions,
] as unknown) as Tool[];

const toolHandlers = new Map<
  string,
  (name: string, args: Record<string, unknown>, client: ITailscaleClient) => Promise<{ content: Array<{ type: "text"; text: string }> }>
>();

for (const def of deviceToolDefinitions) toolHandlers.set(def.name, handleDeviceTool);
for (const def of dnsToolDefinitions) toolHandlers.set(def.name, handleDnsTool);
for (const def of aclToolDefinitions) toolHandlers.set(def.name, handleAclTool);
for (const def of keyToolDefinitions) toolHandlers.set(def.name, handleKeyTool);
for (const def of tailnetToolDefinitions) toolHandlers.set(def.name, handleTailnetTool);
for (const def of diagnosticsToolDefinitions) toolHandlers.set(def.name, handleDiagnosticsTool);
for (const def of userToolDefinitions) toolHandlers.set(def.name, handleUserTool);
for (const def of webhookToolDefinitions) toolHandlers.set(def.name, handleWebhookTool);

const server = new Server(
  { name: "mcp-tailscale", version: "2026.3.14" },
  { capabilities: { tools: {} } },
);

const client = createClientFromEnv();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allToolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolHandlers.get(name);

  if (!handler) {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  return handler(name, (args ?? {}) as Record<string, unknown>, client);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
