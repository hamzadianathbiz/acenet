## Same-tab OpenRouter connection — 9 September 2026

Pages `c928cf29`, Worker `346d6e72-6c00-4970-adbf-4ab756a7f696`. Replaces the earlier popup design, which could leave two app windows and reopen account settings after OAuth. The executor dialog is removed. Connect & send saves the current bounded draft in the private tenant PKCE record, navigates in the same tab, restores the conversation and attachments, and claims automatic resume once. Back/decline/expiry recover the draft without sending. Draft recovery is valid for 24 hours; OAuth remains valid for ten minutes. The record is bounded to one per tenant and is replaced by the next connection attempt. Restoring an expired draft clears its content; there is no background deletion job.

45 focused Node tests pass, including tenant isolation, foreign-parent rejection, size validation, expiry and repeated recovery without duplicate automatic sending. The browser integration now executes the actual plan/OpenRouter route code; only account login and provider networking are fixtures. It passes on local and canonical deployed assets: same-tab callback, correct Astra/open-model queue configuration, prompt/files/parent context, one send after success, settings-only connection without send, Back/decline/expiry, connection failures, already-connected users, no popup or stacked dialog, and mobile width.

The real OpenRouter authorization landing page also opened correctly in fresh Chrome and displayed Sign Up / sign-in. No user authentication or model inference was performed. Canonical HTML/JS/CSS hashes match; authenticated production restore with a nonmatching flow ID returns no draft and changes none. Actual user login completion and open-model output remain unverified.

## Free-model connection recovery — 9 September 2026

Pages `ae02e441`, Worker `7ab077ce-36f1-40b7-bc50-b82f6679285a`. Missing executor setup returns HTTP 400 with `executor_setup_required` and creates no task; authenticated production probe verified this without inference. Main UI opens a direct connection dialog, retains draft/files/parent in the original tab during OAuth, and resumes once after the refreshed account reports connected. Cancel/New chat prevents resumption. Existing connected OpenRouter accounts need no manual selection. The app's old global `open` function was renamed `openRun` because it shadowed native popup creation.

42 Node tests and UI syntax checks pass. New `app/tests/executor-setup.browser.mjs` passes on local assets and the canonical production site, covering OAuth callback/resume exactly once, same-chat parent and files, cancel/New chat, blocked popups, mobile width, connected accounts and stale state. Browser API/provider responses are fixtures; actual third-party sign-in and open-model inference were not performed. Production HTML/JS/CSS match local release hashes. Browser integration had no available browser, so an isolated standalone Chrome test was used.

# ACENET validation · 2026-09-05

## Astra orchestration v3 and simple chat — 9 September 2026

Live Pages `c904228f`, Worker `28023340-1de1-4991-8fb3-75b839782017`. User reaffirmed Astra as planner/orchestrator and open models as executors, then requested a simple chat with within-chat history and hidden internal work. Replaced new-task default with astra-orchestrator-v3. Every turn plans in Astra, executes ordered steps on an open body, reviews in Astra and permits one body repair. No small-task direct shortcut or silent Luna/Haiku executor fallback. Claude can provide a source-reading gateway under Astra's plan but cannot replace the brain. Explicit baselines are Astra-only.

121 automated checks pass (36 harness, 43 connector, 42 Node), including plan-first order, open-only executor enforcement, bounded repairs, same-tenant parent lookup, earlier messages/attachments, new-chat isolation and package installation importing orchestrator.py. Worker dry-run compiled. Live browser fixtures pass transcript display, Enter-to-send, reply parent binding, New chat reset, hidden details, visible permission/stop controls, mobile width and no JS errors. Browser tests use isolated responses, not live model generation.

Both idle local helpers updated preserving pairing; owner PID 87162 and version-3 heartbeat verified. Owner workspace has no OpenRouter connection/selected local executor. User was asked to connect OpenRouter; real Astra-to-open-model generation remains unverified pending that connection. No test result is represented as a live open-model inference. Model catalogue now requires a public Hugging Face reference as an open-weights indicator plus verified zero prices; this is not license certification. If OpenRouter is connected without a selection, a free model is selected automatically.

