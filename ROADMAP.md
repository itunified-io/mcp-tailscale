# Roadmap

This roadmap outlines the product development phases for mcp-tailscale. Phases are sequential — each builds on the previous one. Timelines are directional, not commitments.

## Phase 1: OSS Adoption (Current)

Establish mcp-tailscale as the most complete, best-documented open-source MCP server for Tailscale.

### Delivered

- [x] 48 tools across 9 domains (Devices, DNS, ACL, Keys, Tailnet, Users, Webhooks, Posture, Diagnostics)
- [x] Tailscale API v2 full coverage
- [x] API key and OAuth client credentials authentication
- [x] stdio and SSE transport with Bearer token auth
- [x] Zod-validated inputs on all tools
- [x] Structured error handling (TailscaleApiError)
- [x] 188 unit tests (vitest)
- [x] 7 Claude Code skills for common workflows
- [x] Dual licensing (AGPL-3.0 + Commercial)
- [x] Glama registry listing with quality badges

### Planned

- [ ] Docker image for easy self-hosting
- [ ] Connector/plugin SDK for extending the runtime with custom tools
- [ ] Example connectors (HTTP proxy, filesystem, Kubernetes)
- [ ] Self-hosting documentation and deployment guides
- [ ] npm package publishing
- [ ] Official MCP Registry listing

## Phase 2: Enterprise Boundary

Add governance, compliance, and multi-tenant capabilities for organizations that need control over AI agent access to infrastructure.

### Planned

- [ ] Role-based access control (RBAC) — define who can use which tools
- [ ] OIDC/SAML single sign-on — integrate with existing identity providers
- [ ] Audit event system — structured logs of every tool invocation with context
- [ ] Policy engine — declarative rules for tool access, rate limiting, and approval workflows
- [ ] Admin API — programmatic management of users, roles, and policies
- [ ] Multi-tenant runtime — isolated tool execution per team or organization
- [ ] Commercial license distribution

## Phase 3: Cloud (When Demand Is Proven)

Managed cloud offering — only when there is demonstrated demand from Phase 2 customers.

### Planned

- [ ] Hosted Control Plane — managed gateway runtime with zero self-hosting
- [ ] Gateway fleet management — deploy, monitor, and update gateway instances
- [ ] Hosted observability — centralized logging, metrics, and alerting
- [ ] Admin console — web UI for managing gateways, users, and policies
- [ ] Usage metering — consumption-based billing

## How We Decide What to Build

- **Phase 1** items are driven by community feedback and Tailscale API coverage gaps
- **Phase 2** items are driven by enterprise customer conversations and compliance requirements
- **Phase 3** items are only built when Phase 2 adoption demonstrates clear demand for managed hosting

## Contributing

Phase 1 features are open to community contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.

For enterprise feature discussions, contact us via [GitHub Sponsors](https://github.com/sponsors/itunified-io).
