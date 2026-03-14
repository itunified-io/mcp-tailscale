import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Transport configuration types
// ---------------------------------------------------------------------------

export interface StdioTransportConfig {
  mode: "stdio";
}

export interface SseTransportConfig {
  mode: "sse";
  authToken: string;
  port: number;
  host: string;
}

export type TransportConfig = StdioTransportConfig | SseTransportConfig;

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

export function validateTransportConfig(
  env: Record<string, string | undefined>,
): TransportConfig {
  const mode = env.TAILSCALE_MCP_TRANSPORT || "stdio";

  if (mode === "stdio") {
    return { mode: "stdio" };
  }

  if (mode === "sse") {
    const authToken = env.TAILSCALE_MCP_AUTH_TOKEN;
    if (!authToken) {
      throw new Error(
        "TAILSCALE_MCP_AUTH_TOKEN is required for SSE transport",
      );
    }
    const port = parseInt(env.TAILSCALE_MCP_PORT || "3000", 10);
    const host = env.TAILSCALE_MCP_HOST || "localhost";
    return { mode: "sse", authToken, port, host };
  }

  throw new Error(`Unknown transport: ${mode}. Use 'stdio' or 'sse'.`);
}

// ---------------------------------------------------------------------------
// Auth middleware (timing-safe comparison)
// ---------------------------------------------------------------------------

export function createAuthMiddleware(
  expectedToken: string,
): (req: any, res: any, next: () => void) => void {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const provided = auth.slice("Bearer ".length);
    const expectedBuf = Buffer.from(expectedToken, "utf-8");
    const providedBuf = Buffer.from(provided, "utf-8");

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}
