# Validation — 2026-09-05

Working harness; 10x savings and general quality parity **not demonstrated**.

## Automated checks

20 harness tests passed. Coverage includes context preservation, dependencies,
blueprint schema awareness, rejection and repair, criteria completeness, invalid
configuration, cost thresholds, cached tokens, missing prices, adapter parsing,
truncated output, unsafe/colliding artifact paths and empty files.

Live Codex integration used the account's exact `gpt-6-astra` and `gpt-5.6-luna`
models. Responses API and compatible local/hosted adapters were verified with mocked
transport responses only; no API key was set and no local model was provisioned.

## Synthetic benchmark

Task: `examples/brief.md`, a Python deal-normalization function and its unittest suite.
Both runs received identical input, verified by the harness's input hash.

| Path | Model calls | Outcome | Standard API-equivalent token cost |
|---|---:|---|---:|
| Astra-only | 1 | Complete; 13 generated tests + 5 independent checks pass | $0.147976 |
| Astra → Luna → Astra, one Luna repair + Astra review | 5 | Accepted; 9 generated tests + 5 independent checks pass | $0.8916208 |

**Mixed/direct cost ratio: 6.0254. The 0.10 target failed.**
These are calculated token-equivalent estimates using the dated rates in
`examples/config-priced.json`, not measured subscription charges. No cache-write
premiums, hardware or tool costs are included. The Codex traces include substantial
base context overhead. One synthetic example cannot establish general parity,
reliability, latency or cost performance.

The independent suite is `examples/check_normalize.py`; run it on inspected artifacts:

```sh
python3 examples/check_normalize.py runs/20260905-131953-198e9c70/artifacts -v
```

Local evidence:

- Accepted mixed run: `runs/20260905-131953-198e9c70/`
- Astra baseline: `runs/20260905-131804-6f09ad01/`
- Initial rejected run: `runs/20260905-131500-e74f26cb/`
- Initial sandbox startup failure: `runs/20260905-131438-ac048266/`

The first attempted mixed run was rejected after repair. Its estimated token cost
was $0.937729, separately from the paired comparison above. Include that failed-run
cost in any aggregate development/corpus accounting; do not select only accepted
runs to claim savings. Startup failure usage is unknown.

## Defect found and fixed

The first Astra blueprint invented a top-level verification field incompatible with
the executor's JSON schema. Astra now receives the deliverable schema before planning
and an explicit instruction to put structured deliverable content inside artifacts.
A regression test covers this handoff. The corrected live run had no schema conflict.
It caught an incorrect sorting expectation and passed after one bounded repair.

## Interpretation

The architecture produces reviewable artifacts and exposes errors instead of hiding
them. That is useful, but an Astra review on every output does not by itself produce
Astra-level reliability, and more orchestration can cost more than direct execution.

Next experiments should use a repeated, narrowly defined workload with an independent
correctness test. Measure blueprint reuse, direct API overhead and objective checks
before selective Astra review. These optimizations are not implemented in this version;
reducing reviews without adequate tests could lower quality.

The wiki mechanical check found no orphan, broken-link, casing, index or frontmatter
errors. Existing stale-page, historical-brand and un-ingested-source flags remain
outside this task. `git diff --check` passed.
