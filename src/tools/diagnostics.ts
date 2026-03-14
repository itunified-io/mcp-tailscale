import { z } from "zod";
import type { TailscaleClient } from "../client/tailscale-client.js";
import type { DeviceListResponse, DerpMap, LogStreamConfig } from "../client/types.js";

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
      "Get the DERP relay map for the tailnet. Shows all DERP regions and their relay nodes used for traffic routing.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleDiagnosticsTool(
  name: string,
  args: Record<string, unknown>,
  client: TailscaleClient,
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
        const result = await client.get<LogStreamConfig>(
          `/tailnet/${client.tailnet}/logging/${parsed.logType}/stream`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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
        const result = await client.get<DerpMap>(
          `/tailnet/${client.tailnet}/derp-map`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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
