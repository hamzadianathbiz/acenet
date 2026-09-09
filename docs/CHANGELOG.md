# ACENET project history

Dated project entries copied from the shared workspace on 9 September 2026. Historical status and assumptions may be superseded; see STATUS.md. Private task data and credentials are excluded.

## [2026-07-14] migrate | ACENET Phase 0 scaffold built
Created `~/Desktop/acenet` repo (code lives outside the vault per vault rule). Full v1 pipeline implemented: frontier plan → open-weight execute → frontier verify (terse rubric) → retry ≤2 → frontier escalate, with a per-run cost ledger pricing every call from the live Vercel AI Gateway model list and computing a frontier-only counterfactual. Executor bench harness + 5 synthetic private-capital extraction tasks included. Blocked on: AI Gateway API key (Hamza). Plan: [[projects/acenet/plan.md]].


## [2026-09-05] session | ACENET Astra/Luna harness built and benchmarked

Built `projects/acenet/harness/`: standard-library Python CLI with Astra blueprint
and review, Luna execution/repair, compatible local-model and Responses API adapters,
full original-context handoff, validated criteria/dependencies, bounded calls,
artifact export and a token ledger. Added an actual independent Astra baseline.
The July external code path is absent; corrected the historical plan and home link.

Twenty harness tests pass. A live synthetic coding run was accepted after one repair;
its nine generated tests and five independent checks pass. The Astra baseline passed
13 generated tests and the same five independent checks. Mixed cost was $0.8916208 vs
$0.147976 at dated standard API-equivalent rates, 6.03x more expensive, not 10x cheaper.
An earlier rejected mixed run cost an additional estimated $0.937729. Neither general
quality parity nor savings is established. Details: `projects/acenet/harness/VALIDATION.md`.

Fixed a live-discovered mismatch by exposing the deliverable schema to the planner.
API/local adapters have mocked transport coverage but no live verification. No generated
code was applied to other projects and nothing was deployed. Wiki mechanical checks
found no link/index/frontmatter defects; existing stale/source flags remain. No broad
semantic wiki lint or unrelated cleanup was performed.


## [2026-09-05] session | ACENET task app deployed on Vercel

Built an ACE/Oxide chat-first frontend, local Python server, and hosted Astra blueprint/body execution/Astra review runner. Production: https://acenet-zeta.vercel.app. Private Vercel Blob stores run state and encrypted keys. Automatic routing selects the lowest configured token estimate among Astra-eligible context-fitting bodies; Luna is available with the OpenAI key, Qwen joins when Cloudflare Workers AI credentials are configured, and custom HTTPS bodies are supported manually. Cloudflare Worker source is retained but was not deployed: write calls returned authentication error 10000 and Hamza chose Vercel.

Hosted runner and adapter have 13 automated tests; local web server has 9 and underlying harness has 20. Local and production browser checks passed. Live hosted model calls remain unverified without user API credentials. Keep the browser open to advance Vercel calls; interrupted calls fail visibly rather than being replayed. Tenfold savings and quality parity are not established. Setup, architecture and evidence: projects/acenet/README.md and VALIDATION.md.


## [2026-09-05] session | ACENET switched to ChatGPT plan execution

Hamza required account connection and plan allowance rather than API credits, plus a simpler screen and precise task/model activity. Deployed the plan-only Vercel queue and a Mac connector using the existing Codex ChatGPT login. OAuth credentials remain on the Mac. Default Astra/Luna tasks cannot use the legacy API route; child jobs force ChatGPT authentication and strip API overrides. Live run 27b03ad2-9149-4fa4-a405-74eb44cbbbfe completed all three stages and produced an accepted 24-word, three-item handoff checklist. The browser was closed during execution; the Mac connector continued.

Seven Vercel and two connector tests pass. Production browser shows the connected-plan status, exact blueprint task/model/status rows, and desktop/mobile layout. Fixed lock release before response completion and percent-encoded private storage paths during live verification; preserved two unexecuted test records with explicit failure explanations. Connector is currently running, not installed as a launch-at-login service. Setup and limitations: projects/acenet/README.md and connector/README.md. Exact plan-credit debits, general quality parity and tenfold savings remain unmeasured.


## [2026-09-06] session | ACENET plan-account production verification complete

