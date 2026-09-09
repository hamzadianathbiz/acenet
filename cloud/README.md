# Cloudflare production hosting

Public app: https://ace-acenet.pages.dev

Pages serves static assets and forwards `/api/*` directly to the `Coordinator` SQLite Durable Object exported by Worker `acenet`. All private state uses one serialized object, with tenant-specific prefixes, atomic claims, real scrypt passwords and opaque sessions. Native model execution remains on each user's helper. This is suitable for a small invite group; one coordinator is not a horizontally scaled service.

## Deploy

From this directory, with Wrangler authorized:

```sh
node scripts/prepare-pages.mjs
npx wrangler deploy --config wrangler.plan.jsonc
cd pages
CLOUDFLARE_ACCOUNT_ID=27e0cebed199e35e539c8921268e8707 ../node_modules/.bin/wrangler pages deploy ../pages-public --project-name ace-acenet --branch main --commit-dirty=true
```

Deploy both frontend and runtime after shared changes. The API reuses `../vercel/lib` modules; refresh generated shared snapshots by running `node prepare.mjs` from `../vercel` when their sources change. Do not deploy the older default `wrangler.jsonc`: it is the retained API-billed prototype.

Runtime secrets: APP_PASSWORD, STORAGE_KEY and BRIDGE_TOKEN. Their values and original owner configuration stay in ignored private files. Never include them in Pages assets or helper bundles. Preserve STORAGE_KEY and BRIDGE_TOKEN across deployments to retain helper authentication.

## Fresh launch and old storage

Hamza approved a fresh launch on 7 September 2026 after Vercel refused to export its 40 quota-suspended records. `scripts/initialize-plan.mjs --fresh` successfully initialized the empty Coordinator once. Its authenticated import endpoint validates hashes and paths, runs atomically, and refuses to overwrite initialized state. Do not initialize again or point it at another object to reset users. MIGRATION_TOKEN is a separate deployment secret.

Vercel records remain untouched for later recovery. Invited users create fresh accounts and pair updated helpers; the existing owner password works and its helper has moved. Owner config backup is in ignored `migration-private/`. `acenet.acenet-cloud.workers.dev` currently fails TLS; Pages connects directly to the private object and does not use that host. No custom domain was moved.

## Cost and limits

No paid hosting upgrade was activated. Pages static requests are free. Free Workers/Pages Functions and SQLite Durable Objects have separate request/compute/storage allowances, including 100,000 requests/day, 100,000 SQLite row writes/day, 5 million row reads/day and 5 GB total SQLite storage. Durable Object duration is also metered. These are finite limits, not unlimited hosting; excess free usage can fail until reset. Scrypt runs inside the Durable Object, avoiding the outer Worker's 10 ms CPU allowance.

With five idle helpers at 15-second polling and five continuously open idle tabs at 30-second polling, roughly 43,200 API requests/day precede active tasks and setup traffic. Measure actual usage before expanding invitations. Paid Workers starts at $5/month if separately approved. Railway's free plan provides $1/month resource credit after the trial, making it less predictable for an always-on service.

Sources: [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects), [Railway pricing](https://railway.com/pricing).

## Verify

```sh
node --test plan-runtime/tests/*.test.mjs
node scripts/smoke-plan.mjs https://ace-acenet.pages.dev
```

The smoke test creates isolated QA users and synthetic task records; it never invokes models. Full migration evidence is in `../VALIDATION.md`. Credentials remain in native provider login stores; hosting tests do not prove quality parity or tenfold model savings.
