# Contributing to mcp-tailscale

Thank you for your interest in contributing!

## Workflow

1. **Issue first** — Create a GitHub issue describing the change before starting work
2. **Fork & branch** — Fork the repo, create a feature branch: `feature/<issue-nr>-<description>`
3. **Develop** — Write code, add tests, update documentation
4. **Test** — Ensure all tests pass: `npm test`
5. **PR** — Create a pull request referencing the issue

## Branch Naming

- `feature/<issue-nr>-<description>` — New features
- `fix/<issue-nr>-<description>` — Bug fixes
- `chore/<description>` — Maintenance tasks

## Commit Messages

Use conventional commits with issue references:

```
feat: add device posture tools (#12)
fix: handle 404 on device delete gracefully (#5)
chore: update dependencies
```

## Code Standards

- TypeScript strict mode
- All tool parameters validated with Zod schemas
- No `any` types
- No SSH or shell execution
- Credentials only via environment variables
- Tests for all new tools
- Tool naming: `tailscale_<domain>_<action>`

## Documentation

- All documentation MUST use generic placeholders only (see CLAUDE.md Security section)
- No real tailnet names, device IDs, API keys, or internal topology in any file
- Use `your-tailnet-name`, `your-api-key-here`, `example.com`

## Review

- All PRs require code review before merging
- Tests must pass
- Documentation must be updated (especially README.md)
- CHANGELOG.md must be updated before tagging/releasing

## After Merge

Branch and worktree cleanup is mandatory after PR merge to prevent drift.
