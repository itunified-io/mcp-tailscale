import { z } from "zod";
import type { TailscaleClient } from "../client/tailscale-client.js";
import { KeyIdSchema, ExpirySecondsSchema } from "../utils/validation.js";
import type { AuthKey, AuthKeyListResponse } from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const KeyListSchema = z.object({});

const KeyGetSchema = z.object({
  keyId: KeyIdSchema,
});

const KeyCreateSchema = z.object({
  reusable: z.boolean().default(false),
  ephemeral: z.boolean().default(false),
  preauthorized: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  expirySeconds: ExpirySecondsSchema.optional(),
  description: z.string().optional(),
});

const KeyDeleteSchema = z.object({
  keyId: KeyIdSchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to delete an auth key" }),
  }),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const keyToolDefinitions = [
  {
    name: "tailscale_key_list",
    description:
      "List all auth keys for the tailnet. Returns key metadata (but not the secret key values).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_key_get",
    description: "Get details of a specific auth key by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyId: {
          type: "string",
          description: "Auth key ID",
        },
      },
      required: ["keyId"],
    },
  },
  {
    name: "tailscale_key_create",
    description:
      "Create a new auth key for the tailnet. Returns the key value — store it securely as it cannot be retrieved again.",
    inputSchema: {
      type: "object" as const,
      properties: {
        reusable: {
          type: "boolean",
          description: "Whether the key can be used multiple times (default: false)",
        },
        ephemeral: {
          type: "boolean",
          description: "Whether devices using this key are removed when they disconnect (default: false)",
        },
        preauthorized: {
          type: "boolean",
          description: "Whether devices using this key are automatically authorized (default: false)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "ACL tags to apply to devices that use this key (e.g., ['tag:server'])",
        },
        expirySeconds: {
          type: "number",
          description: "Key expiry in seconds from now (optional, omit for default expiry)",
        },
        description: {
          type: "string",
          description: "Human-readable description for the key",
        },
      },
    },
  },
  {
    name: "tailscale_key_delete",
    description:
      "Delete (revoke) an auth key. Devices already authenticated with this key will not be affected. Requires confirm: true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyId: {
          type: "string",
          description: "Auth key ID to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm auth key deletion",
        },
      },
      required: ["keyId", "confirm"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleKeyTool(
  name: string,
  args: Record<string, unknown>,
  client: TailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_key_list": {
        KeyListSchema.parse(args);
        const result = await client.get<AuthKeyListResponse>(
          `/tailnet/${client.tailnet}/keys`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_key_get": {
        const parsed = KeyGetSchema.parse(args);
        const result = await client.get<AuthKey>(
          `/tailnet/${client.tailnet}/keys/${parsed.keyId}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_key_create": {
        const parsed = KeyCreateSchema.parse(args);
        const body: Record<string, unknown> = {
          capabilities: {
            devices: {
              create: {
                reusable: parsed.reusable,
                ephemeral: parsed.ephemeral,
                preauthorized: parsed.preauthorized,
                tags: parsed.tags,
              },
            },
          },
        };
        if (parsed.expirySeconds !== undefined) {
          body["expirySeconds"] = parsed.expirySeconds;
        }
        if (parsed.description !== undefined) {
          body["description"] = parsed.description;
        }
        const result = await client.post<AuthKey>(
          `/tailnet/${client.tailnet}/keys`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_key_delete": {
        const parsed = KeyDeleteSchema.parse(args);
        await client.deleteVoid(
          `/tailnet/${client.tailnet}/keys/${parsed.keyId}`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ deleted: true, keyId: parsed.keyId }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown key tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
