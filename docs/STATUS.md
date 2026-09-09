# Current status — 9 September 2026

Live site: https://ace-acenet.pages.dev
Public source: https://github.com/hamzadianathbiz/acenet
Pages release: ae02e441. Worker: 7ab077ce-36f1-40b7-bc50-b82f6679285a.

The missing-executor amber dead end is replaced by a direct connection dialog: sign in separately, retain the draft/files/chat, and resume once. Cancel/New chat prevents sending. Canonical browser fixture tests and the authenticated no-queue setup response pass. Real OpenRouter sign-in and inference still require the user connection.

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
121 focused automated checks pass: 36 harness, 43 connector and 42 Node tests. The canonical deployed chat passed browser tests with isolated API fixtures, including follow-ups, Enter to send, New chat, pending permissions and Stop. Deployed HTML, JS, CSS, both helper ZIPs and installers match the local release byte for byte.

Actual v3 Astra-to-open-model inference remains unverified: the accessible owner account has no executor connected. There is no measured v3 quality/cost parity or 90% savings result. The prior 36.77% result belongs to the superseded v2 workflow.

Large evidence is bounded to 48 sections of 24 KB; Astra reviews derived notes for larger inputs, not every raw byte independently. Exhaustive folder ingestion, provider pagination recovery, resumable caches, OCR, arbitrary code execution and external writes are not implemented. Prior full-book coverage failed review. Chat history is bounded by request limits and may require a new chat when full.

Email verification, password recovery, account deletion/export and general helper auto-update are not implemented. Windows helper remains preview. Broad connector coverage is unverified.

See ../VALIDATION.md for evidence and historical results. The standalone toolchain has a recorded Wrangler/Miniflare/sharp dev-dependency advisory chain; see REPOSITORY-VALIDATION.md.

## Repository boundary
Clean standalone snapshot of projects/acenet. Credentials, raw task history, screenshots, backups and unrelated workspace data are excluded. Source updates and production deployment are manual.
