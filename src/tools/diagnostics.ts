import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type { DeviceListResponse, DerpMap, LogStreamConfig, AclPolicy } from "../client/types.js";
import { TailscaleApiError } from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const StatusSchema = z.object({});

const ApiVerifySchema = z.object({});

const LogStreamGetSchema = z.object({
  logType: z.enum(["configuration", "network"], {
    errorMap: () => ({ message: "logType must be 'configuration' or 'network'" }),
  }),
});

const LogStreamSetSchema = z.object({
  logType: z.enum(["configuration", "network"], {
    errorMap: () => ({ message: "logType must be 'configuration' or 'network'" }),
  }),
  destinationType: z.string().min(1, "destinationType is required"),
  url: z.string().url("Invalid log stream URL"),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to set a log stream configuration" }),
  }),
});

const DerpMapSchema = z.object({});

const DerpMapSetSchema = z.object({
  regions: z.record(
    z.string(),
    z.object({
      regionId: z.number().int().positive(),
      regionCode: z.string().min(1),
      regionName: z.string().min(1),
      avoid: z.boolean().optional(),
      nodes: z.array(
        z.object({
          name: z.string().min(1),
          regionId: z.number().int().positive(),
          hostName: z.string().min(1),
          certName: z.string().optional(),
          ipv4: z.string().optional(),
          ipv6: z.string().optional(),
          stunPort: z.number().int().optional(),
          stunOnly: z.boolean().optional(),
          derpPort: z.number().int().optional(),
        }),
      ),
    }),
  ),
  omitDefaultRegions: z.boolean().optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to update the DERP map" }),
  }),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const diagnosticsToolDefinitions = [
  {
    name: "tailscale_status",
    description:
      "Get a summary of the tailnet status including total device count, online/offline counts, and last-seen timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_api_verify",
    description:
      "Verify API connectivity and authentication by making a lightweight request to the Tailscale API.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_log_stream_get",
    description:
      "Get the current log streaming configuration for the tailnet. Log types: 'configuration' or 'network'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        logType: {
          type: "string",
          enum: ["configuration", "network"],
          description: "Type of logs to retrieve the streaming config for",
        },
      },
      required: ["logType"],
    },
  },
  {
    name: "tailscale_log_stream_set",
    description:
      "Configure log streaming for the tailnet. Requires confirm: true. Streams logs to a specified URL endpoint.",
    inputSchema: {
      type: "object" as const,
      properties: {
        logType: {
          type: "string",
          enum: ["configuration", "network"],
          description: "Type of logs to stream",
        },
        destinationType: {
          type: "string",
          description: "Destination type for log streaming (e.g., 'panther')",
        },
        url: {
          type: "string",
          description: "URL endpoint to stream logs to",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm log stream configuration change",
        },
      },
      required: ["logType", "destinationType", "url", "confirm"],
    },
  },
  {
    name: "tailscale_derp_map",
    description:
      "Get the custom DERP relay map from the tailnet's ACL policy. Returns the derpMap field from the ACL, or a 'not configured' message if no custom DERP map exists.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_derp_map_set",
    description:
      "Set or update the custom DERP relay map in the tailnet's ACL policy. Requires confirm: true. Custom DERP regions use IDs 900-999. Set omitDefaultRegions: true to replace Tailscale's default relays entirely.",
    inputSchema: {
      type: "object" as const,
      properties: {
        regions: {
          type: "object",
          description: "Map of region ID (string) to region config. Custom regions should use IDs 900-999.",
          additionalProperties: {
            type: "object",
            properties: {
              regionId: { type: "number", description: "Region ID (900-999 for custom)" },
              regionCode: { type: "string", description: "Short region code (e.g., 'mydc')" },
              regionName: { type: "string", description: "Human-readable region name" },
              avoid: { type: "boolean", description: "If true, avoid using this region" },
              nodes: {
                type: "array",
                description: "DERP nodes in this region",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Node name" },
                    regionId: { type: "number", description: "Must match parent region" },
                    hostName: { type: "string", description: "DERP server hostname" },
                    certName: { type: "string", description: "TLS cert name if different from hostName" },
                    ipv4: { type: "string", description: "IPv4 address" },
                    ipv6: { type: "string", description: "IPv6 address" },
                    stunPort: { type: "number", description: "STUN port (default 3478)" },
                    stunOnly: { type: "boolean", description: "If true, only use for STUN" },
                    derpPort: { type: "number", description: "DERP port (default 443)" },
                  },
                  required: ["name", "regionId", "hostName"],
                },
              },
            },
            required: ["regionId", "regionCode", "regionName", "nodes"],
          },
        },
        omitDefaultRegions: {
          type: "boolean",
          description: "If true, omit Tailscale's default DERP regions and use only custom ones",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm the DERP map update",
        },
      },
      required: ["regions", "confirm"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleDiagnosticsTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_status": {
        StatusSchema.parse(args);
        const result = await client.get<DeviceListResponse>(
          `/tailnet/${client.tailnet}/devices`,
        );
        const devices = result.devices ?? [];
        const now = new Date();
        const onlineThresholdMs = 5 * 60 * 1000; // 5 minutes

        const onlineDevices = devices.filter((d) => {
          if (!d.lastSeen) return false;
          const lastSeenMs = new Date(d.lastSeen).getTime();
          return now.getTime() - lastSeenMs < onlineThresholdMs;
        });

        const status = {
          tailnet: client.tailnet,
          deviceCount: devices.length,
          onlineDevices: onlineDevices.length,
          offlineDevices: devices.length - onlineDevices.length,
          devices: devices.map((d) => ({
            id: d.id,
            name: d.name,
            hostname: d.hostname,
            os: d.os,
            addresses: d.addresses,
            lastSeen: d.lastSeen,
            authorized: d.authorized,
          })),
        };

        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      }

      case "tailscale_api_verify": {
        ApiVerifySchema.parse(args);
        const result = await client.get<DeviceListResponse>(
          `/tailnet/${client.tailnet}/devices`,
          { per_page: 1 },
        );
        const deviceCount = (result.devices ?? []).length;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  connected: true,
                  tailnet: client.tailnet,
                  deviceCount,
                  message: "Tailscale API connection verified successfully",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "tailscale_log_stream_get": {
        const parsed = LogStreamGetSchema.parse(args);
        try {
          const result = await client.get<LogStreamConfig>(
            `/tailnet/${client.tailnet}/logging/${parsed.logType}/stream`,
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err: unknown) {
          if (err instanceof TailscaleApiError && err.status === 404 ||
              err instanceof Error && err.message.includes("404")) {
            return { content: [{ type: "text", text: JSON.stringify({
              configured: false,
              logType: parsed.logType,
              message: `No log streaming configured for '${parsed.logType}' logs. Configure via the Tailscale admin console (https://login.tailscale.com/admin/logs) or use tailscale_log_stream_set to set a streaming destination.`,
            }, null, 2) }] };
          }
          throw err;
        }
      }

      case "tailscale_log_stream_set": {
        const parsed = LogStreamSetSchema.parse(args);
        const result = await client.put<LogStreamConfig>(
          `/tailnet/${client.tailnet}/logging/${parsed.logType}/stream`,
          {
            destinationType: parsed.destinationType,
            url: parsed.url,
          },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_derp_map": {
        DerpMapSchema.parse(args);
        // DERP map is managed through the ACL policy's derpMap field
        const acl = await client.get<AclPolicy & { derpMap?: DerpMap }>(
          `/tailnet/${client.tailnet}/acl`,
        );
        if (acl.derpMap) {
          return { content: [{ type: "text", text: JSON.stringify({
            source: "acl-policy",
            derpMap: acl.derpMap,
          }, null, 2) }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({
          configured: false,
          message: "No custom DERP map configured in ACL policy. The tailnet uses Tailscale's default DERP relay regions. To add custom DERP servers, use tailscale_derp_map_set with regions using IDs 900-999.",
        }, null, 2) }] };
      }

      case "tailscale_derp_map_set": {
        const parsed = DerpMapSetSchema.parse(args);
        // Read current ACL, patch derpMap, write back
        const currentAcl = await client.get<Record<string, unknown>>(
          `/tailnet/${client.tailnet}/acl`,
        );
        const derpMap: Record<string, unknown> = {
          Regions: parsed.regions,
        };
        if (parsed.omitDefaultRegions !== undefined) {
          derpMap["OmitDefaultRegions"] = parsed.omitDefaultRegions;
        }
        const updatedAcl = { ...currentAcl, derpMap };
        const result = await client.post<AclPolicy>(
          `/tailnet/${client.tailnet}/acl`,
          updatedAcl,
        );
        return { content: [{ type: "text", text: JSON.stringify({
          message: "DERP map updated in ACL policy",
          derpMap,
          aclUpdated: true,
        }, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown diagnostics tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
