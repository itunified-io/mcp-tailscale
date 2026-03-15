import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type {
  AclPolicy,
  AclPreviewResult,
  AclValidationResult,
} from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const AclGetSchema = z.object({});

const AclPolicySchema = z.object({
  acls: z.array(
    z.object({
      action: z.string(),
      src: z.array(z.string()),
      dst: z.array(z.string()),
      proto: z.string().optional(),
    }),
  ).optional(),
  groups: z.record(z.string(), z.array(z.string())).optional(),
  hosts: z.record(z.string(), z.string()).optional(),
  tagOwners: z.record(z.string(), z.array(z.string())).optional(),
  autoApprovers: z.object({
    routes: z.record(z.string(), z.array(z.string())).optional(),
    exitNode: z.array(z.string()).optional(),
  }).optional(),
  ssh: z.array(
    z.object({
      action: z.string(),
      src: z.array(z.string()),
      dst: z.array(z.string()),
      users: z.array(z.string()),
    }),
  ).optional(),
  tests: z.array(
    z.object({
      src: z.string(),
      accept: z.array(z.string()).optional(),
      deny: z.array(z.string()).optional(),
    }),
  ).optional(),
});

const AclSetSchema = z.object({
  policy: AclPolicySchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to update the ACL policy" }),
  }),
});

const AclPreviewSchema = z.object({
  policy: AclPolicySchema,
  previewFor: z.string().optional(),
  type: z.enum(["ipv4", "ipv6"]).optional(),
});

const AclValidateSchema = z.object({
  policy: AclPolicySchema,
});

const AclTestSchema = z.object({
  policy: AclPolicySchema,
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const aclToolDefinitions = [
  {
    name: "tailscale_acl_get",
    description:
      "Get the current ACL policy for the tailnet as JSON. Returns the full policy including rules, groups, hosts, and tag owners.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_acl_set",
    description:
      "Set (replace) the ACL policy for the tailnet. Requires confirm: true. The entire policy is replaced — provide the complete policy.",
    inputSchema: {
      type: "object" as const,
      properties: {
        policy: {
          type: "object",
          description: "The complete ACL policy JSON to set",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm the ACL policy replacement",
        },
      },
      required: ["policy", "confirm"],
    },
  },
  {
    name: "tailscale_acl_preview",
    description:
      "Preview what the ACL policy would allow for a specific user or IP. Useful for testing before applying changes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        policy: {
          type: "object",
          description: "The ACL policy to preview",
        },
        previewFor: {
          type: "string",
          description: "User email or IP address to preview access for",
        },
        type: {
          type: "string",
          enum: ["ipv4", "ipv6"],
          description: "IP version for the preview",
        },
      },
      required: ["policy"],
    },
  },
  {
    name: "tailscale_acl_validate",
    description:
      "Validate an ACL policy without applying it. Returns any errors or warnings found in the policy.",
    inputSchema: {
      type: "object" as const,
      properties: {
        policy: {
          type: "object",
          description: "The ACL policy to validate",
        },
      },
      required: ["policy"],
    },
  },
  {
    name: "tailscale_acl_test",
    description:
      "Run ACL tests defined in the policy's 'tests' field by validating the policy. Returns validation results including test pass/fail outcomes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        policy: {
          type: "object",
          description: "The ACL policy containing tests to run",
        },
      },
      required: ["policy"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleAclTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_acl_get": {
        AclGetSchema.parse(args);
        const result = await client.get<AclPolicy>(
          `/tailnet/${client.tailnet}/acl`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_acl_set": {
        const parsed = AclSetSchema.parse(args);
        const result = await client.post<AclPolicy>(
          `/tailnet/${client.tailnet}/acl`,
          parsed.policy,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_acl_preview": {
        const parsed = AclPreviewSchema.parse(args);
        const params: Record<string, unknown> = {};
        if (parsed.previewFor !== undefined) params["previewFor"] = parsed.previewFor;
        if (parsed.type !== undefined) params["type"] = parsed.type;
        const result = await client.post<AclPreviewResult>(
          `/tailnet/${client.tailnet}/acl/preview`,
          { ...parsed.policy, ...params },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_acl_validate": {
        const parsed = AclValidateSchema.parse(args);
        const result = await client.post<AclValidationResult>(
          `/tailnet/${client.tailnet}/acl/validate`,
          parsed.policy,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_acl_test": {
        const parsed = AclTestSchema.parse(args);
        const result = await client.post<AclValidationResult>(
          `/tailnet/${client.tailnet}/acl/validate`,
          parsed.policy,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown ACL tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