Same-chat context stores earlier messages and accepted artifacts; new chats share no memory. Conversation/task limits remain and fail without silent truncation. Raw source reuse, exhaustive folder coverage and broad quality/cost parity remain unimplemented/unproven. The earlier 36.77% benchmark used the previous policy and does not measure v3.

## Large source review and incomplete-task costs — 9 September 2026

Pages `237ae9f1`; Worker unchanged. User run `8bfb95ba-2400-4a87-b338-218a8b50b73f` fetched approximately 1 MB from Drive and produced a draft, then failed at the hard 80 KB evidence-review limit. Its partial result incorrectly supported a green projected savings display.

Large evidence now passes through at most 16 Unicode-safe 100 KB sections. Body audits every section against the complete draft/task; final reviewer receives the numbered findings and coverage. Raw evidence and each audit are preserved locally. Small sources retain the previous direct review. Extra calls are bounded and recorded; this is derived-evidence review, not independent full-source Astra validation or lossless summarization. Datasets beyond the bound still stop explicitly. No bulk folder cache or resumable ingestion was added.

Failed, cancelled and unapproved tasks now retain recorded spend but expose neither a traditional projection nor savings, even when a partial candidate exists. Production browser test reproduces the screenshot state and passes. Canonical calculator/helper/bootstrap hashes match the build. Both idle local helpers updated, preserving pairing; owner PID 48437.

32 harness tests, 43 connector tests and nine calculator tests pass. Coverage includes Unicode reconstruction, complete section coverage, preservation of original evidence, disabling audit tools, maximum-section rejection, and unsuccessful-run savings suppression. Real book review reuses the original draft/tool trace in `/tmp/acenet-book-section-review`, avoiding a repeated Drive fetch; the replayed draft ledger reflects earlier recorded usage, not a new inference charge. All 13 sections completed and Astra returned needs_human_review after 15 recorded stages (one reused draft, 13 new body audits, one new judge). The remaining failure is substantive: candidate admits truncated text/unresolved pagination; full-book coverage, citations and several requested topics are missing. No final accepted artifact was produced. This is a successful size-limit regression check, not a successful full-book-quality benchmark.

## Native Google Drive source selection — 8 September 2026

Pages `4ede808d`; Worker unchanged at `58ee3ca1-b812-4715-a240-92381e46d466`. Added composer Drive source field, explicit ChatGPT/Claude choice and a small metadata access-check task. No direct Google OAuth registration or credential reuse is performed. Existing native account permissions are used. Drive requests now enable tools for Drive links and natural-language references, add content/coverage instructions, and require Drive-specific successful evidence rather than an unrelated connector call.

Two real read-only native workflows passed: ChatGPT `codex_apps/google_drive.search` and Claude `mcp__claude_ai_Google_Drive__list_recent_files`, each followed by the selected provider's review. Logs in `/tmp/acenet-drive-{chatgpt,claude}-check`; file contents were not read for the access probes. Claude status uses the existing generic accepted_by_astra enum, but its ledger correctly records Haiku/Opus. Metadata success does not demonstrate exhaustive folder enumeration or document content access.

29 harness tests and 43 connector tests pass. Browser routing/check/disconnected-provider/mobile/no-JS-error fixture passes. Installed email-account helper and developer owner helper updated while idle; pairing preserved, owner heartbeat verified (PID 41507). Other users rerun setup once. Native Drive access removes the immediate need for the deferred direct OAuth design; bulk manifests, durable cache and exhaustive dataset execution remain separate unfinished work.

## Installed-helper missing module repair — 8 September 2026

