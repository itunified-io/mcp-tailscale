---
name: tailscale-acl-management
description: Manage Tailscale ACL policy — view, edit, validate, test, preview, drift detection against Source of Truth
---

# Tailscale ACL Management

Workflow skill for managing the Tailscale ACL policy including viewing, editing, validating, testing, previewing changes, and detecting drift against the Source of Truth file.

---

## Source of Truth (SoT)

The canonical ACL policy is stored as `tailscale/acl-policy.hujson` in the private infrastructure repo. This file is the intended state — the live Tailscale ACL should match it.

---

## Workflow 1: View Current Policy

1. Call `tailscale_acl_get` to retrieve the live ACL policy.
2. Display formatted sections:
   - **Groups**: group name → members
   - **ACL Rules**: src → dst, action
   - **Tag Owners**: tag → owners
   - **Auto Approvers**: routes, exit nodes
   - **SSH Rules**: src → dst, users
   - **Tests**: src, accept/deny targets

---

## Workflow 2: Drift Detection (Compare Live vs SoT)

1. Read the SoT file: `tailscale/acl-policy.hujson` from the infrastructure repo.
2. Fetch the live policy: `tailscale_acl_get`.
3. Compare the two policies and report:
   - **🟢 IN SYNC**: Live matches SoT exactly.
   - **🟡 DRIFT DETECTED**: Show specific differences (added/removed rules, changed groups, new tags).
   - **🔴 CRITICAL DRIFT**: Major structural changes (missing groups, removed access rules).

Drift detection is also used by the scheduled `tailscale-health-check` agent.

---

## Workflow 3: Edit Policy (SoT-First Workflow)

1. Edit `tailscale/acl-policy.hujson` in the infrastructure repo (the SoT).
2. Validate syntax: `tailscale_acl_validate` with the updated policy.
3. Preview changes: `tailscale_acl_preview` to show what changes vs live.
4. Run ACL tests: `tailscale_acl_test` to verify access rules against test cases.
5. **Require explicit user confirmation** before applying.
6. Apply to live: `tailscale_acl_set` with the updated policy.
7. Verify: `tailscale_acl_get` to confirm the live policy matches.
8. Commit the SoT change to the infrastructure repo (feature branch + PR).

---

## Workflow 4: Emergency Live Edit (Bypass SoT)

Only for urgent access changes that cannot wait for the full SoT workflow:

1. **Require explicit user confirmation** that this is an emergency override.
2. Apply directly: `tailscale_acl_set` with the modified policy.
3. Immediately update the SoT file to match the live state.
4. Flag that the SoT was updated retroactively.

---

## Workflow 5: Run ACL Tests

1. Call `tailscale_acl_test` to run the test cases defined in the ACL policy.
2. Report results:
   - Tests passed ✅
   - Tests failed ❌ with details (user, expected access, actual result)
3. Suggest running tests after any ACL changes.

---

## Rules

- ACL changes affect the entire tailnet — always validate and preview before applying.
- **SoT-first**: Edit the file first, then push to live. Never the reverse (except emergencies).
- ACL replacement is a full policy swap — always show the diff of what changes.
- Require explicit user confirmation for `tailscale_acl_set`.
- Suggest running ACL tests after any changes.
- Drift detection runs as part of scheduled health checks.

---

## Key Tools

- `tailscale_acl_get` — retrieve current live ACL policy
- `tailscale_acl_set` — replace live ACL policy (requires confirm)
- `tailscale_acl_validate` — validate policy syntax
- `tailscale_acl_preview` — preview changes without applying
- `tailscale_acl_test` — run ACL tests against current policy
