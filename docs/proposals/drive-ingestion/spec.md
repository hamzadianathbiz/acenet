# Direct Drive and dataset execution
Status: ready-for-agent
Updated: 2026-09-08

User objective: directly connect Google Drive, pull large amounts of data, execute useful analysis at lower model cost. Existing constraints: free hosting, native subscriptions via local helper, independent per-user accounts. This is a new ingestion/execution capability; current app has neither direct Google OAuth nor durable large-dataset processing.

## Current direction after user clarification
The user chose reuse of Drive already connected to ChatGPT/Claude. Native Drive metadata calls succeeded through both providers, and a composer source/provider selector plus access check is implemented. A separate OAuth app is not needed for this path. The direct Google API design below is deferred; it is not a blocker for native access. Large-dataset manifests/caching/batch execution remain unfinished and must not be inferred from successful connector reads.

## Deferred direct API setup
ACENET-specific Google Cloud project/OAuth client has not been identified. Asked user for project ID only. Client secrets must go through secure deployment/local provisioning, never chat or source control. Do not reuse credentials belonging to unrelated apps or the assistant's connectors.

## User experience
Connect Google Drive → official Google consent → select source files or folder → enter task. Show files discovered, processed, skipped, denied and changed; model and phase per task; source links; downloadable output; recorded cost and optional independent baseline. Never show a file/folder as processed merely because its metadata was listed.

## Authorization choice
Per-file import: Google Picker + drive.file is the narrow initial route, with explicit selection of files. Picking a folder does not justify claiming permission to every descendant. It does not deliver unattended whole-folder ingestion by itself.

The requested ongoing folder ingestion needs drive.readonly or another access design that actually grants each file. Google classifies drive.readonly as restricted and requires additional verification; server transmission/storage of restricted data can require a security assessment. This may conflict with the strictly-free requirement. Establish project audience/internal-versus-external status and applicable requirements before promising public seamless folder access. A test-user integration is not a fully verified public app.

No Drive write scopes or writeback in first release. Produce downloadable outputs. Later writes need explicit destination/action approval.

## Implementation contract
1. Per-tenant OAuth initiation, expiring one-use state, PKCE, exact registered callback, encrypted refresh token, rotation/revocation and disconnect. Server-bound workspace identity; Google callback cannot choose a tenant. Tokens never enter prompts/logs/task records. Test cross-tenant access, state replay, revoked grants and missing scopes.
2. List every page; support selected shared-drive sources and explicit shortcut policy. Stable file IDs, modifiedTime/version, source links and permission status. Honor retry-after/backoff, cancellation and API limits.
3. Queue ingestion to existing helper rather than a long request in the shared Durable Object. Fetch supported Google Docs/Sheets exports and binary documents, enforce per-file limits, flag scanned/unreadable material. Do not silently truncate. Keep raw large corpora in the local account workspace initially to avoid pretending free cloud storage is unbounded.
4. Chunk into source-addressable sections/rows with stable IDs. Cache by account+file ID+version+extraction version. Changed/deleted/revoked files invalidate affected entries. Do not share caches between accounts. Resumable manifest records every discovered file and terminal outcome.
5. Distinguish exhaustive extraction from search: all-file reporting visits all eligible files; selective Q&A reports the scope searched. Retrieval alone cannot prove exhaustive coverage. Never replace original evidence with a summary without preserving source access.
6. Astra creates one compact schema/acceptance contract for complex batch jobs. Bodies extract batches. Deterministic code handles arithmetic, deduplication and schema validation. Astra reviews anomalies and synthesis with cited original evidence; escalate only identified uncertain items within an explicit cost cap. Stop visibly when the cap cannot support requested quality.
7. Cached extraction reusable across queries; do not reread every file for every question. Account for ingestion, retries, reviews and amortized versus first-run cost separately. Optional Astra baseline uses identical corpus and requirements. No 90% or lossless claim without representative repeated tests.

## Acceptance before release
A fixture folder with more than one listing page; deleted/changed/inaccessible files; duplicate names/different IDs; multiple currencies; contradicting source documents; cancellation/restart; malformed exports; a scanned PDF; tenant isolation. Every file reconciles to manifest state. No missed mandatory facts on ground-truth corpus. Actual Google sign-in/import/revocation and installed-helper end-to-end tests are required; mocked OAuth is insufficient.

## Current implementation limits confirmed in source
- attachments.mjs: 25 MB raw file, 140 KB extracted text; PDF up to 300 pages; no OCR.
- core.mjs: 12 attachments; complete task/source JSON under 150 KB.
- Current adaptive draft/check passes task context as a single prompt; no bulk manifest, resumable extraction cache or indexing.
- Current app generates text/files, not arbitrary executed analysis or autonomous writes.

## Sources checked 8 September 2026
https://developers.google.com/workspace/drive/api/guides/api-specific-auth
https://developers.google.com/workspace/drive/api/guides/manage-downloads
https://developers.google.com/workspace/drive/picker/guides/web-picker

## Evaluation kit
projects/acenet/evaluation-pack.zip: three synthetic inputs, prompts and evaluator-only answer key. Fits current upload limits. Prepared, not model-benchmarked. Do not attach answer key to either model. Compare critical errors, completeness, sources, latency and recorded API equivalents; a cheaper incorrect answer fails.