Canonical Pages `3fd71e39` publishes the corrected installer; backend Worker remains `58ee3ca1-b812-4715-a240-92381e46d466`. User's email-account helper (in `~/Library/Application Support/ACENET`) was distinct from the developer owner helper. Its failed jobs `d32dd726-82ef-437e-8e68-796de6167a81` and `f21e2357-aef4-4b34-ab9f-d1fed602a255` both failed before model calls with `ModuleNotFoundError: economy`. ZIP packaging was correct, but setup.py copied only four old modules. This invalidated the earlier assumption that bundle-content checks proved installed runtime completeness.

Installer now validates and copies all eight runtime files, including economy, permissions, model instructions and OpenRouter. Added actual ZIP-to-install import test, incomplete-install preservation test and safe actionable-error test. All 43 connector tests pass. Canonical Mac/Windows ZIP and bootstrap hashes match the corrected build. Deployed browser fixture confirms failed tasks cannot launch the additional-cost baseline.

Repaired the user's installed runtime while idle, preserved config hash and restarted its existing launch agent. Reran the exact failed job with that installed Python/helper into `/tmp/acenet-installed-retest`: accepted_by_astra, two calls (Luna draft and Astra judge). Original failed history remains unchanged; user can rerun in the UI. Native account login/pairing were not replaced. Raw document content was not printed or copied into this validation record. Other users who installed the broken bundle must rerun setup using the now-corrected installer.

## Adaptive execution, uploads and connectors — 8 September 2026 (live)

**Deployed after user-authorized retry:** Pages `ab7d27d0`, Worker `58ee3ca1-b812-4715-a240-92381e46d466`. The earlier automatic approval usage block cleared. Owner helper was confirmed idle, its exact process identified and restarted (PID 34094); authenticated state confirms an online version-2 heartbeat. Other users must rerun setup once.

105 automated checks passed: 40 connector Python tests, 27 harness Python tests and 38 current Node tests. Logs: `/tmp/acenet-final-{connector,harness,node}.log`. Existing retired Vercel endpoint expectations remain separate known failures.

Actual browser file-input tests passed for searchable PDF larger than the old 150 KB limit, DOCX, XLSX, PPTX, CSV and UTF-16 text. Corrupt-file handling preserves good attachments; removal, mobile width and JavaScript checks passed. Fixed PDF.js 6 lifecycle cleanup to destroy the loading task. Fixture runner: `/tmp/acenet-browser-test/uploads-v2.mjs`; screenshot: `app/qa/uploads-v2-mobile.png`. The same six-format browser test passed against canonical production, including its PDF worker and CSP. Scanned PDFs and image OCR are unsupported.

The permission/cost browser fixture passed completely locally and against canonical production after correcting its currency-format assertion. It verifies the exact approval payload, removal after completion, optional baseline control, recorded savings, mobile width and no JS errors. These API responses were isolated browser fixtures, not real permission decisions or baseline calls. Fixture: `/tmp/acenet-browser-test/v2-ui.mjs`.

Paired real coding benchmark in `harness/runs/adaptive-v2-check`: mixed $0.1339596 versus Astra baseline $0.21187, saving $0.0779104 (36.77%) API equivalent. Both passed five independent acceptance checks; generated suites also passed (mixed seven, baseline twelve). Astra corrected a real Decimal normalization error with three exact replacements. The benchmark preceded final minor native feature-flag/task-instruction refinements; it validates the policy on one example, not a universal 10x saving or lossless quality. Read `ADAPTIVE-BENCHMARK.md` for usage details.

Real Claude Calendar metadata retrieval succeeded after one exact MCP permission callback approval. A full Codex connector task retrieved Calendar data but the initial Astra judge rejected it because tool evidence was missing from the review context. After adding raw tool evidence to the judge input, rechecking the same retrieved evidence returned approved=true, without repeating the Calendar read. Evidence: `harness/runs/adaptive-v2-check/connector/evidence-recheck/verdict.json`. No messages or external records were changed. Other connector operations, organization-required approvals and full Claude-only orchestration remain unverified.

