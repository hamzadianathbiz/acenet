# ACENET setup without downloads

Status: wontfix (hosted-runner proposal deferred by user)
Updated: 2026-09-07

User request: no downloads, minimal setup, preserve subscription billing. This hosted architecture is not implemented or deployed. Hamza selected "Keep hosting strictly free; retain a simplified local helper." Production uses a one-command local bootstrap instead. No paid resources have been activated.

## User experience

1. Create an ACENET account or sign in.
2. Choose a provider.
3. Complete the provider's official sign-in in the browser. ChatGPT device authentication can require enabling device-code login in account security settings and entering a one-time code.
4. Return automatically to the task composer when authenticated. ACENET runs tasks server-side and streams the existing per-step model activity. No terminal or helper ZIP for users.

Remember each connection until revoked or expired. Offer a visible Disconnect action. Treat an ACENET account and a provider subscription as separate identities; provider sign-in alone must not authorize another ACENET workspace.

## Verified supported building blocks

- Installed Codex CLI is 0.153.4, with app-server support. Official app-server documentation describes managed ChatGPT OAuth, account/login/start with chatgptDeviceCode, user-facing verification URL/code, login completion notifications, account/read and account/logout. Use these interfaces, not reverse-engineered token endpoints. Account entitlement still determines Astra/Luna availability. No API fallback.
- Anthropic's current hosted-Claude-Code terms allow platforms to run the unmodified binary when the platform agrees to Commercial Terms and the end user authenticates through a built-in method. This is distinct from adding a third-party Claude.ai OAuth integration, which the same page prohibits. Keep Claude preview until the actual hosted native sign-in and complete workflow are validated. Do not collect Claude session tokens into the ACENET API.
- Cloudflare Pages/Workers/SQLite alone cannot run these native programs. Cloudflare Containers requires Workers Paid, $5/month plus metered usage. No Docker executable is currently available in the development environment; container build and runtime tests remain prerequisites.

## Proposed implementation

Keep Pages, private accounts, state storage and the task activity UI. Add one isolated native runner container per authenticated tenant, created on demand and stopped after inactivity. Derive its ID from server-side identity only. The public API exposes explicit connect/status/disconnect/task actions, never arbitrary shell commands or public app-server access.

ChatGPT first: run Codex app-server inside the user's container; relay only public sign-in fields/status to that user's browser. Let native Codex own credential refresh. Run the existing Astra/Luna workflow in the same isolated environment. Keep actual model identifiers visible.

Credential persistence is a deployment prerequisite: Cloudflare container disks are not assumed durable. Define and test encrypted per-user persistence and disconnect cleanup before promising remembered connections. Provider credential files never enter activity events, stdout logs, Pages assets or helper archives. Never reuse the owner's provider session for other users.

Avoid the current 15-second native helper poll in hosted mode: coordinator wakes the runner only for authentication or queued work. UI polling must not keep an idle container running. Sleep after work completes, with a bounded login window, per-user task concurrency and explicit execution time limits. Stopping must preserve committed task state before container shutdown.

Open-source bodies without user downloads need hosted inference or server-side model installation. The existing Ollama/LM Studio loopback integrations cannot access a user's computer from a cloud container. Do not present them as working in hosted mode. Evaluate hosted OSS separately and disclose its usage billing; retain local mode only as an optional advanced route.

## Cost illustration, not a quote or cap

Cloudflare current rates: 25 GiB-hours memory, 375 vCPU-minutes and 200 GB-hours disk included in $5/month. Additional memory $0.009/GiB-hour, CPU $0.072/vCPU-hour, disk $0.000252/GB-hour.

For five users each keeping a standard-1 runner active 30 minutes/day for 30 days: 75 total container-hours, 4 GiB memory, up to 0.5 vCPU active and 8 GB disk each. Estimated base + memory + worst-case CPU + disk is approximately $9.83/month, before other usage, persistent storage, startup overhead or hosted OSS inference. This assumes containers actually sleep between use; always-on containers cost materially more. Benchmark a smaller instance before selecting it. An app execution budget can limit work but is not a provider-enforced hard billing cap.

## Acceptance before activation

- Real native ChatGPT browser authorization in an isolated hosted account, with no local software and no API billing fallback.
- Successful Astra -> Luna -> Astra task after the browser closes, with correct model activity and downloads.
- Independent user sessions, simultaneous logins, cross-tenant request rejection, reconnect, logout/revocation, restart persistence, provider errors and subscription-limit behavior.
- Idle scaling verified through actual container lifecycle and metered usage. No UI heartbeat keeping compute alive.
- Hosted Claude only after native sign-in and terms acceptance are resolved; no implied universal subscription compatibility.
- Keep current production operational until hosted onboarding passes. Preserve existing accounts/history and local runner connections.

## Decision received

Hamza selected "Keep hosting strictly free; retain a simplified local helper." The implemented route keeps the free Pages/SQLite architecture and local native execution. The browser now generates a single Mac or Windows-preview command with the short-lived code and selected provider included. Bootstrap automatically downloads and checksum-verifies the helper, installs missing dependencies and opens native sign-in. Manual ZIP handling remains only as an optional fallback. No hosted containers or paid upgrades were activated.

## Sources checked 7 September 2026

- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/auth
- https://code.claude.com/docs/en/legal-and-compliance
- https://developers.cloudflare.com/containers/platform/pricing/
- https://developers.cloudflare.com/containers/platform/limits/
