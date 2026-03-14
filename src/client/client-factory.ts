import type { ITailscaleClient } from "./types.js";
import { TailscaleClient } from "./tailscale-client.js";
import { TailscaleOAuthClient } from "./tailscale-oauth-client.js";

/**
 * Create a Tailscale API client from environment variables.
 *
 * Priority:
 * 1. OAuth client credentials (TAILSCALE_OAUTH_CLIENT_ID + TAILSCALE_OAUTH_CLIENT_SECRET)
 * 2. API key (TAILSCALE_API_KEY)
 *
 * Both require TAILSCALE_TAILNET.
 */
export function createClientFromEnv(): ITailscaleClient {
  const tailnet = process.env["TAILSCALE_TAILNET"];
  if (!tailnet) {
    throw new Error("TAILSCALE_TAILNET environment variable is required");
  }

  const apiUrl = process.env["TAILSCALE_API_URL"];
  const rawTimeout = parseInt(process.env["TAILSCALE_TIMEOUT"] ?? "30000", 10);
  const timeout = Number.isNaN(rawTimeout) ? 30000 : rawTimeout;

  const clientId = process.env["TAILSCALE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["TAILSCALE_OAUTH_CLIENT_SECRET"];

  if (clientId && clientSecret) {
    return new TailscaleOAuthClient({ clientId, clientSecret, tailnet, apiUrl, timeout });
  }

  const apiKey = process.env["TAILSCALE_API_KEY"];
  if (apiKey) {
    return new TailscaleClient({ apiKey, tailnet, apiUrl, timeout });
  }

  throw new Error(
    "Authentication required: set TAILSCALE_API_KEY or both TAILSCALE_OAUTH_CLIENT_ID and TAILSCALE_OAUTH_CLIENT_SECRET",
  );
}