Pages preparation succeeded with 219 static assets, including self-hosted PDF dependencies. Worker dry-run compiled (70.17 KiB, gzip 19.41 KiB). Deployment and checks completed: canonical JS, extraction modules, PDF worker and both helper ZIPs match local SHA-256 values. ZIPs include economy.py, permissions.py and model-instructions.md and exclude private config. Live CSP allows the self-hosted PDF worker.

A real authenticated task with attached invoice text completed as `accepted_by_astra` through exactly Luna draft and Astra judge, returning the correct invoice number and total. Run `3bc1b6e4-ee27-4382-8fc0-291254751182`; evidence `app/qa/adaptive-v2-live-smoke.json`. This is a real model run and remains visible as a release verification task in the owner workspace. No third-party records or messages were changed.

## OpenRouter hosted free body — 8 September 2026

Live Pages `3dfc6b88`, Worker `6065cf63-cea5-4a4d-b36c-575825343ec3`. Open **Models → Connect OpenRouter** for browser PKCE authorization, then choose a current free model. No model download is required. Native subscription planning/review still requires the helper. Owner helper updated while idle and verified online with `openrouter_capable: true`; other users must update once.

The live catalogue returned 18 eligible models initially and 16 on the final check, demonstrating changing availability. Deployed authenticated catalogue, PKCE authorization URL, mobile layout and JavaScript checks pass. Browser-only mocked callback/selection paths passed without storing a key or running inference. Mac/Windows published bundles include `openrouter_inference.py`, exclude pairing config and match bootstrap hashes. **Real OpenRouter authorization and generation remain unverified pending the user's account connection.**

40 connector tests, 21 harness tests and 33 current plan/local-model/OpenRouter/runtime Node tests pass. New coverage checks PKCE state/expiry/replay, tenant-bound encryption, active task claims, old-helper rejection, paid models, changed pricing, context overflow, incomplete output, secret-free response logging and cost evidence. A broader run hits two pre-existing retired Vercel handler tests expecting 200 from the intentionally retired 410 API; those tests were not changed. Initial harness discovery needed PYTHONPATH set to the harness directory, then passed.

Cloudflare outbound fetch rejected redirect mode `error`; `manual` plus explicit non-2xx rejection fixes live catalogue access without following redirects. Calls go from the native helper directly to OpenRouter so long inference does not lock the shared cloud Coordinator. Keys are encrypted at rest and handed to the paired helper in memory only for active tasks. The shared Harness previously rejected Claude backends at constructor validation despite the custom adapter; it now accepts Claude/OpenRouter only with an explicit adapter. Full Opus/Haiku orchestration is still not live-verified.

Free-model calls recheck every reported price, constrain prompt/completion/request/image price to zero, disable fallback and truncation transforms, and validate the result schema. Failed price/limit/context checks stop visibly. This adds hosted free execution, not guaranteed free unlimited usage, quality parity, or browser-only subscription execution.


## Native connector research — 7 September 2026

Deployed Pages `90221078` and Worker `5000c9c1-546b-4769-abb0-0b920d99e20e`. Updated owner helper is online and reports both native accounts with connector capability version 1. Free hosting and old Vercel storage are unchanged.

Live read-only Calendar metadata calls passed through Codex/Luna and the actual Claude/Haiku `claude_call` adapter. Initial Claude call was denied by default noninteractive permissions; an exact read-tool allowlist fixes this without a broad permission bypass. Metadata discovery also found other native apps, but individual non-Calendar tools have not been end-to-end verified. Provider/org-required interactive approvals and apps absent from the native runner remain unavailable; this does not meet universal access to every website connector. Cross-provider aggregation and in-browser native permission requests remain unimplemented.

