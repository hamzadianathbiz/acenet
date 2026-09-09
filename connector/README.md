# Native account connector

This runner connects the ACENET Cloudflare task queue at https://ace-acenet.pages.dev to your local Codex ChatGPT login. No OpenAI token is exported or uploaded. `BRIDGE_TOKEN` is a separate ACENET pairing credential stored in private `config.json`.

```
codex login status
# If not logged in with ChatGPT:
codex login
python3 projects/acenet/connector/bridge.py --config projects/acenet/connector/config.json
```

The command above is the manual developer route. Keep the process running and the computer awake. The guided helper described below installs a startup entry instead. Hamza’s older manually launched workspace connector is not converted automatically.

The default setup is now one command: select ChatGPT or Claude in ACENET, choose Set up on this computer, copy the command into Terminal or PowerShell, and complete native sign-in. Public `install.sh` and `install.ps1` automatically download the helper, verify the bundle SHA-256 pinned at build time, and forward the single-use pairing code and provider selection to setup.py. No manual ZIP handling or second code/provider prompt. This is a simplified local installation, not browser-only execution. The optional downloadable ZIP flow remains in a collapsed fallback.

Thirty connector tests pass, including successful bootstrap argument forwarding, invalid-code rejection and corrupt-bundle rejection. Live browser command generation, Python pairing and native runner auto-return pass; a clean-device full installer and Windows execution remain unverified. Do not paste the temporary setup command into public messages; it contains a private ten-minute pairing code.

Mac installs per-user files under `~/Library/Application Support/ACENET` and startup config at `~/Library/LaunchAgents/com.ace.acenet.plist`. Windows preview uses `%LOCALAPPDATA%\ACENET` and `ACENET.cmd` in the user Startup folder. No administrator privileges are requested. To disable startup, unload the Mac launch agent or move the Windows startup file out of Startup; preserve the private config and run logs if needed. Run `setup.py --no-autostart` to start a background runner without a startup entry. The runner uses an OS lock to prevent duplicate processes for the same configuration.

The helper requires network access to ACENET, the selected provider, and Astral’s Python runtime distribution. Mac may ask for confirmation before opening a downloaded script. Windows setup is preview and has not been exercised on real Windows hardware.

Tasks are claimed once. The connector invokes the local harness in an isolated directory. Codex is forced to ChatGPT authentication, and API-key/access-token override environment variables are removed from child jobs. Astra and Luna keep their requested model IDs. API failure fallback is never used. When allowance or account access is unavailable, the task fails visibly. Do not claim exact plan-credit debits from CLI token usage.

Progress links each execution call to its actual blueprint step. Local `runs/` preserves prompts, model events, outputs and review evidence. The cloud receives only run progress and outputs, never Codex login files. Generated code is not executed. Cancellation terminates the local job process group; an in-flight request may consume plan allowance.

`python3 package.py` rebuilds the downloadable bundle; Vercel's local `prepare.mjs` invokes it automatically. Configuration and logs are excluded from the archive.

## Separate users and Claude preview

Create your own ACENET account and pair the helper with its temporary code. Never distribute the owner's config. Every config grants access only to its associated workspace, but it is still a secret. The current release does not offer per-connector token rotation.

For Claude, install the current official binary and run `claude auth login` directly. The connector checks `claude auth status`; an API-key login is not reported as a subscription connection. It never reads or transfers OAuth credentials. Calls use native `claude -p` with restricted mode, explicit read-only MCP permissions, no file/shell tools, an isolated working directory, JSON schema output and no session persistence. Auth methods in the binary are not modified. Claude extra usage is controlled in the provider account, not by ACENET; disable it there to avoid overage charges. Review https://code.claude.com/docs/en/legal-and-compliance before using or hosting Claude Code.

Claude-only routing uses Opus for planning/review and Haiku for execution. Actual model IDs reported by Claude Code appear in completed activity rows. Native subscription detection and a live structured-output response from `claude-haiku-4-5-20251001` were verified on 2026-09-06. Full Opus/Haiku orchestration remains preview. Gemini is not implemented. No provider is silently substituted when an explicitly selected subscription is unavailable.

## Local open-model body

