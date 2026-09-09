# ACENET

Public source repository and project handoff. **Start with [current status](docs/STATUS.md), [project history](docs/CHANGELOG.md), and [validation](VALIDATION.md).**

## Fresh checkout

Requires Python 3.9+, a current Node.js version supported by Wrangler, and npm. Install dependency locks with `npm ci --prefix cloud` and `npm ci --prefix vercel`, then run `bash scripts/prepare.sh` and `bash scripts/check.sh`. Native provider apps are required only for actual model runs. Unit tests use fixtures.

Production deployment is manual: configure your Cloudflare account/bindings in `cloud/wrangler.plan.jsonc` and `cloud/pages/wrangler.jsonc`, provision the required secrets described in `cloud/README.md`, then deploy the plan Worker and Pages. Existing account IDs/name mappings refer to the ACE deployment; do not reuse them for another account. The default cloud/wrangler.jsonc is a retained API prototype, not production. No deployment credentials or automatic deployment workflow are included.

Historical workspace commands use `projects/acenet/` prefixes. In this standalone checkout, run from repository root and omit that prefix. All raw native task logs and sensitive operational evidence remain outside this repository.


Production app: **https://ace-acenet.pages.dev**

**Hosting, 7 September 2026:** live on Cloudflare Pages with private SQLite Durable Object storage. Hamza approved a fresh workspace because Vercel cannot export its quota-suspended store. The old 40 records remain untouched for later recovery. Existing invited users must create a new ACENET account and pair the updated helper. The owner password still works and the owner helper has been moved. No paid hosting upgrade was activated. Free-tier limits still apply; see `cloud/README.md`.

**Live update, 9 September:** Pages `ae02e441`, Worker `7ab077ce-36f1-40b7-bc50-b82f6679285a`. The main surface is a chat with same-conversation history; work details and cost are collapsed. Separate chats do not share memory.

Every normal turn follows Astra plan → open-model execution → Astra review, with at most one repair performed by the open model. Astra defines one to three ordered steps and acceptance criteria. No draft-first policy, direct-Astra shortcut or native executor fallback is used for new normal tasks. Explicit measured baselines still use Astra alone.

Connect ChatGPT for Astra and OpenRouter for a hosted executor, or select an available local model. OpenRouter automatically chooses an available zero-priced model with a published Hugging Face model reference when no selection exists. Public weights are not a blanket OSI license guarantee. Native account readers can retrieve connected sources under Astra's plan: ChatGPT uses Astra for retrieval; Claude uses a narrowly scoped Haiku source-reader. Deliverables, assembly and repairs remain with the open executor.

The pipeline and chat tests pass, but real OpenRouter inference remains unverified until an account is connected. The accessible owner workspace currently has no OpenRouter connection or local executor; missing setup stops before queueing/model spend. The installed helpers are version 3.

Submitting without an executor now opens a direct **Connect free models** dialog. OpenRouter sign-in uses a separate window, keeping the prompt, attachments and current chat in place. After connection, the pending message resumes once with automatic free-model selection. Closing setup or starting a new chat cancels automatic sending. No prompt or file is placed in OAuth URLs or browser storage.

## Start: your own account and subscription

1. Open **Sign in → Create account**. Use your email address; each account has a separate private workspace. Use a unique password (12 characters minimum) and save it; password recovery is not implemented.
2. In Account settings, choose ChatGPT or Claude and click **Set up on this computer**.
3. Click **Copy setup command**, paste it into Terminal (Mac) or PowerShell (Windows preview), and press Enter. Setup automatically fetches and verifies the helper, installs any missing runtime/provider app, and passes your temporary code and provider choice. Complete the official provider sign-in; no manual ZIP download or separate code entry is needed. This still installs local software and requires an awake computer. The downloadable helper remains an optional fallback. ACENET never asks for a provider password or OAuth token.
4. The app detects the connected runner automatically. The helper starts the runner now and at login; keep the computer awake while tasks run. The browser and setup window can close. Mac startup configuration is tested via an isolated fixture; Windows setup remains preview pending a real Windows-device test.
5. ChatGPT is required for Astra planning/review. Connect OpenRouter once for automatic free-model execution or choose an installed Ollama/LM Studio model. The source-provider selector chooses which native account retrieves connected data; it does not replace Astra.