36 Python connector tests and 26 Node plan/local-model/runtime tests pass. Tests cover exact read permissions, prompt preservation, shell disabling, trace completion/failure handling, and exclusion of raw arguments/results from activity metadata. Live deployed browser checks passed owner sign-in, connector activity and permission-failure rendering, mobile overflow, and no JS errors. Browser activity fixtures were not stored or executed. Published Mac/Windows helper ZIPs include the new source, exclude pairing configuration, and match installer SHA-256 pins.

Native connector calls are shown after each model call returns, not as an instantaneous per-tool stream. Relevant retrieved facts may enter blueprints/results and the local body's context. Only the selected provider's connectors are used. Existing users must rerun setup once. No external records were modified or messages sent during verification.


Production: https://ace-acenet.pages.dev

**Current status, 7 September 2026:** Cloudflare Pages and SQLite Durable Object storage are live. The owner authorized fresh initialization; old Vercel records remain untouched and unavailable for export. Historical Vercel evidence below describes the earlier deployment.

## Completed-task cost comparison · 7 September 2026

Pages deployment `787512a3` adds the traditional one-Astra-response projection, recorded harness call estimate, and dollar savings/extra cost. Source/result size is estimated at four characters per token for the counterfactual; it is not a measured baseline. Astra $10/$1/$50 and Luna $0.20/$0.02/$1.20 per million input/cache/output tokens were checked against official model pages on 2026-09-07. Long-context multipliers applied to call totals; subscription/hosting/hardware/tools/unreported cache-write costs excluded. Unknown usage/rates suppress total and savings. Claude updated helpers preserve native API-equivalent totals.

Five new calculator tests (eleven runtime tests total) and thirty connector tests pass. Deployed UI verified with isolated browser-only fixtures: savings, extra cost, missing usage, terminal-state gating, desktop/mobile layout and zero JS errors. No fixture records or model calls were created. This validates calculation and presentation, not economic savings or output parity.

## Email accounts · 7 September 2026

Pages `2a6f34ab` and Worker `8f83ef56-fb6b-4ed7-b5ad-d8261a37c97b` require email for new registrations. Email format, lowercase normalization, duplicate rejection and preserved legacy username tenants pass three new auth tests (six runtime tests total). Live Chrome email signup/login/logout/session gating and all twelve public API smoke groups pass. Mobile email form inspected. Email verification/password reset are not implemented. Existing username and owner logins remain available.

## Simplified local setup · 7 September 2026

Pages deployment `de16c653` keeps hosting free and replaces manual ZIP handling with a generated setup command. Hamza explicitly chose a simplified local helper over paid hosted runners. The command includes the one-time pairing code and provider; public bootstraps verify their bundle hash before running. Advanced account/model settings are hidden until connected. Thirty connector tests pass, including bootstrap forwarding, malformed-code rejection and corrupt-download rejection. Live Chrome checks passed both platform/provider command variants, mobile layout, collapsed ZIP fallback, published script/bundle hashes, actual Python pairing and native helper automatic return. No model calls were made. Full installation on a clean computer and actual Windows execution remain unverified. This still downloads/installs local software automatically; it is not browser-only setup.

## Sign-in-first flow · 7 September 2026

Pages deployment `84d61a14` hides the workspace in initial HTML styling until authentication is confirmed. Live Chrome checks passed: delayed bootstrap without a workspace flash, mandatory welcome (Escape cannot dismiss it), registration, returning authenticated session, logout, sign-in and expired-session gating. Mobile layout inspected with no overflow; zero JavaScript errors. No model calls.

## Cloudflare migration verification

