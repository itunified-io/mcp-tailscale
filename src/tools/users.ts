import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type { UserListResponse, TailscaleUser } from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const UserListSchema = z.object({
  type: z
    .enum(["member", "shared"])
    .optional()
    .describe("Filter by user type"),
  role: z
    .enum(["owner", "admin", "member", "auditor", "it-admin", "network-admin", "billing-admin"])
    .optional()
    .describe("Filter by user role"),
});

const UserGetSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const userToolDefinitions = [
  {
    name: "tailscale_user_list",
    description:
      "List all users in the tailnet. Optionally filter by type (member/shared) or role (owner/admin/member/auditor/it-admin/network-admin/billing-admin).",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["member", "shared"],
          description: "Filter by user type",
        },
        role: {
          type: "string",
          enum: ["owner", "admin", "member", "auditor", "it-admin", "network-admin", "billing-admin"],
          description: "Filter by user role",
        },
      },
    },
  },
  {
    name: "tailscale_user_get",
    description:
      "Get details for a specific user by their user ID. Returns display name, login, role, status, device count, and last seen.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string",
          description: "The user ID to look up",
        },
      },
      required: ["userId"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleUserTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_user_list": {
        const parsed = UserListSchema.parse(args);
        const params: Record<string, unknown> = {};
        if (parsed.type) params["type"] = parsed.type;
        if (parsed.role) params["role"] = parsed.role;
        const result = await client.get<UserListResponse>(
          `/tailnet/${client.tailnet}/users`,
          params,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_user_get": {
        const parsed = UserGetSchema.parse(args);
        const result = await client.get<TailscaleUser>(
          `/users/${parsed.userId}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown user tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
