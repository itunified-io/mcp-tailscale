import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type { PostureIntegrationListResponse, PostureIntegration } from "../client/types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSTURE_PROVIDERS = [
  "crowdstrike", "falcon", "intune", "jamfPro",
  "kandji", "kolide", "sentinelone",
] as const;

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const PostureIntegrationListSchema = z.object({});

const PostureIntegrationGetSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});

const PostureIntegrationCreateSchema = z.object({
  provider: z.enum(POSTURE_PROVIDERS),
  cloudId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tenantId: z.string().optional(),
});

const PostureIntegrationDeleteSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to delete a posture integration" }),
  }),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const postureToolDefinitions = [
  {
    name: "tailscale_posture_integration_list",
    description:
      "List all configured third-party posture provider integrations for the tailnet (e.g., CrowdStrike, Intune, Jamf).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_posture_integration_get",
    description:
      "Get details for a specific posture provider integration by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        integrationId: {
          type: "string",
          description: "The posture integration ID",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "tailscale_posture_integration_create",
    description:
      "Create a new third-party posture provider integration. Supported providers: crowdstrike, falcon, intune, jamfPro, kandji, kolide, sentinelone. Required fields depend on the provider.",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          enum: ["crowdstrike", "falcon", "intune", "jamfPro", "kandji", "kolide", "sentinelone"],
          description: "Posture provider type",
        },
        cloudId: {
          type: "string",
          description: "Cloud ID (provider-specific)",
        },
        clientId: {
          type: "string",
          description: "Client ID for the posture provider",
        },
        clientSecret: {
          type: "string",
          description: "Client secret for the posture provider",
        },
        tenantId: {
          type: "string",
          description: "Tenant ID (for Intune/Azure-based providers)",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "tailscale_posture_integration_delete",
    description:
      "Delete a posture provider integration. Requires confirm: true.",
    inputSchema: {
      type: "object" as const,
      properties: {
        integrationId: {
          type: "string",
          description: "The posture integration ID to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm deletion",
        },
      },
      required: ["integrationId", "confirm"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handlePostureTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_posture_integration_list": {
        PostureIntegrationListSchema.parse(args);
        const result = await client.get<PostureIntegrationListResponse>(
          `/tailnet/${client.tailnet}/posture/integrations`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_posture_integration_get": {
        const parsed = PostureIntegrationGetSchema.parse(args);
        const result = await client.get<PostureIntegration>(
          `/tailnet/${client.tailnet}/posture/integrations/${parsed.integrationId}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_posture_integration_create": {
        const parsed = PostureIntegrationCreateSchema.parse(args);
        const body: Record<string, unknown> = { provider: parsed.provider };
        if (parsed.cloudId !== undefined) body["cloudId"] = parsed.cloudId;
        if (parsed.clientId !== undefined) body["clientId"] = parsed.clientId;
        if (parsed.clientSecret !== undefined) body["clientSecret"] = parsed.clientSecret;
        if (parsed.tenantId !== undefined) body["tenantId"] = parsed.tenantId;
        const result = await client.post<PostureIntegration>(
          `/tailnet/${client.tailnet}/posture/integrations`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_posture_integration_delete": {
        const parsed = PostureIntegrationDeleteSchema.parse(args);
        await client.deleteVoid(
          `/tailnet/${client.tailnet}/posture/integrations/${parsed.integrationId}`,
        );
        return {
          content: [{ type: "text", text: JSON.stringify({ deleted: true, integrationId: parsed.integrationId }, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown posture tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