**Provider status:** ChatGPT has a live verified plan-backed run. Claude is preview: native subscription detection and one live structured-output Haiku call pass; the full Opus/Haiku workflow has not yet been tested live. Gemini and other subscriptions are not implemented; the UI does not pretend they are connected. Subscription entitlements differ by account, and unavailable models fail visibly.

Codex execution forces ChatGPT authentication and never falls back to API billing. Claude runs the unmodified native binary using its own authentication; subscription and extra-usage billing follow the user's Claude settings. Disable extra usage in Claude if overage billing is unwanted. Native subscription login tokens are not collected, stored or proxied. OpenRouter uses a separate encrypted API connection described below. Native Claude use and any commercial hosting must comply with [Anthropic's terms](https://code.claude.com/docs/en/legal-and-compliance).

Email addresses are normalized to lowercase for registration and sign-in. Format validation is enforced in the browser and API; email verification and password reset are not implemented. Older accounts can still use **Existing username account** without losing their workspace.

Existing owner access remains under **Existing workspace owner**, using `vercel/access.md`. The owner's old history remains in preserved Vercel storage; the new workspace starts empty. Sign in again on Cloudflare. New users pair through random single-use codes that expire in ten minutes. Codes are stored hashed, redemption is serialized and rate limited, and the original authenticated tenant determines the resulting connector credential. New users cannot access the owner namespace.

## Hosted free models through OpenRouter

Open **Models → Connect OpenRouter**, sign in on OpenRouter, then choose a free model and **Use this model**. No model downloads, Ollama installation or API-key copy/paste is required. This is hosted inference: task content goes to OpenRouter and its selected provider. Your native subscription helper still runs planning/review and coordinates the task; existing users must rerun setup once to update it.

The picker reads the live OpenRouter catalogue and admits only explicit `:free` text models with all reported prices zero and adequate context. Calls recheck pricing, set zero prompt/completion/request/image price ceilings, disable provider fallbacks and truncation transforms, and never substitute a paid variant. Free capacity/rate limits can stop a task. Schema validation and planning-model review still apply; quality parity is not guaranteed.

OpenRouter uses browser PKCE authorization. Its user-controlled API key is AES-GCM encrypted in tenant-bound private storage, never placed in task records or browser account responses. The paired helper retrieves it in memory only with an active task claim. Disconnect removes the saved key and hosted-model selection; revoke the issued key in OpenRouter to invalidate it at the provider too. This separate OpenRouter API connection does not export ChatGPT or Claude login tokens. See [OpenRouter authorization](https://openrouter.ai/docs/guides/overview/auth/oauth) and [rate limits](https://openrouter.ai/docs/api/reference/limits).

## Add a local open model

1. Connect your subscription helper, then open **Models** in the header. Existing users must download and run the updated helper once; the older helper cannot discover local models.
2. Open Ollama or LM Studio on the same computer. Installed chat models appear automatically. Choose **Use model**; no endpoint or model-ID entry is needed.
3. If Ollama has no models, choose **Download & use** for Qwen3 4B (~2.5 GB) or Qwen3 8B (~5.2 GB). Progress is per model layer. ACENET selects the model only after Ollama confirms it is installed. Install Ollama first using the link if it is missing.
4. For LM Studio, download/load a model and start its local server. Current inference support needs LM Studio 0.4+ and a loaded model with enough context.
5. Write your task normally. The saved local model executes; the connected subscription plans and reviews. Choose **Use subscription body** to return to Luna/Haiku.

Other installed chat models are discovered automatically; compatibility and quality vary by model. A missing model, insufficient context or incomplete response stops the task visibly. Cloud-backed Ollama models are excluded. Downloading requires network access and disk space; inference uses the computer's memory/compute. Planning/review and private cloud history still use hosted services. This is not an entirely offline mode.

## Google Drive through your existing subscription

Open **Use Google Drive** in the task composer. Select the ChatGPT or Claude account where Drive is connected; paste a file/folder link or describe the files, and enter your task. **Check Drive access** makes a small read-only metadata request using that subscription. No separate Google sign-in, API key or OAuth project is needed when the native runner exposes your existing connection.

ChatGPT Drive search and Claude Drive recent-file listing were both verified through actual native runs on 8 September 2026. This proves metadata access, not universal file readability, full folder coverage or bulk ingestion. Provider permissions and available tools determine access. The app does not silently switch accounts. Claude selection uses its native Haiku/Opus workflow; ChatGPT uses Luna/Astra. Open bodies receive evidence from the selected native provider.

Drive-specific requests now require a recorded successful Drive tool result before the quality check; success from another connector does not count. Prompts require content reads for document analysis and explicit partial-coverage reporting. The helper still needs to be online. Your installed helper has been updated; other users should rerun setup once for these checks.

## Connected account apps

The updated helper enables native account tools for research. ChatGPT uses Codex apps with read approval rules, destructive operations disabled and shell execution disabled. Claude uses the unmodified restricted native runner with an exact allowlist of supported Gmail, Calendar, Drive, Airtable, Fathom, Exa and Notion read operations. Unknown operations, organization-required prompts and expired connector authorizations can still block a call. This is not blanket access to every connector shown in the provider website. No external write tools are pre-approved.

Choose the provider connected to the data you need. Accounts are not merged: a ChatGPT task uses its native apps; a Claude task uses its native connectors. Under the adaptive policy, open-model bodies receive actual results from a separate native research call, without provider credentials. The Astra check also receives tool evidence, so it can assess retrieved facts. Task activity shows connector names and statuses after each native model call returns; raw tool arguments/results stay in local logs, while relevant retrieved facts may be included in private task output and blueprint.

Existing users run **Set up on this computer** once again to update their helper. The Connections panel reports whether the helper supports this feature, not an authenticated inventory of every app. Live Calendar metadata reads passed through both native providers on 7 September 2026. Other connector operations are not individually end-to-end verified. Source: [Codex apps](https://learn.chatgpt.com/docs/enterprise/apps-and-connectors), [Claude MCP](https://code.claude.com/docs/en/mcp), [Claude permissions](https://code.claude.com/docs/en/permissions).

## Documents

The composer extracts searchable PDF, DOCX, XLSX, PPTX and text/code files in the browser. Each raw file can be up to 25 MB; combined extracted text is limited to 140 KB across up to 12 attachments. Oversized or unsupported files produce an explicit error. Scanned PDFs need OCR first; images are not supported. Spreadsheet extraction preserves cell coordinates, raw values and formulas, not workbook formatting or calculated date presentation. Successful attachments remain when another file fails.

## Quality and cost

The target remains Astra-like quality at one-tenth the cost; the v3 policy has no live economic benchmark yet. Neither universal quality parity nor that cost target is demonstrated. In the new paired coding benchmark, mixed execution cost **$0.1339596 API equivalent**, versus **$0.21187** for an independent Astra-only run: **$0.0779104 saved, about 37%**. Both passed the same five independent acceptance checks. This is one task, not a general quality or savings guarantee. The earlier policy had cost more than Astra alone; historical evidence remains in `harness/VALIDATION.md`.

New tasks use Astra planning, open-model execution and Astra review. Tasks needing connected data add a native source-read call directed by the plan. Original source is preserved; an oversized prompt is rejected, never silently truncated. A failed check gets at most one open-model repair and one additional Astra review, then stops if unresolved. Model review does not replace executed tests or human checks.

Large retrieved evidence now uses section audits instead of failing at the former 80 KB review limit. The new orchestrator extracts up to 48 sections of 24 KB through the open executor before drafting; Astra receives the derived findings for its final decision. Original source is preserved locally, and section coverage is recorded. This adds bounded calls and cost. Astra reviews derived findings, not every original source byte independently; quality parity remains unproven. Larger datasets still require splitting. This is not yet a resumable folder-ingestion system.

Failed, cancelled and unapproved tasks show recorded model spend but no traditional projection or dollar savings. A candidate is not a completed deliverable.

Completed tasks show recorded harness usage priced at published API rates, and an explicitly labeled Astra-only projection. New projections account for observed native prompt overhead where available. **Measure against an Astra-only run** optionally spends additional plan allowance on an independent baseline and replaces the projection with recorded usage. Direct Astra tasks show zero savings against themselves. Unknown usage or rates make savings unavailable. Subscription allowance is not an API bill: these dollar values are API equivalents, not cash refunds or exact plan-credit debits. Hosting, hardware and unreported tool charges remain outside the comparison.

Connector fixes pass actual tool evidence into the quality check and let the browser approve or decline individual Claude MCP requests. Provider and organization restrictions still apply; this does not guarantee access to every website connector. Existing helpers must be updated once; the new server rejects older helpers for adaptive tasks.

## Project layout

- `harness/`: local Python CLI, Codex / Responses / compatible-chat adapters, benchmark evidence.
- `app/`: shared ACE frontend and loopback Python web server. Run `python3 projects/acenet/app/server.py` from the vault; open http://127.0.0.1:8765. Local automatic mode uses Luna. Ollama and LM Studio can be selected manually here.
- `cloud/`: production Pages frontend and native-plan API backed by SQLite Durable Object storage. Deploy `wrangler.plan.jsonc` and `pages/wrangler.jsonc`; the older default config is a retained API-mode prototype.
- `vercel/`: shared plan/auth implementation plus retired deployment. Its homepage redirects to Cloudflare; its API returns 410 without accessing old storage.
- `connector/`: native provider runners, guided installer, Mac/Windows launchers and downloadable helper packaging.

Generated source in `vercel/lib` and `vercel/public` is a deployment snapshot of shared sources. Run `cd projects/acenet/vercel && node prepare.mjs` after shared changes. Only this standalone directory is uploaded. Existing ACE sites and private vault sources are excluded.

## Boundaries

This version produces text and downloadable code/files. It can research through available native account connectors. It does not execute generated code, modify repositories, deploy generated apps, or send messages. Attach source text when connector access is unavailable. User accounts have separate storage prefixes and serialized Durable Object transactions; authenticated server identity determines the tenant, never a request parameter. History lists the latest 100 runs; older records remain in private storage. Workspace state survives deployments. Stop prevents subsequent stages; a provider call already in flight may still be billed.

Provider credentials remain in native local login stores. ACENET passwords use salted scrypt hashes. One-day opaque sessions are stored as hashes in private Cloudflare storage; cookies are HttpOnly, Secure and SameSite=Strict, with origin/CSRF checks for mutations and session invalidation on logout. Authentication attempts are rate limited; account creation is serialized to prevent username races. APP_PASSWORD retains owner access, STORAGE_KEY signs tenant-specific connector credentials, and BRIDGE_TOKEN retains the existing owner runner. Keep these server secrets private.

Account recovery, per-connector credential rotation, account deletion/export and managed identity-provider SSO remain follow-up work. Hosting and storage usage belong to the app operator separately from each user's model subscription. This is an early self-service release, not a claim of universal subscription compatibility.

## Verification

See `VALIDATION.md` for current results and limitations.

## Chat context

Follow-up turns preserve previous user messages, accepted answers/artifacts and attachments from the same workspace/chat. New chat starts without that history. A private parent-run lookup binds continuation to the authenticated tenant; supplied conversation history is not trusted. Existing task/source size limits still apply; long conversations fail explicitly rather than silently discard earlier context. Unapproved drafts are not inserted as accepted assistant answers. Connected-source raw caches and cross-chat memory are not implemented.

Minimal chat interaction was informed by Pi's documented harness approach: https://github.com/earendil-works/pi/tree/main/packages/coding-agent. This app does not embed Pi or use it to proxy subscription tokens.
