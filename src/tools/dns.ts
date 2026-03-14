import { z } from "zod";
import type { ITailscaleClient } from "../client/types.js";
import type {
  DnsNameservers,
  DnsSearchPaths,
  SplitDnsConfig,
  DnsPreferences,
} from "../client/types.js";

// ---------------------------------------------------------------------------
// Zod schemas for input validation
// ---------------------------------------------------------------------------

const DnsNameserversGetSchema = z.object({});

const DnsNameserversSetSchema = z.object({
  dns: z.array(z.string()).min(1, "At least one DNS nameserver is required"),
});

const DnsSearchPathsGetSchema = z.object({});

const DnsSearchPathsSetSchema = z.object({
  searchPaths: z.array(z.string()),
});

const DnsSplitDnsGetSchema = z.object({});

const DnsSplitDnsSetSchema = z.object({
  splitDns: z.record(z.string(), z.array(z.string())),
});

const DnsPreferencesGetSchema = z.object({});

const DnsPreferencesSetSchema = z.object({
  magicDNS: z.boolean(),
});

// ---------------------------------------------------------------------------
// Tool definitions (for ListTools)
// ---------------------------------------------------------------------------

export const dnsToolDefinitions = [
  {
    name: "tailscale_dns_nameservers_get",
    description:
      "Get the global DNS nameservers configured for the tailnet. Also returns whether MagicDNS is enabled.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_dns_nameservers_set",
    description:
      "Set the global DNS nameservers for the tailnet. Replaces all existing nameservers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dns: {
          type: "array",
          items: { type: "string" },
          description: "List of DNS nameserver IP addresses (e.g., ['1.1.1.1', '8.8.8.8'])",
        },
      },
      required: ["dns"],
    },
  },
  {
    name: "tailscale_dns_searchpaths_get",
    description: "Get the DNS search paths configured for the tailnet.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_dns_searchpaths_set",
    description:
      "Set the DNS search paths for the tailnet. Replaces all existing search paths.",
    inputSchema: {
      type: "object" as const,
      properties: {
        searchPaths: {
          type: "array",
          items: { type: "string" },
          description: "List of DNS search domains (e.g., ['example.com', 'internal.example.com'])",
        },
      },
      required: ["searchPaths"],
    },
  },
  {
    name: "tailscale_dns_splitdns_get",
    description:
      "Get the split DNS configuration for the tailnet. Returns a map of domain names to their resolver IP addresses.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_dns_splitdns_set",
    description:
      "Update split DNS configuration for the tailnet using a PATCH operation. Provide a map of domain names to resolver IP addresses. Use null values to remove a domain.",
    inputSchema: {
      type: "object" as const,
      properties: {
        splitDns: {
          type: "object",
          description:
            "Map of domain to resolver IPs (e.g., {\"internal.example.com\": [\"10.0.0.53\"]}). Set a domain to null to remove it.",
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      required: ["splitDns"],
    },
  },
  {
    name: "tailscale_dns_preferences_get",
    description: "Get DNS preferences for the tailnet, including MagicDNS status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "tailscale_dns_preferences_set",
    description: "Set DNS preferences for the tailnet. Toggle MagicDNS on or off.",
    inputSchema: {
      type: "object" as const,
      properties: {
        magicDNS: {
          type: "boolean",
          description: "Enable or disable MagicDNS for the tailnet",
        },
      },
      required: ["magicDNS"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleDnsTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      case "tailscale_dns_nameservers_get": {
        DnsNameserversGetSchema.parse(args);
        const result = await client.get<DnsNameservers>(
          `/tailnet/${client.tailnet}/dns/nameservers`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_nameservers_set": {
        const parsed = DnsNameserversSetSchema.parse(args);
        const result = await client.post<DnsNameservers>(
          `/tailnet/${client.tailnet}/dns/nameservers`,
          { dns: parsed.dns },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_searchpaths_get": {
        DnsSearchPathsGetSchema.parse(args);
        const result = await client.get<DnsSearchPaths>(
          `/tailnet/${client.tailnet}/dns/searchpaths`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_searchpaths_set": {
        const parsed = DnsSearchPathsSetSchema.parse(args);
        const result = await client.post<DnsSearchPaths>(
          `/tailnet/${client.tailnet}/dns/searchpaths`,
          { searchPaths: parsed.searchPaths },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_splitdns_get": {
        DnsSplitDnsGetSchema.parse(args);
        const result = await client.get<SplitDnsConfig>(
          `/tailnet/${client.tailnet}/dns/split-dns`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_splitdns_set": {
        const parsed = DnsSplitDnsSetSchema.parse(args);
        const result = await client.patch<SplitDnsConfig>(
          `/tailnet/${client.tailnet}/dns/split-dns`,
          parsed.splitDns,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_preferences_get": {
        DnsPreferencesGetSchema.parse(args);
        const result = await client.get<DnsPreferences>(
          `/tailnet/${client.tailnet}/dns/preferences`,
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "tailscale_dns_preferences_set": {
        const parsed = DnsPreferencesSetSchema.parse(args);
        const result = await client.post<DnsPreferences>(
          `/tailnet/${client.tailnet}/dns/preferences`,
          { magicDNS: parsed.magicDNS },
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown DNS tool: ${name}` }],
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
    };
  }
}
