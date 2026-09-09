# ACENET old storage recovery

Status: ready-for-human

Updated 7 September 2026: production is restored on https://ace-acenet.pages.dev using SQLite Durable Object storage. Hamza explicitly approved "Launch fresh; preserve old storage" after export failed. Fresh initialization and live account/queue/browser verification passed. This issue no longer blocks new users.

Old private Vercel Blob `acenet-private` (`store_ict5SaQOgw0vBv0i`) remains untouched: 40 records, 14,710 bytes, quota-suspended. Listing metadata works but record downloads return 403. Recovery needs provider quota restoration or separately authorized paid access. No paid upgrade was activated. Do not overwrite new Cloudflare accounts with an eventual snapshot; reconcile old tenant IDs/history deliberately after inspecting both stores.

Vercel's retired root redirects to Cloudflare and its API returns 410 before any Blob access. The Cloudflare store removes the Blob heartbeat/lock write pattern. New users create fresh accounts and pair updated helpers. The owner's previous config is privately backed up in ignored cloud/migration-private/; the owner helper now uses Cloudflare.

Remaining product validation: real OSS generation/downloads, full Claude workflow and clean-device installer checks. See projects/acenet/VALIDATION.md.
