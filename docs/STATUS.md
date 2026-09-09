# Current status — 9 September 2026

Live site: https://ace-acenet.pages.dev
Pages release: 237ae9f1. Worker: 58ee3ca1-b812-4715-a240-92381e46d466.

## Implemented
- Email/password workspaces and native subscription helper with separate user pairing.
- ChatGPT native Luna/Astra and Claude Haiku/Opus execution; optional local or OpenRouter free body.
- Small-task direct execution; body draft plus reviewer, bounded large-evidence section audits.
- Searchable PDF, DOCX, XLSX, PPTX and text extraction.
- Drive source/provider selection using existing native connected apps; native metadata reads verified through both providers.
- Individual Claude MCP permission callback, recorded tool activity and source evidence.
- API-equivalent cost accounting and optional independent Astra baseline; incomplete tasks cannot claim savings.

## Important limits
- No universal lossless-quality or 90% savings guarantee. One coding benchmark saved 36.77% API equivalent and passed matching acceptance checks.
- Large evidence: at most sixteen 100 KB sections. Bodies audit sections; Astra sees derived findings. This is not independent full-source Astra verification.
- Exact book regression completed all 13 section audits but final reviewer rejected incomplete source coverage, citations and omissions. No accepted full-book output.
- No exhaustive folder ingestion, resumable dataset cache, image OCR, arbitrary generated-code execution or external writes.
- Free hosting still needs an awake local helper; this is not browser-only subscription execution.
- Actual OpenRouter account authorization/generation and broad non-Drive/non-Calendar connectors remain unverified.
- Email verification, password recovery, account deletion/export and general helper auto-update are not implemented.

## Validation
Latest focused suites: 32 harness, 43 connector, nine cost tests. Real Drive metadata checks, document browser tests, installed-package regression and canonical deployed asset checks recorded in ../VALIDATION.md. Two historical retired-Vercel tests still expect HTTP 200 from the intentionally retired HTTP 410 endpoint; scripts/check.sh excludes that obsolete handler suite.

Fresh standalone preparation and 114 tests pass; see REPOSITORY-VALIDATION.md. Its npm audit also identified a Wrangler/Miniflare/sharp dev-dependency advisory chain requiring review.

## Next work
1. Handle provider truncation/pagination and prove source coverage before full-book/folder claims.
2. Implement resumable manifests, versioned cache and batch extraction for large datasets.
3. Broaden independent quality/cost benchmarks using evaluation-pack/.
4. Complete lifecycle/authentication capabilities and native permission coverage.

## Repository boundary
This is a clean standalone snapshot of projects/acenet. Raw task history, credentials, browser screenshots, migration backups and unrelated ACE workspace files are intentionally not included. Historical documentation may reference local paths or absent private evidence. Changes here do not automatically deploy: the live deployment remains manual.
