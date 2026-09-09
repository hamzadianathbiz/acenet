# Production adapter

Live: https://acenet-zeta.vercel.app
Team: hamzas-projects-7610de2b. Project: acenet.
Private Blob store: acenet-private (store_ict5SaQOgw0vBv0i).

```
npm ci
node prepare.mjs
npm run build
node --test tests/*.test.mjs
vercel deploy --prod --yes
```

`prepare.mjs` must run locally where `../app` and `../cloud` exist. The deployment directory is otherwise standalone: no vault files are uploaded. The build verifies its generated snapshot exists.

Required production environment variables: BLOB_READ_WRITE_TOKEN, APP_PASSWORD, STORAGE_KEY, BRIDGE_TOKEN. Production runs use the paired Mac connector and its ChatGPT account, not hosted model API keys.

`lib/plan.mjs` intercepts new tasks and enforces plan-only configuration. A connected ChatGPT account is required. Luna is the default body; a localhost open-model server is opt-in. The previous API tick endpoint is blocked. The connector holds no cloud lock during model execution; task claim and progress updates use short serialized writes. A missing connector heartbeat fails an interrupted task without replaying it.

The Mac connector can continue with the browser closed. Keep the Mac awake and the connector process running. The current process is started from the workspace; it is not configured as a login service. Restart with the command in `../connector/README.md` after a reboot.

Authentication uses the private workspace cookie for browser traffic and BRIDGE_TOKEN for connector-only endpoints. Only an authenticated owner can download the pairing configuration. OpenAI OAuth credentials stay in Codex on the Mac. Secrets and logs are gitignored. Run history lists the latest 100 runs while older blobs remain stored.

Hosted OpenAI/Workers AI code remains available in the source as an optional future adapter, but production run creation does not call it. Infrastructure charges are separate from ChatGPT plan allowance.