Verified https://acenet-zeta.vercel.app after the final download routing fix. Connected ChatGPT-plan status is live; run 27b03ad2-9149-4fa4-a405-74eb44cbbbfe shows completed Astra planning, Luna execution and Astra approval. Answer downloads with attachment headers. Mobile layout and page JavaScript checks pass. Private history and connector credentials return 401 anonymously; internal files return 404. Pairing configuration is absent from the downloadable connector archive. Updated setup and validation docs; the Mac connector must remain running and awake, with no launch-at-login installation.


## [2026-09-06] session | ACENET private accounts and subscription runners

Deployed self-service account registration and login at https://acenet-zeta.vercel.app with isolated histories, downloads and runner credentials. Preserved owner access through the existing password option. Ten Vercel and four connector tests pass. Live signup/isolation/logout/owner-output/mobile checks pass without new model calls. Claude native runner is preview and unverified with a live account; Gemini and other subscriptions are not implemented. Provider credentials stay in native apps. Details and limitations: projects/acenet/README.md and VALIDATION.md.


## [2026-09-06] session | ACENET guided connections for invited users

Deployed guided native subscription onboarding to https://acenet-zeta.vercel.app. One-use temporary codes replace manual config transfer; helper bundles install prerequisites and configure startup. Eighteen server tests and nine connector/setup tests pass. Live fresh-account pairing, real native login detection, automatic dialog close, code replay rejection, downloads and mobile checks pass. One separate live Claude Haiku structured response passed; full Claude workflow and Windows remain preview. Final deployment dpl_AGf297uJPJsDpWRP7Q1ZwvUwWSdX. Source and limits: projects/acenet/README.md and VALIDATION.md.


## [2026-09-07] session | ACENET open-model setup deployed; hosting storage suspended

Deployed Models picker, automatic Ollama/LM Studio discovery, persisted body selection and explicit Qwen starter downloads to https://acenet-zeta.vercel.app. Deployment dpl_GVpPmjXNYtcc6SEc5fbq5KZQPHom. Twenty-nine server and twenty-seven connector tests pass, plus isolated desktop/mobile browser integration using actual routing/bridge code and simulated model services. Both inference adapters pass HTTP fixture checks; no real OSS inference/downloads were performed. Live assets and helper ZIPs match source.

Live account validation uncovered Vercel private Blob quota suspension: metadata reports limits-exceeded-suspended and usageQuotaExceeded true on Hobby. Accounts/history/tasks are currently unavailable. Added clear503 responses and client backoff; preserved existing40 blobs without new stores or resets. The normal heartbeat/lock write pattern exceeds Hobby limits, so backoff alone does not solve it. Paid plan/trial change awaits owner approval; future hot-state migration needs to retain all tenants/history. Details: projects/acenet/VALIDATION.md and .scratch/acenet/issues/storage-quota.md.


## [2026-09-07] session | ACENET live on Cloudflare with fresh private storage

Published https://ace-acenet.pages.dev using direct Pages-to-Coordinator SQLite Durable Object binding. Worker acenet version 827ee607-d59a-4521-a3c5-16c95aa236e4; Pages deployment 73fbea4b. Hamza approved fresh initialization after Vercel export failed; 40 old records remain untouched. Twelve live API check groups, real Chrome onboarding/native helper detection, desktop/mobile inspection, bundle hashes, owner login and connected helper passed. No real model calls were made for this migration. Twenty-seven connector tests and three new storage/migration tests pass; shared server/local workerd verification passed during preparation. Fixed Cloudflare 1010 rejection by identifying pairing/polling requests as ACENET/1.0. Combined idle UI polling and transactional SQLite replace Blob lock writes.

Old Vercel root now redirects with 307; API returns 410 before storage access, verified on deployment dpl_BvtJRh3nUKmJM5U2Qemz8trETbFz. Owner configuration backed up privately, runner moved. No paid hosting plan activated. Free limits remain finite; actual billing metadata could not be read with current OAuth scopes. The workers.dev hostname still fails TLS, but production Pages bypasses it. Existing invitees create new accounts and pair updated helpers; old-history recovery remains external. Docs: projects/acenet/cloud/README.md, VALIDATION.md and .scratch/acenet/issues/storage-quota.md.


## [2026-09-07] session | ACENET requires sign-in before showing workspace

Published Pages deployment 84d61a14 to https://ace-acenet.pages.dev. Anonymous visitors see the welcome/account form first; the workspace stays hidden even while bootstrap is pending. Escape cannot dismiss the unauthenticated form. Existing sessions enter normally; logout and a rejected session hide the workspace again. Live registration, sign-in, session persistence, expiry and mobile checks pass with no JavaScript errors.