- Production Pages deployment: `73fbea4b.ace-acenet.pages.dev`, canonical `ace-acenet.pages.dev`; Worker `acenet` version `827ee607-d59a-4521-a3c5-16c95aa236e4` exports the private Coordinator binding.
- Public health reports ready. Twelve live API check groups passed: real scrypt signup/login, concurrent username uniqueness, tenant isolation, CSRF/origin rejection, single-use pairing, bridge authentication, local-model preference, concurrent task claims, private downloads, combined state polling, cancellation integrity and logout invalidation.
- Real Chrome signup → pairing → actual Python helper → native ChatGPT/Claude login detection → automatic return to composer passed. Desktop/mobile screenshots inspected; no horizontal mobile overflow or JavaScript errors. Session cookie Secure, HttpOnly and SameSite=Strict verified.
- Owner login and moved owner helper verified online with both native providers detected. No real model calls were made for this hosting migration; task fixtures are explicitly synthetic. Earlier real Astra/Luna evidence remains below.
- Twenty-seven connector tests and three new storage/migration tests pass. Twenty-nine shared server tests and local workerd smoke passed during preparation. Live helper transport initially failed with Cloudflare 1010; explicit ACENET/1.0 identity fixes both pairing and polling and is included in published bundles.
- Old Vercel production deployment `dpl_BvtJRh3nUKmJM5U2Qemz8trETbFz` verified: homepage returns 307 to Cloudflare, API returns 410 before Blob access. Public helper ZIPs and frontend files match build hashes; ZIPs exclude private config and contain the correct origin and transport identity.
- Static assets and downloadable bundles use the Pages origin. Frontend polling combines account/history/detail and slows to 30 seconds when idle. SQLite serialization replaces repeated Blob lock writes.
- `acenet.acenet-cloud.workers.dev` has a TLS handshake failure. Pages binds directly to Coordinator, so production does not depend on that hostname. No paid plan enabled; free usage limits are finite.


## Live ChatGPT-plan verification

Run `27b03ad2-9149-4fa4-a405-74eb44cbbbfe` completed through the Vercel queue and local Mac connector:

1. `gpt-6-astra`, backend `codex`: blueprint completed.
2. `gpt-5.6-luna`, backend `codex`: execution completed.
3. `gpt-6-astra`, backend `codex`: review completed; candidate accepted.

Task: a three-item software-project handoff checklist, each naming a deliverable, under 60 words. Output has three deliverables in 24 whitespace-separated words. Source evidence is preserved in `connector/runs/27b03ad2-9149-4fa4-a405-74eb44cbbbfe/` and the private deployed history. API cost fields remain null. CLI confirmed ChatGPT login; child execution forces `forced_login_method="chatgpt"` and strips API-key/access-token overrides. No OpenAI API key was used. Exact plan-credit debits are not returned by the CLI.

The browser was closed after the first live activity event. The connector completed all remaining calls and synced results without it.

## Checks

- 7 Vercel tests: plan-only routing/API exclusion, offline-account gate, single claim, preserved source, lock concurrency, compact history/cancellation, and lock release before HTTP completion.
- 2 connector tests: removal of API override environment variables and exact blueprint-step/model activity mapping.
- Existing harness: 20 tests. Local web server: 9 HTTP tests. Retained Cloudflare runner: 10 tests and deployment dry-run.
- Production account UI: password unlock, connected-plan indicator, one task box, no API-key field, desktop/mobile overflow, live model activity, zero page JavaScript errors.
- Earlier local inspector checks: output, blueprint, usage, baseline comparison, downloads and mobile layout.

Two initial synthetic verification requests stopped before any model call because of storage-path retrieval. They remain preserved, marked failed with an explanation. The fixed adapter uses unambiguous storage names. A separate lock-release issue was fixed and covered by a regression test. The Vercel catch-all was also renamed to avoid shadowing the artifact `path` query; downloads are verified against production.

## Limits

This proves one real plan-backed end-to-end run, not general output parity or tenfold savings. The previous Codex synthetic cost benchmark failed the API-equivalent savings target at 6.03x baseline cost. Local open models remain mocked, not live-tested.

The Mac must remain awake with its connector running. The browser can close. The connector is not installed as a launch-at-login service; restart after reboot. Model/account limits are surfaced without switching to API billing. Cloudflare hosting was not deployed because writes returned authentication error 10000; it is no longer required by the production plan path.

