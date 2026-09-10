# Current status — 10 September 2026

Live site: https://ace-acenet.pages.dev
Public source: https://github.com/hamzadianathbiz/acenet
Pages release: c78d123a. Worker: 076fc17a-ea06-474b-87d2-3efb251cd1f3.

Successful OpenRouter connections are reused across messages, new chats and page reloads. The callback accepts a code-only return, recovering the pending state from the authenticated workspace if tab storage was lost. A stale browser status cannot restart OAuth when the server already holds a connection. Repeating the same successful callback reuses the saved key without exchanging the code again.

47 focused Node tests and actual-route browser integration pass locally and on deployed assets, including code-only callbacks and multiple sends after a single connection. The existing same-tab private draft restoration remains. Live asset hashes and authenticated recovery were verified. Provider login/exchange in browser tests is simulated; actual user authorization and open-model inference remain unverified.

## Current workflow
One chat composer, accepted replies and follow-up context. Work details and cost are collapsed. New chat starts a separate conversation; cross-chat memory is deferred.

Every normal turn uses Astra to plan, an open model to execute, and Astra to review. At most one repair uses the open executor. No Luna/Haiku deliverable fallback or direct-Astra shortcut. Native ChatGPT/Claude readers may retrieve connected sources under the plan. ChatGPT is required for Astra.

Connect OpenRouter once for automatic selection of an available zero-priced model with a public Hugging Face reference, or choose a local compatible model. Public weights are not a blanket OSI license guarantee. Missing executor setup stops before model spending. Subscription usage still requires the local helper, now version 3; free Cloudflare hosting is retained.

## Implemented
- Email/password tenant workspaces and separately paired native helpers.
- Same-chat prior messages, accepted outputs and attachment context; no silent history truncation.
- Searchable PDF, DOCX, XLSX, PPTX and text extraction.
- Native source permissions and recorded evidence; Drive metadata reads previously verified with both providers.
- API-equivalent accounting and optional Astra baseline; incomplete tasks cannot claim savings.
- Large evidence extraction into bounded sections with coverage manifests and explicit derived-note provenance.

## Validation and limits
The orchestration release passed 36 harness and 43 connector tests; these unchanged Python paths were not rerun for the connection-only fix. The current 47 Node checks pass. The canonical deployed chat passed browser tests with isolated API fixtures, including follow-ups, Enter to send, New chat, pending permissions and Stop. Deployed HTML, JS, CSS, both helper ZIPs and installers match the local release byte for byte.

Actual v3 Astra-to-open-model inference remains unverified: the accessible owner account had no executor connected when checked on 9 September. There is no measured v3 quality/cost parity or 90% savings result. The prior 36.77% result belongs to the superseded v2 workflow.

Large evidence is bounded to 48 sections of 24 KB; Astra reviews derived notes for larger inputs, not every raw byte independently. Exhaustive folder ingestion, provider pagination recovery, resumable caches, OCR, arbitrary code execution and external writes are not implemented. Prior full-book coverage failed review. Chat history is bounded by request limits and may require a new chat when full.

Email verification, password recovery, account deletion/export and general helper auto-update are not implemented. Windows helper remains preview. Broad connector coverage is unverified.

See ../VALIDATION.md for evidence and historical results. The standalone toolchain has a recorded Wrangler/Miniflare/sharp dev-dependency advisory chain; see REPOSITORY-VALIDATION.md.

## Repository boundary
Clean standalone snapshot of projects/acenet. Credentials, raw task history, screenshots, backups and unrelated workspace data are excluded. Source updates and production deployment are manual.