## [2026-09-07] session | ACENET setup reduced to one command and native sign-in

Published Pages de16c653. Hamza prioritized strictly free hosting and accepted a simplified local helper. Added generated Mac/Windows-preview setup commands, checksum-verified automatic bootstrap downloads, provider/code forwarding and an optional collapsed ZIP fallback. New users see setup before advanced settings. Thirty connector tests and live Chrome command variants, mobile inspection, public bundle/script hashes, actual Python pairing and native helper auto-return pass. No model calls or paid upgrades. Clean-device installs and Windows execution remain unverified. Setup still installs local software automatically; no claim of browser-only subscription access.


## [2026-09-07] session | ACENET collects email for new accounts

Deployed email/password signup and sign-in to Pages 2a6f34ab and Worker 8f83ef56-fb6b-4ed7-b5ad-d8261a37c97b. New registrations require valid normalized email; existing username and owner access remain intact. Six runtime tests plus live browser and twelve API smoke groups pass. Email ownership verification is not implemented.


## [2026-09-07] session | ACENET completed tasks show projected dollar savings

Published Pages 787512a3 with three cost cards and calculation details. Traditional projection estimates one Astra response from source/final output; harness estimate sums recorded calls with cache and long-context pricing. Extra costs and unavailable usage are explicit. Updated helper preserves Claude native API-equivalent totals; old Claude data may remain unavailable. Five new calculator tests, all eleven runtime tests and thirty connector tests pass. Deployed desktop/mobile fixture checks pass without writing task records or invoking models. Monetary figures are estimates, not subscription invoices or demonstrated savings.


## [2026-09-07] session | ACENET native connector research deployed

Enabled native Codex account apps and restricted Claude read tools; added connector names and statuses to model activity and helper capability to Connections. Live Calendar metadata reads passed through both subscriptions. 36 Python and 26 Node tests pass; deployed browser and helper bundle integrity checks pass. Pages `90221078`, Worker `5000c9c1-546b-4769-abb0-0b920d99e20e`; owner helper restarted while idle and verified online with both providers. Other users rerun setup once. Universal website connector access, cross-provider aggregation and browser permission callbacks are not implemented; native provider availability and explicit read permissions remain limits. See `projects/acenet/VALIDATION.md`.


## [2026-09-08] session | ACENET OpenRouter hosted free models deployed

Added browser PKCE connection, tenant-bound encrypted OpenRouter key storage, live free-model selection, active-claim credential retrieval and direct helper inference with zero price ceilings and no fallback. Models run remotely without local downloads; the native subscription helper still plans/reviews. Pages `3dfc6b88`, Worker `6065cf63-cea5-4a4d-b36c-575825343ec3`. Owner helper updated and verified capable. 40 connector, 21 harness and 33 current Node tests pass; two retired Vercel tests still expect responses from the intentional 410 API. Live catalogue, authorization start, browser callback/selection fixtures and bundle hashes pass. Real OAuth completion and generation await user connection. Fixed Workers redirect-mode compatibility and custom-provider constructor rejection. Details: `projects/acenet/VALIDATION.md`.


## [2026-09-08] session | ACENET upload, cost and connector fixes pending deployment

Implemented browser extraction for searchable PDF/Office/text, adaptive body draft plus Astra check (direct Astra for small tasks), native tool evidence transfer and per-request Claude connector approvals. Added optional independent Astra baseline measurement and transparent dollar-equivalent comparison. 105 automated checks pass; six real upload formats passed browser tests. Paired native coding benchmark saved $0.0779104 API equivalent (36.77%); both outputs passed five independent acceptance checks. Actual Calendar read evidence now passes Astra review; a real Claude MCP permission callback also succeeded.

Not live: automatic approval review rejected the final browser/deployment workflow due account usage limit (retry message 7:07 PM). Worker dry-run/build passed; production remains Pages 3dfc6b88 and Worker 6065cf63-cea5-4a4d-b36c-575825343ec3. Need final UI fixture rerun, Worker/Pages deployment, idle owner-helper update/version-2 heartbeat and canonical PDF/CSP/task verification. Full Claude orchestration, non-Calendar connector operations and actual OpenRouter generation remain unverified. See projects/acenet/VALIDATION.md and ADAPTIVE-BENCHMARK.md. No external records/messages changed.



## [2026-09-08] session | ACENET adaptive fixes deployed and verified