Private Blob state survives deployment. Public output is an authenticated single-owner workspace, not a multi-user service. Generated code is not executed. Hosting/storage costs are separate from ChatGPT plan allowance.

## Final production check · 2026-09-06

Deployment dpl_8wz9RCPeDB2p8xfcmwTS9xnLFK4u is live. Rechecked the connected-plan state and completed three-model-stage result. Answer download returns 200 with attachment headers; mobile layout has no horizontal overflow and no page JavaScript errors. Anonymous /api/runs, /api/account/connector-config and /api/bridge/next return 401. access.md, .env.production.local and connector/config.json return 404. The connector download archive contains only bridge.py, harness.py and README.txt, never pairing configuration.

## 2026-09-06: self-service accounts and native provider preview

- Ten Vercel tests pass: authentication, logout revocation, CSRF/origin rejection, tenant-specific reads/downloads/cancellation/bridge credentials, independent storage locks, preserved owner namespace, Claude-only routing and rejection of unconnected providers.
- Four connector tests pass: Codex API override removal, actual step/model reporting, Claude structured-output command with no tools, and rejection of API-key auth as a subscription connection.
- Live production browser: created isolated QA accounts, downloaded private per-user config, confirmed empty history, denied access to the known owner's task and download, signed out and confirmed 401, then logged into the owner account and confirmed the existing three-call accepted result/download. Mobile width and browser error checks passed. No new model calls were made.
- An initial browser test failed because navigating only to a new URL hash did not reload the app; corrected test navigation and all checks passed. Account dialog positioning was improved after screenshot review.
- Claude adapter is preview, with mocked verification only. `claude auth status` reports signed out on this machine. Claude billing follows the native account, including user-enabled extra usage; no claim of zero overages. Current official legal documentation permits unmodified native binary sign-in subject to its conditions, and forbids third-party credential/token intermediation. No tokens are read or proxied here.
- Gemini and other providers are not implemented. Public browser-only subscription OAuth, password recovery, connector-token rotation, account deletion/export, and automated runner installation remain incomplete. Each user must install/sign into a native runner and keep their computer awake.

Final deployment: `dpl_A6jcALbMHgCP95h7CyCtbvJykUv1`, alias https://acenet-zeta.vercel.app. Final centered-dialog/mobile browser check passed. QA screenshots are in app/qa/accounts-final*.png and multiuser-owner.png.

## 2026-09-06: guided invite onboarding

Latest deployment: `dpl_AGf297uJPJsDpWRP7Q1ZwvUwWSdX`, https://acenet-zeta.vercel.app.

- Eighteen Vercel tests and nine connector/setup tests pass. Pairing codes have 96 bits of randomness, are hashed at rest, expire after ten minutes and redeem once under a global mutation lock. Issuance requires account auth/CSRF; redemption has trusted-IP rate limits and returns the originally bound tenant's credential only.
- Live browser test: fresh private signup → code issuance → redemption → real isolated local runner detecting existing ChatGPT and Claude native logins → automatic account-dialog close. Reuse of the same code returned 400. Both helper downloads, mobile width and page JS checks passed. No model calls or startup service were part of this pairing check.
- Initial live test timed out because its assertion expected “ChatGPT connected” while both providers were detected and the UI correctly said “ChatGPT + Claude connected.” Corrected assertion; the complete live test passed.
- Separately, one live native Claude structured-output call returned `{"answer":"Connected"}` through model `claude-haiku-4-5-20251001`. This verifies the native adapter, not the complete Opus/Haiku harness workflow. Native Claude login was now available, superseding the earlier signed-out snapshot. Provider extra-usage settings remain authoritative.
- Mac helper bootstrap syntax, executable ZIP permission, per-user launch-agent configuration and private config permissions checked. Duplicate-runner lock and Windows owned-process cancellation tested. Windows launcher and first-run installation on a clean Mac have not been exercised on actual target machines; Windows remains visibly preview. Existing-machine pairing is live-verified; automatic install/startup construction has fixture coverage.
- Final production HTML and both helper ZIPs match current source; downloads contain no pairing configurations, OAuth tokens or workspace credentials. Pairing screenshot codes are masked in app/qa/pairing-*.png.
- The app still requires one helper setup and an awake computer; there is no universal browser-only subscription login. The helper installs uv-managed Python/native provider CLIs if missing and startup entries under the current OS user. No automatic installation was applied to Hamza's own existing runner. Model availability is account-specific; no exact credit/savings or quality-parity guarantee.

