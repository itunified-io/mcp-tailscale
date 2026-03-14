import { z } from "zod";
import type { TailscaleClient } from "../client/tailscale-client.js";
import { DeviceIdSchema } from "../utils/validation.js";
import type { DeviceListResponse, DeviceRoutes, DevicePostureResponse } from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const DeviceListSchema = z.object({});

const DeviceGetSchema = z.object({
  deviceId: DeviceIdSchema,
});

const DeviceDeleteSchema = z.object({
  deviceId: DeviceIdSchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to delete a device" }),
  }),
});

const DeviceAuthorizeSchema = z.object({
  deviceId: DeviceIdSchema,
});

const DeviceRoutesGetSchema = z.object({
  deviceId: DeviceIdSchema,
});

const DeviceRoutesSetSchema = z.object({
  deviceId: DeviceIdSchema,
  routes: z.array(z.string()).min(1, "At least one route is required"),
});

const DeviceTagsSetSchema = z.object({
  deviceId: DeviceIdSchema,
  tags: z.array(z.string()),
});

const DevicePostureGetSchema = z.object({
  deviceId: DeviceIdSchema,
});

const DevicePostureSetSchema = z.object({
  deviceId: DeviceIdSchema,
  attributeKey: z.string().min(1, "Attribute key is required"),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const deviceToolDefinitions = [
  {
    name: "tailscale_device_list",
    description:
      "List all devices in the tailnet. Returns all registered devices with their IP addresses, hostname, OS, and connection status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_device_get",
    description: "Get details of a specific device by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID (numeric string)",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "tailscale_device_delete",
    description:
      "Delete a device from the tailnet. This removes the device and revokes its access. Requires confirm: true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm device deletion",
        },
      },
      required: ["deviceId", "confirm"],
    },
  },
  {
    name: "tailscale_device_authorize",
    description:
      "Authorize a device that is pending approval. Sets the device's authorized status to true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID to authorize",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "tailscale_device_routes_get",
    description:
      "Get the advertised and enabled subnet routes for a device.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "tailscale_device_routes_set",
    description:
      "Set the enabled subnet routes for a device. Replaces the current set of enabled routes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID",
        },
        routes: {
          type: "array",
          items: { type: "string" },
          description: "List of CIDR routes to enable (e.g., ['10.0.0.0/8', '192.168.1.0/24'])",
        },
      },
      required: ["deviceId", "routes"],
    },
  },
  {
    name: "tailscale_device_tags_set",
    description:
      "Set ACL tags on a device. Replaces all existing tags. Use an empty array to remove all tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "List of ACL tags to set (e.g., ['tag:server', 'tag:prod']). Use empty array to clear tags.",
        },
      },
      required: ["deviceId", "tags"],
    },
  },
  {
    name: "tailscale_device_posture_get",
    description:
      "Get custom posture attributes for a device. Returns all key-value posture attributes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "tailscale_device_posture_set",
    description:
      "Set a custom posture attribute on a device. Creates or updates a single attribute key-value pair.",
    inputSchema: {
      type: "object" as const,
      properties: {
        deviceId: {
          type: "string",
          description: "Tailscale device ID",
        },
        attributeKey: {
          type: "string",
          description: "Posture attribute key (e.g., 'custom:compliance-status')",
        },
        value: {
          description: "Attribute value (string, boolean, or number)",
        },
      },
      required: ["deviceId", "attributeKey", "value"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleDeviceTool(
  name: string,
  args: Record<string, unknown>,
  client: TailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_device_list": {
        DeviceListSchema.parse(args);
        const result = await client.get<DeviceListResponse>(
          `/tailnet/${client.tailnet}/devices`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_device_get": {
        const parsed = DeviceGetSchema.parse(args);
        const result = await client.get(`/device/${parsed.deviceId}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_device_delete": {
        const parsed = DeviceDeleteSchema.parse(args);
        await client.deleteVoid(`/device/${parsed.deviceId}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ deleted: true, deviceId: parsed.deviceId }, null, 2),
            },
          ],
        };
      }

      case "tailscale_device_authorize": {
        const parsed = DeviceAuthorizeSchema.parse(args);
        await client.postVoid(`/device/${parsed.deviceId}/authorized`, {
          authorized: true,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ authorized: true, deviceId: parsed.deviceId }, null, 2),
            },
          ],
        };
      }

      case "tailscale_device_routes_get": {
        const parsed = DeviceRoutesGetSchema.parse(args);
        const result = await client.get<DeviceRoutes>(
          `/device/${parsed.deviceId}/routes`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_device_routes_set": {
        const parsed = DeviceRoutesSetSchema.parse(args);
        const result = await client.post<DeviceRoutes>(
          `/device/${parsed.deviceId}/routes`,
          { routes: parsed.routes },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_device_tags_set": {
        const parsed = DeviceTagsSetSchema.parse(args);
        await client.postVoid(`/device/${parsed.deviceId}/tags`, {
          tags: parsed.tags,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ tags: parsed.tags, deviceId: parsed.deviceId }, null, 2),
            },
          ],
        };
      }

      case "tailscale_device_posture_get": {
        const parsed = DevicePostureGetSchema.parse(args);
        const result = await client.get<DevicePostureResponse>(
          `/device/${parsed.deviceId}/attributes`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_device_posture_set": {
        const parsed = DevicePostureSetSchema.parse(args);
        const result = await client.post(
          `/device/${parsed.deviceId}/attributes/${parsed.attributeKey}`,
          { value: parsed.value },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown device tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