User requested retry; automatic approval succeeded. Deployed Worker 58ee3ca1-b812-4715-a240-92381e46d466 and Pages ab7d27d0. Six actual file formats passed extraction on canonical production, including PDF worker/CSP. Permission/cost browser fixtures fully pass. Canonical assets and helper ZIP hashes match the tested build; bundles contain new modules and exclude pairing config. Restarted only the idle identified owner helper (PID 34094), verified online version 2. Other users must update their helper once.

Real authenticated task 3bc1b6e4-ee27-4382-8fc0-291254751182 consumed attached invoice text, used exactly Luna draft plus Astra judge and returned the correct answer with accepted_by_astra status. Evidence: projects/acenet/app/qa/adaptive-v2-live-smoke.json. Previous 105 automated checks and 36.77% paired coding benchmark remain the validation basis; no universal 10x/parity claim. Other connector operations, full Claude orchestration and actual OpenRouter generation remain unverified. No external messages or third-party records changed.



## [2026-09-08] session | ACENET installed-helper failure fixed

User screenshot traced to missing economy.py in their email-account installed helper, distinct from owner workspace runner. Installer copied only four old modules despite ZIP containing new files. Setup now validates/copies all eight runtime dependencies; actual packaged-install import regression test added. 43 connector tests pass. Published Pages 3fd71e39 and verified ZIP/bootstrap hashes plus failed-task baseline UI. Repaired installed helper preserving pairing, restarted idle launch agent, and reran exact failed document task successfully (Luna draft plus Astra judge, accepted_by_astra). Failed cloud records preserved; user can rerun in UI. See projects/acenet/VALIDATION.md. Worker unchanged.



## [2026-09-08] session | ACENET direct Drive and dataset scope

User clarified primary workload is large-data ingestion/execution with direct Google Drive. Verified current app has no direct Google OAuth and is limited to 12 attachments/140 KB extracted text (150 KB task JSON), with no resumable bulk processing. Prepared .scratch/acenet/drive-ingestion/spec.md covering OAuth, per-file versus restricted folder access, source manifests, versioned local cache, batch execution and evidence-based cost/quality gates. Google Cloud project ID requested; registration/consent remains unresolved, no direct Drive connection claimed or deployed. Prepared projects/acenet/evaluation-pack.zip with three small synthetic tests and independent answer keys for current app; no model runs performed on that pack.



## [2026-09-08] session | ACENET uses Drive through existing native accounts

User requested reuse of Google Drive connected to ChatGPT/Claude instead of separate OAuth. Built composer source/provider selection and metadata access check; added Drive-specific tool routing/evidence gates. Real ChatGPT Drive search and Claude Drive recent-file listing both succeeded through ACENET native model/review workflows. No provider credentials exported or new Google login created. Published Pages 4ede808d; Worker unchanged. Updated both idle local helpers preserving pairing; owner PID 41507. 29 harness and 43 connector tests pass; deployed browser source routing, unavailable-provider rejection and mobile checks pass. Metadata probes do not prove full document reads/exhaustive folder access. Bulk ingestion/caching remains unfinished. Separate OAuth request is deferred, not required for this native path.



## [2026-09-09] session | ACENET large evidence review and false savings fixed

User book task fetched about 1 MB then hit the 80 KB review cap. Added bounded body section audits (up to sixteen 100 KB sections), preserved original evidence and coverage, and final reviewer synthesis of findings. No truncation of stored evidence, no claim of lossless summary/full-source Astra verification. Failed/unapproved/cancelled runs no longer show projections or savings; actual spend remains. Pages 237ae9f1, Worker unchanged. Both idle helpers updated preserving pairing; owner PID 48437. 32 harness, 43 connector and nine cost tests pass; deployed browser failure-state test and canonical helper hashes pass.

Reused exact failed book trace/draft, without another Drive fetch. All 13 sections reviewed; Astra rejected draft due unresolved source truncation/pagination, absent citations and substantive omissions. needs_human_review is accurate; no accepted book artifact produced. Logs /tmp/acenet-book-section-review. Full-folder/full-book coverage remains an open capability limit, not resolved by this size-limit fix.


## [2026-09-09] session | Private GitHub repository created

Published the standalone project to https://github.com/hamzadianathbiz/acenet (private, main). Includes source, setup/check scripts, validation, synthetic evaluation pack, decisions, dated history and unresolved proposals. Fresh preparation and all 114 selected tests pass. Credentials, account state, raw document/task runs and migration backups excluded; committed contents checked against local secrets. Dependency advisory chain recorded in REPOSITORY-VALIDATION.md. No automatic deployment or workspace synchronization enabled.
