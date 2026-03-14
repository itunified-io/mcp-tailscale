import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type { WebhookListResponse, TailscaleWebhook } from "../client/types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_EVENT_TYPES = [
  "nodeCreated",
  "nodeApproved",
  "nodeNeedsApproval",
  "nodeKeyExpiringInOneDay",
  "nodeKeyExpired",
  "nodeDeleted",
  "policyUpdate",
  "userCreated",
  "userDeleted",
  "userApproved",
  "userSuspended",
  "userRestored",
  "userRoleUpdated",
  "subnetIPForwardingNotEnabled",
  "exitNodeIPForwardingNotEnabled",
] as const;

const PROVIDER_TYPES = ["slack", "mattermost", "googlechat", "discord", "generic"] as const;

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const WebhookListSchema = z.object({});

const WebhookCreateSchema = z.object({
  endpointUrl: z.string().url("Must be a valid URL"),
  providerType: z.enum(PROVIDER_TYPES).optional().default("generic"),
  subscriptions: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, "At least one subscription event type is required"),
});

const WebhookGetSchema = z.object({
  webhookId: z.string().min(1, "Webhook ID is required"),
});

const WebhookDeleteSchema = z.object({
  webhookId: z.string().min(1, "Webhook ID is required"),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to delete a webhook" }),
  }),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const webhookToolDefinitions = [
  {
    name: "tailscale_webhook_list",
    description:
      "List all webhook endpoints configured for the tailnet.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_webhook_create",
    description:
      "Create a new webhook endpoint. Returns the webhook including the signing secret (only shown once). Event types: nodeCreated, nodeApproved, nodeNeedsApproval, nodeKeyExpiringInOneDay, nodeKeyExpired, nodeDeleted, policyUpdate, userCreated, userDeleted, userApproved, userSuspended, userRestored, userRoleUpdated, subnetIPForwardingNotEnabled, exitNodeIPForwardingNotEnabled.",
    inputSchema: {
      type: "object" as const,
      properties: {
        endpointUrl: {
          type: "string",
          description: "The URL to receive webhook events",
        },
        providerType: {
          type: "string",
          enum: ["slack", "mattermost", "googlechat", "discord", "generic"],
          description: "The webhook provider type (default: generic)",
        },
        subscriptions: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "nodeCreated", "nodeApproved", "nodeNeedsApproval",
              "nodeKeyExpiringInOneDay", "nodeKeyExpired", "nodeDeleted",
              "policyUpdate", "userCreated", "userDeleted", "userApproved",
              "userSuspended", "userRestored", "userRoleUpdated",
              "subnetIPForwardingNotEnabled", "exitNodeIPForwardingNotEnabled",
            ],
          },
          description: "Event types to subscribe to",
        },
      },
      required: ["endpointUrl", "subscriptions"],
    },
  },
  {
    name: "tailscale_webhook_get",
    description:
      "Get details for a specific webhook endpoint by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhookId: {
          type: "string",
          description: "The webhook endpoint ID",
        },
      },
      required: ["webhookId"],
    },
  },
  {
    name: "tailscale_webhook_delete",
    description:
      "Delete a webhook endpoint. Requires confirm: true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhookId: {
          type: "string",
          description: "The webhook endpoint ID to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm deletion",
        },
      },
      required: ["webhookId", "confirm"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleWebhookTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_webhook_list": {
        WebhookListSchema.parse(args);
        const result = await client.get<WebhookListResponse>(
          `/tailnet/${client.tailnet}/webhooks`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_webhook_create": {
        const parsed = WebhookCreateSchema.parse(args);
        const result = await client.post<TailscaleWebhook>(
          `/tailnet/${client.tailnet}/webhooks`,
          {
            endpointUrl: parsed.endpointUrl,
            providerType: parsed.providerType,
            subscriptions: parsed.subscriptions,
          },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_webhook_get": {
        const parsed = WebhookGetSchema.parse(args);
        const result = await client.get<TailscaleWebhook>(
          `/webhooks/${parsed.webhookId}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_webhook_delete": {
        const parsed = WebhookDeleteSchema.parse(args);
        await client.deleteVoid(`/webhooks/${parsed.webhookId}`);
        return {
          content: [{ type: "text", text: JSON.stringify({ deleted: true, webhookId: parsed.webhookId }, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown webhook tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
