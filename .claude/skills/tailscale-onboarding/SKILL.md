---
name: tailscale-onboarding
description: New device onboarding workflow — create auth key, authorize, set tags, configure routes, verify connectivity
---

# Tailscale Device Onboarding

Guided multi-step workflow for adding a new device to the tailnet. Covers auth key creation, device authorization, tag assignment, route configuration, and connectivity verification.

---

## When to Use

Trigger this skill when the user wants to:
- Add a new device or server to the tailnet
- Set up a new node (workstation, container, VM, exit node, subnet router)
- Onboard a fleet of similar devices

---

## Workflow: Guided Onboarding

### Phase 1 — Gather Requirements

Ask the user for:
- **Device purpose**: server, workstation, exit node, subnet router, CI runner
- **Desired ACL tags**: e.g., `tag:server`, `tag:prod`, `tag:admin`
- **Subnet routes to advertise** (if subnet router): e.g., `10.10.0.0/24`
- **Exit node**: should this device serve as an exit node?
- **Persistence**: ephemeral (containers/VMs/CI) vs persistent (physical servers, workstations)

### Phase 2 — Create Auth Key

Based on gathered requirements:

1. Determine key options:
   - Fleet deployment: reusable key
   - Single device: single-use key
   - Containers/CI: ephemeral key
   - Automated setup: preauthorized key
2. Set appropriate tags from Phase 1.
3. Set expiry (default 90 days; ephemeral devices: 1 day).
4. Call `tailscale_key_create` with the options.
5. **⚠️ Display the key value prominently** — warn user to save it immediately.
6. Show the install command:
   ```
   tailscale up --authkey=<key>
   ```

### Phase 3 — Wait for Device

1. Instruct the user to run the install command on the target device.
2. Call `tailscale_device_list` to check for the new device joining.
3. When found, show device status: IP, OS, online, pending authorization.
4. If not preauthorized: call `tailscale_device_authorize` to authorize it.

### Phase 4 — Configure Device

1. **Set ACL tags**: `tailscale_device_tags_set` with tags from Phase 1.
2. **If subnet router**:
   - `tailscale_device_routes_get` — verify advertised routes.
   - `tailscale_device_routes_set` — enable requested subnet routes.
3. **If exit node**: enable the exit node route via `tailscale_device_routes_set`.
4. **Set posture attributes** if needed: `tailscale_device_posture_set`.

### Phase 5 — Verify Connectivity

1. `tailscale_device_get` — confirm device is online, correct IP, tags applied.
2. `tailscale_device_routes_get` — verify routes are enabled.
3. `tailscale_acl_test` — verify the device can reach expected resources (if test cases exist).
4. If split DNS configured: note that DNS resolution should work for configured domains.

### Phase 6 — Onboarding Report

Generate a summary:

- **Device**: name, Tailscale IP, OS
- **Tags**: applied tags
- **Routes**: enabled subnet routes / exit node status
- **ACL**: access verification results
- **Auth key**: type used (recommend cleanup for single-use keys)
- **Next steps**: add to monitoring, update documentation

---

## Rules

- Auth key value is shown only once — warn the user to save it immediately.
- Tag changes affect ACL permissions — show the potential impact.
- Route changes affect network topology — list affected subnets.
- Preauthorized keys are recommended for automated deployments.
- Ephemeral keys are recommended for containers and CI runners.
- Always verify connectivity after configuration.
- If the device doesn't appear within a reasonable time, suggest checking the install command and network connectivity.

---

## Key Tools

- `tailscale_key_create` — create auth key for the new device
- `tailscale_device_list` — check for new device joining
- `tailscale_device_get` — verify device details
- `tailscale_device_authorize` — authorize pending device
- `tailscale_device_tags_set` — set ACL tags
- `tailscale_device_routes_get` / `tailscale_device_routes_set` — configure subnet routes
- `tailscale_device_posture_set` — set posture attributes
- `tailscale_acl_test` — verify access rules
