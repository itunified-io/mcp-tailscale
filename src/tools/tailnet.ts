import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type {
  TailnetSettings,
  TailnetContacts,
  TailnetLockStatus,
} from "../client/types.js";
import { TailscaleApiError } from "../utils/errors.js";

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

const TailnetSettingsUpdateSchema = z.object({
  devicesApprovalOn: z.boolean().optional(),
  devicesAutoUpdatesOn: z.boolean().optional(),
  devicesKeyDurationDays: z.number().int().positive().optional(),
  usersApprovalOn: z.boolean().optional(),
  usersRoleAllowedToJoinExternalTailnets: z.string().optional(),
  networkFlowLoggingOn: z.boolean().optional(),
  regionalRoutingOn: z.boolean().optional(),
  postureIdentityCollectionOn: z.boolean().optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to update tailnet settings" }),
  }),
});

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
  {
    name: "tailscale_tailnet_settings_update",
    description:
      "Update tailnet settings. Requires confirm: true. All settings fields are optional — only provided fields will be updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        devicesApprovalOn: {
          type: "boolean",
          description: "Whether devices require admin approval before they can join the tailnet",
        },
        devicesAutoUpdatesOn: {
          type: "boolean",
          description: "Whether devices are automatically updated",
        },
        devicesKeyDurationDays: {
          type: "number",
          description: "Number of days before device keys expire",
        },
        usersApprovalOn: {
          type: "boolean",
          description: "Whether users require admin approval to join the tailnet",
        },
        usersRoleAllowedToJoinExternalTailnets: {
          type: "string",
          description: "Role allowed to join external tailnets",
        },
        networkFlowLoggingOn: {
          type: "boolean",
          description: "Whether network flow logging is enabled",
        },
        regionalRoutingOn: {
          type: "boolean",
          description: "Whether regional routing is enabled",
        },
        postureIdentityCollectionOn: {
          type: "boolean",
          description: "Whether posture identity collection is enabled",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm updating tailnet settings",
        },
      },
      required: ["confirm"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleTailnetTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
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
        try {
          const result = await client.get<TailnetLockStatus>(
            `/tailnet/${client.tailnet}/lock/status`,
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err: unknown) {
          if (err instanceof TailscaleApiError && err.status === 404 ||
              err instanceof Error && err.message.includes("404")) {
            return { content: [{ type: "text", text: JSON.stringify({
              enabled: false,
              initialized: false,
              message: "Tailnet Lock is not initialized. Tailnet Lock requires CLI setup — it cannot be enabled via API. Steps: (1) Run 'tailscale lock init' on a trusted device, (2) Sign existing nodes with 'tailscale lock sign', (3) Status will then be available via this tool. See https://tailscale.com/kb/1226/tailnet-lock for details.",
            }, null, 2) }] };
          }
          throw err;
        }
      }

      case "tailscale_tailnet_settings_update": {
        const parsed = TailnetSettingsUpdateSchema.parse(args);
        const body: Record<string, unknown> = {};
        if (parsed.devicesApprovalOn !== undefined) body["devicesApprovalOn"] = parsed.devicesApprovalOn;
        if (parsed.devicesAutoUpdatesOn !== undefined) body["devicesAutoUpdatesOn"] = parsed.devicesAutoUpdatesOn;
        if (parsed.devicesKeyDurationDays !== undefined) body["devicesKeyDurationDays"] = parsed.devicesKeyDurationDays;
        if (parsed.usersApprovalOn !== undefined) body["usersApprovalOn"] = parsed.usersApprovalOn;
        if (parsed.usersRoleAllowedToJoinExternalTailnets !== undefined) body["usersRoleAllowedToJoinExternalTailnets"] = parsed.usersRoleAllowedToJoinExternalTailnets;
        if (parsed.networkFlowLoggingOn !== undefined) body["networkFlowLoggingOn"] = parsed.networkFlowLoggingOn;
        if (parsed.regionalRoutingOn !== undefined) body["regionalRoutingOn"] = parsed.regionalRoutingOn;
        if (parsed.postureIdentityCollectionOn !== undefined) body["postureIdentityCollectionOn"] = parsed.postureIdentityCollectionOn;
        const result = await client.patch<TailnetSettings>(
          `/tailnet/${client.tailnet}/settings`,
          body,
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
