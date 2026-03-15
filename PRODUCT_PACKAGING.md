# Product Packaging

This document defines the product tiers for mcp-tailscale. The tiers represent a clear progression from self-hosted open source to managed cloud, with honest boundaries — no artificial limitations on the free tier.

## Tier Overview

| Tier | Target | Distribution | License |
|------|--------|-------------|---------|
| **Community** | Developers, small teams | Public GitHub, self-hosted | AGPL-3.0 |
| **Team** | Engineering teams, startups | Private distribution | Commercial |
| **Enterprise** | Large organizations, regulated industries | Private distribution | Commercial |
| **Cloud** | Any organization (managed) | Hosted SaaS | Commercial SaaS |

## Feature Matrix

| Feature | Community | Team | Enterprise | Cloud |
|---------|:---------:|:----:|:----------:|:-----:|
| **Runtime** | | | | |
| 48 tools across 9 domains | ✅ | ✅ | ✅ | ✅ |
| Tailscale API v2 full coverage | ✅ | ✅ | ✅ | ✅ |
| stdio transport | ✅ | ✅ | ✅ | ✅ |
| SSE transport with Bearer auth | ✅ | ✅ | ✅ | ✅ |
| API key authentication | ✅ | ✅ | ✅ | ✅ |
| OAuth client credentials | ✅ | ✅ | ✅ | ✅ |
| Zod input validation | ✅ | ✅ | ✅ | ✅ |
| Plugin/Connector SDK | ✅ | ✅ | ✅ | ✅ |
| Claude Code skills | ✅ | ✅ | ✅ | ✅ |
| Docker image | ✅ | ✅ | ✅ | ✅ |
| **Identity & Access** | | | | |
| Role-based access control (RBAC) | — | ✅ | ✅ | ✅ |
| OIDC single sign-on | — | ✅ | ✅ | ✅ |
| SAML single sign-on | — | — | ✅ | ✅ |
| Team management | — | ✅ | ✅ | ✅ |
| **Governance** | | | | |
| Audit event logging | — | ✅ | ✅ | ✅ |
| Policy engine (tool access rules) | — | — | ✅ | ✅ |
| Approval workflows | — | — | ✅ | ✅ |
| Compliance reporting | — | — | ✅ | ✅ |
| **Multi-Tenancy** | | | | |
| Tenant isolation | — | — | ✅ | ✅ |
| Per-tenant configuration | — | — | ✅ | ✅ |
| Cross-tenant admin | — | — | ✅ | ✅ |
| **Operations** | | | | |
| Self-hosted deployment | ✅ | ✅ | ✅ | — |
| Hosted control plane | — | — | — | ✅ |
| Gateway fleet management | — | — | — | ✅ |
| Centralized observability | — | — | — | ✅ |
| Auto-updates | — | — | — | ✅ |
| **Support** | | | | |
| Community (GitHub Issues) | ✅ | ✅ | ✅ | ✅ |
| Priority support | — | ✅ | ✅ | ✅ |
| SLA | — | — | ✅ | ✅ |
| Dedicated support channel | — | — | ✅ | ✅ |
| **License** | | | | |
| AGPL-3.0 (open source) | ✅ | — | — | — |
| Commercial license | — | ✅ | ✅ | ✅ |

## Tier Details

### Community (Free, AGPL-3.0)

The complete MCP Gateway Runtime — no artificial feature limitations. Self-host, contribute, build on it.

**Who it's for:** Individual developers, open-source projects, small teams evaluating mcp-tailscale.

**What you get:**
- Full Tailscale API v2 coverage (48 tools, 9 domains)
- All transports (stdio, SSE)
- All authentication methods (API key, OAuth)
- Plugin/Connector SDK (when available)
- Claude Code skills
- Docker image
- Community support via GitHub Issues

**License obligation:** AGPL-3.0 — if you modify the software or use it in a network service, you must release your source code under AGPL-3.0.

### Team (Commercial)

Adds identity, access control, and audit capabilities for engineering teams.

**Who it's for:** Startups and engineering teams that need to control who can access infrastructure tools through AI agents.

**What you get:**
- Everything in Community
- RBAC — define roles and permissions for tool access
- OIDC SSO — integrate with your identity provider
- Audit logging — structured records of every tool invocation
- Team management — invite, manage, remove team members
- Commercial license — no AGPL source code obligations
- Priority support

### Enterprise (Commercial)

Full governance suite for organizations with compliance requirements and multi-team structures.

**Who it's for:** Large organizations, regulated industries, multi-team environments.

**What you get:**
- Everything in Team
- SAML SSO — enterprise identity federation
- Policy engine — declarative rules for tool access, rate limiting, approval workflows
- Multi-tenant isolation — separate configuration and execution per team/org
- Compliance reporting — exportable audit trails
- SLA and dedicated support channel

### Cloud (Future — Commercial SaaS)

Managed cloud offering — zero self-hosting, zero maintenance.

**Who it's for:** Organizations that want managed infrastructure access without running their own gateway.

**What you get:**
- Everything in Enterprise
- Hosted control plane — we run the gateway, you connect your tailnet
- Fleet management — deploy and manage multiple gateway instances
- Centralized observability — logs, metrics, alerting in one dashboard
- Auto-updates — always on the latest version
- Usage-based billing

## Pricing

Pricing is not yet published. Contact us to discuss:

- **GitHub Sponsors**: [github.com/sponsors/itunified-io](https://github.com/sponsors/itunified-io)

## FAQ

**Q: Will the Community edition ever be limited to push people toward paid tiers?**
A: No. The Community edition is the full runtime. Enterprise features (RBAC, SSO, audit, policy) are genuinely new capabilities that don't exist in the current codebase — they are not features removed from the free tier.

**Q: Can I use the Community edition commercially?**
A: Yes, if you comply with AGPL-3.0 terms (including releasing your source code). If you cannot or prefer not to comply with AGPL-3.0, you need a commercial license.

**Q: When will Team/Enterprise be available?**
A: See [ROADMAP.md](ROADMAP.md) for the development timeline. Phase 2 (Enterprise) follows Phase 1 (OSS Adoption).

**Q: Is the Cloud tier available?**
A: Not yet. The Cloud tier will only be built when Phase 2 adoption demonstrates demand. See [ROADMAP.md](ROADMAP.md).
