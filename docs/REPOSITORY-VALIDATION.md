# Standalone repository validation — 9 September 2026

A clean export installed cloud and vercel dependencies with npm ci, regenerated private-config-free bundles, then ran scripts/check.sh successfully: 32 harness Python tests, 43 connector Python tests, 39 Node tests and frontend syntax checking (114 tests total). No native model inference, live deployments or private credentials were needed. Generated runtime adapters are rebuilt by scripts/prepare.sh rather than committed.

The archive contains source, dated project updates/decisions, setup and deployment instructions, known limits, pending proposals and synthetic evaluation fixtures. Raw task runs, migration backups, private configs, environment files and account screenshots are excluded. Local operational secrets and recognizable token/private-key patterns were checked against exported files before publishing. This is a targeted exclusion/secret check, not a general security audit.

npm audit on the preserved cloud lock reports three high-severity package entries along one dev-tool chain: wrangler -> miniflare -> sharp (libheif advisories GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545). The report says a fix is available. These are dependency-graph entries, not three independently established application exploits. No production exploitability assessment was performed. Review a patched Wrangler dependency tree and rerun bundle/build/tests before changing the live app. The Vercel dependency audit reported zero vulnerabilities.

The repository is an initial snapshot, not reconstructed historical Git commits. Dated history is in CHANGELOG.md and DECISIONS.md. Subsequent repository changes should be committed normally and update STATUS.md/CHANGELOG.md when behavior or deployment changes. No automatic deployment or synchronization to the original workspace is configured.

## 9 September 2026: v3 standalone refresh

Fresh source preparation and scripts/check.sh pass: 36 harness, 43 connector and 42 Node tests (121 total), plus UI syntax validation. Canonical deployed assets match local release hashes. Browser chat checks use isolated API fixtures; real v3 open-model inference and savings remain unverified pending an executor connection.
