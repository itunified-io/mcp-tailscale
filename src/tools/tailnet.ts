import { z } from "zod";
import type { TailscaleClient } from "../client/tailscale-client.js";
import type {
  TailnetSettings,
  TailnetContacts,
  TailnetLockStatus,
} from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const TailnetSettingsGetSchema = z.object({});

const TailnetContactsGetSchema = z.object({});

const TailnetContactsSetSchema = z.object({
  account: z
    .object({
      email: z.string().email("Invalid account email"),
    })
    .optional(),
  support: z
    .object({
      email: z.string().email("Invalid support email"),
    })
    .optional(),
  security: z
    .object({
      email: z.string().email("Invalid security email"),
    })
    .optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to update tailnet contacts" }),
  }),
});

const TailnetLockStatusSchema = z.object({});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const tailnetToolDefinitions = [
  {
    name: "tailscale_tailnet_settings_get",
    description:
      "Get the tailnet settings including device approval, auto-updates, key expiry, and posture identity collection.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_tailnet_contacts_get",
    description:
      "Get the contact email addresses configured for the tailnet (account, support, and security contacts).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_tailnet_contacts_set",
    description:
      "Update contact email addresses for the tailnet. Requires confirm: true. Provide any combination of account, support, or security contacts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        account: {
          type: "object",
          properties: {
            email: { type: "string", description: "Account contact email address" },
          },
          required: ["email"],
          description: "Account contact (billing, account management)",
        },
        support: {
          type: "object",
          properties: {
            email: { type: "string", description: "Support contact email address" },
          },
          required: ["email"],
          description: "Support contact",
        },
        security: {
          type: "object",
          properties: {
            email: { type: "string", description: "Security contact email address" },
          },
          required: ["email"],
          description: "Security contact for vulnerability reports",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm updating tailnet contacts",
        },
      },
      required: ["confirm"],
    },
  },
  {
    name: "tailscale_tailnet_lock_status",
    description:
      "Get the Tailnet Lock status. Tailnet Lock allows requiring cryptographic signatures on all node key registrations.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleTailnetTool(
  name: string,
  args: Record<string, unknown>,
  client: TailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_tailnet_settings_get": {
        TailnetSettingsGetSchema.parse(args);
        const result = await client.get<TailnetSettings>(
          `/tailnet/${client.tailnet}/settings`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_tailnet_contacts_get": {
        TailnetContactsGetSchema.parse(args);
        const result = await client.get<TailnetContacts>(
          `/tailnet/${client.tailnet}/contacts`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_tailnet_contacts_set": {
        const parsed = TailnetContactsSetSchema.parse(args);
        const body: Record<string, unknown> = {};
        if (parsed.account !== undefined) body["account"] = parsed.account;
        if (parsed.support !== undefined) body["support"] = parsed.support;
        if (parsed.security !== undefined) body["security"] = parsed.security;
        const result = await client.patch<TailnetContacts>(
          `/tailnet/${client.tailnet}/contacts`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_tailnet_lock_status": {
        TailnetLockStatusSchema.parse(args);
        const result = await client.get<TailnetLockStatus>(
          `/tailnet/${client.tailnet}/lock/status`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tailnet tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