The current helper includes `local_models.py` and `local_inference.py`. It detects chat models from Ollama on IPv4 loopback port 11434 and LM Studio on port 1234. No remote endpoints, proxy environment variables, redirects or shell model-install commands are accepted by this flow. An existing helper needs to be downloaded and paired again once to gain discovery support.

In the web app, **Models → Use model** saves a private per-account selection. **Download & use** supports the two explicit Qwen3 starter downloads through Ollama's streaming pull API. A management action is claimed once, shows per-layer progress, and only becomes selected after fresh discovery confirms the installed model. Failed or disconnected actions require an explicit retry. No model downloads happen merely from opening the picker.

Ollama inference uses the native schema-output API with `truncate: false`, bounded context and output, and checks Modelfile metadata. LM Studio uses its loaded-model context metadata and strict schema output. Unsupported context sizes and incomplete outputs fail rather than dropping source or silently switching models. Models labeled as remote/cloud are rejected. Real model generation and real large downloads remain unverified; fixture coverage is documented in ../VALIDATION.md.

During hosting errors, the runner uses exponential retry backoff and honors bounded Retry-After for 429/503 responses. Cloudflare requests identify as ACENET/1.0 because its edge rejects the default Python urllib user agent. New bundles pair only with https://ace-acenet.pages.dev. Existing invited users must create an account on the fresh Cloudflare workspace and pair the new helper; old Vercel records remain preserved but are not imported. The owner runner was moved with a private backup of its original configuration.

## Account apps (previous deployed release, 7 September 2026)

Current helpers enable Codex account apps with write approvals retained and destructive tools disabled. Claude uses restricted mode and exact read-tool permissions in `CLAUDE_READ_TOOLS`; unknown tools still need native permission and can fail in unattended execution. No broad MCP wildcard or permission bypass is enabled. Connector research uses the selected provider only. Planner prompts pass relevant retrieved facts/links to open-model bodies.

Native Calendar metadata reads succeeded through both Codex/Luna and Claude/Haiku. Other individual operations remain unverified. Connector metadata in activity includes only names and completion/failure/permission status, after the native model call returns. Raw event logs remain local; task-relevant retrieved content can appear in stored blueprints/results. The capability heartbeat is not proof that every provider app is available or permitted.

## Hosted free body through OpenRouter

`openrouter_inference.py` uses the user's browser-authorized OpenRouter account for explicit free variants. The helper advertises `openrouter_capable`; old helpers cannot start these tasks. The active job receives only a local config path, then fetches the OpenRouter key into memory through a tenant-authenticated active-claim endpoint. The key never enters saved task config, prompts or event logs. Hosted generation is direct from the helper to OpenRouter and does not hold the Cloudflare Coordinator open during inference. Pricing is revalidated before every call, with zero price ceilings and no fallback. Context overflow, rate limits, incomplete JSON and invalid schemas fail explicitly. No model download occurs.

Live catalogue and deployed browser flow have been checked; authenticated provider generation awaits user authorization. The shared Harness constructor now admits Claude/OpenRouter backend names only when an explicit provider adapter is supplied; the default API provider still rejects them. This also fixes the previously untested full-Claude-run constructor path.

## Adaptive release (8 September 2026)

Live: Pages `ab7d27d0`, Worker `58ee3ca1-b812-4715-a240-92381e46d466`. Helpers advertise `harness_version: 2`; the updated server blocks version 1 from claiming adaptive tasks. Owner helper was restarted while idle and its online version-2 heartbeat verified. Other users must rerun setup once.

`harness/economy.py` implements direct Astra for small tasks and body draft plus one Astra check for larger tasks. `model-instructions.md` reduces native prompt overhead; tools are enabled only for tasks identified as requiring them. Native tool results are passed to the judge, and to open-model bodies after native research. No repeated repair loop or silent paid fallback is enabled.

`permissions.py` bridges individual Claude MCP permission requests into expiring local request files. Bridge progress exposes the exact request to the authenticated workspace, and relays one approval or denial back to the native callback. Unknown, expired and rejected requests fail closed. Native organization restrictions can still deny execution. Codex native approval-required writes remain unsupported; no external write tools are automatically authorized.

40 connector tests pass. See `../VALIDATION.md` for the 105-check combined result, live read-only connector evidence, document tests and measured cost benchmark. Full Claude-only orchestration and real OpenRouter generation remain unverified.