## Open-model onboarding and storage incident — 7 September 2026

Deployment: `dpl_GVpPmjXNYtcc6SEc5fbq5KZQPHom`, aliased to https://acenet-zeta.vercel.app. Final public HTML, JavaScript, CSS and Mac/Windows ZIPs returned200 and matched the built source byte-for-byte. Live signup returned the intended503 with Retry-After900; the underlying quota suspension remains unresolved.

- 29 Vercel tests and 27 connector/setup tests pass. `node prepare.mjs`, the standalone build and browser JavaScript syntax checks pass. Both starter models are an explicit user choice; discovery alone never downloads anything.
- Isolated browser integration passed with the current HTML/CSS/JS, actual `plan.mjs`, real bridge process, and actual Python discovery/streamed-pull code. Session authentication and persistence were fixtures; Ollama/LM Studio were HTTP fixtures on ephemeral ports, remapped only inside the QA subprocess. No production credentials, model calls or real downloads were involved.
- Verified installed model selection/clear, per-layer 50% progress, automatic selection after verified completion, failed download preserving the existing choice and allowing a fresh retry, persistence across browser reload, and Astra brain plus selected local body routing. Mobile at 390px has no horizontal overflow and page JavaScript errors were empty. Screenshots in `app/qa/local-models-fixture-{desktop,mobile,downloading,mobile-home}.png` were visually inspected.
- Separate HTTP integration passed for both native inference adapters with real Python networking, fixture model metadata and JSON generation output. Ollama uses `truncate: false`; LM Studio checks its loaded context. Unit checks cover incomplete output, absent models, remote aliases, loaded LM context, strict schema output, oversized input/Modelfile metadata, and thinking compatibility.
- Actual multi-gigabyte downloads, hardware memory requirements and output quality on real OSS models remain unverified. Updated helper setup is required for existing users; clean-device/Windows limitations still apply.
- Live signup failed with Blob `403 Forbidden`. Authenticated Vercel metadata confirmed store `store_ict5SaQOgw0vBv0i` has `billingState: suspended`, `usageQuotaExceeded: true`, and `status: limits-exceeded-suspended`; the Vercel team is on active Hobby. The store still lists 40 blobs / 14,710 bytes. No store or user records were replaced/deleted. Precise exhausted operation type was not exposed by this metadata.
- The queue design writes heartbeat plus lock acquire/release on every idle bridge poll, so it cannot sustainably fit Hobby's 2,000 advanced operations/month for an always-on helper. This is an architectural cost limitation, not a model API charge. Browser hidden tabs now stop polling; errors pause automatic refresh; updated helpers back off and honor Retry-After. These mitigations do not solve the normal-operation quota.
- API storage errors now return a clear 503 with Retry-After: 900 rather than a raw SDK error. Financial authorization is required before changing the Vercel plan. Vercel documents waiting for the quota reset or enabling Pro/trial to restore Blob access: https://vercel.com/docs/vercel-blob/usage-and-pricing. Pro base pricing is currently $20/month plus applicable usage and taxes: https://vercel.com/pricing.
- Follow-up: restore the existing private store, repeat live account/model onboarding, then move frequent queue/heartbeat state to suitable transactional storage while preserving accounts/history. Do not create another empty Blob store to evade quotas or silently reset users.
