# ACENET — Build Plan

_Status: v1 draft, 2026-07-14_
_Owner: Hamza. Doc lives here; code will live in its own repo (`acenet`), per vault rule._

ACENET is a model-orchestration harness: **frontier models plan and verify, open-weight models execute.** The output is the same quality bar at a fraction of the token cost. It becomes a core piece of ACE's infrastructure offer and a named differentiator: private capital firms get enterprise-grade AI with engineered token economics, not frontier-API pass-through.

---

## 1. First Principles

Strip the problem to bedrock:

1. **Token prices differ by ~10–50x.** Frontier output tokens run $15–75/M; strong open-weight models (DeepSeek, Qwen, Llama, Kimi) run $0.30–3/M via commodity inference providers. This gap is structural, not temporary — open weights trail frontier by ~6–12 months and inference is a competitive commodity market.
2. **Most tokens in agentic work are execution, not judgment.** In a typical pipeline, 80–90% of tokens are spent drafting, extracting, transforming, and formatting. The quality-critical decisions — decomposition, acceptance criteria, final review — are a small fraction of total tokens.
3. **Quality is set by the checker, not the doer.** If a frontier model defines the task precisely and verifies the result against explicit criteria, the executor's raw capability matters much less. Weak execution + strong verification + retry/escalate converges on frontier quality.
4. **Errors compound; verification must be cheap.** The design lives or dies on the verify step costing far less than the execution it guards. Rubric-based pass/fail checks are short; that is what makes the math work.

Conclusion built up from these: route the 80–90% execution tokens to open models, keep the 10–20% judgment tokens on frontier, and guarantee a quality floor by escalating failures to frontier. Expected blended cost reduction: **60–85%** at equivalent output quality. That claim, proven with a ledger, is the product.

## 2. KISS — What v1 Is and Is Not

**v1 is:** one pipeline, five steps, one workload, one cost ledger.

**v1 is not:** a general agent framework, a model marketplace, self-hosted GPUs, fine-tuning, a UI product, or multi-tenant SaaS. Every one of those is a later decision that v1's data will inform.

## 3. Architecture (v1)

```
Intake → PLAN (frontier) → EXECUTE (open model) → VERIFY (frontier, terse) → Assemble
                                   ↑ retry w/ feedback (max 2)
                                   ↳ ESCALATE (frontier executes) — quality floor
```

| Component | Model class | Job |
|-----------|------------|-----|
| Planner | Frontier (Claude Opus/Sonnet) | Decompose task into typed task specs: instructions, full context slice, explicit acceptance criteria. Executors are stateless — the spec must be self-contained. |
| Executor | Open-weight (DeepSeek V3, Qwen 3, Llama 4, Kimi K2 — benchmarked, per-task routing later) | Run one task spec. No memory, no judgment calls. |
| Verifier | Frontier, minimal tokens | Grade output against the spec's acceptance criteria. Verdict: pass / retry-with-feedback / escalate. Rubric answers only, no prose. |
| Escalator | Frontier | Executes directly after 2 failed retries. Guarantees output never falls below frontier quality. |
| Ledger | Code, not a model | Per-task record: model used, tokens in/out, cost, verdicts, retries, and the counterfactual frontier-only cost. Savings % is computed, not estimated. |

**Design rules:**
- The ledger is not optional plumbing — it is the sales asset. Every run produces a receipt showing real spend vs frontier-only counterfactual.
- Verify prompts are rubric-based and terse; if verification cost creeps past ~15% of execution savings, the rubric is too fat.
- Escalation rate is the health metric. >20% escalation on a workload means the planner's specs are underspecified or the executor model is wrong for that task type.

## 4. Stack (KISS choices)

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript | Matches existing ACE codebases |
| Model access | Vercel AI SDK + AI Gateway | One API for Anthropic + all open-model providers, built-in failover and per-model cost/usage tracking — no custom provider plumbing |
| Open-model inference | Via gateway (Fireworks/Groq/Together/DeepInfra behind it) | Commodity market; never bind to one provider |
| Runtime | Plain Node service; deploy Railway or Vercel when needed | v1 can run as a CLI — no infra until a client deployment demands it |
| Storage | JSON/SQLite ledger in-repo | No database until volume justifies one |

No queues, no k8s, no self-hosting in v1. Complexity must earn its place with benchmark data.

## 5. First Workload

Pick one workload with **objective acceptance criteria** so verification is cheap and the benchmark is credible.

**Recommended: deal-document processing** — CIM/report → structured extraction + deal summary. High volume in private capital, directly sellable, and correctness is checkable field-by-field. Fallback candidate: ACE's own research-briefing pipeline (dogfooding, but fuzzier criteria).

## 6. Phases

| Phase | Window | Deliverable | Done when |
|-------|--------|-------------|-----------|
| 0 — Spec | Week of Jul 14 | Repo scaffold, task-spec schema, executor model shortlist (bench 3–4 open models on sample tasks) | Schema frozen for v1; executor model picked |
| 1 — MVP loop | By Jul 31 | Full plan→execute→verify→escalate loop on the first workload | 10 real documents processed end-to-end |
| 2 — Benchmark | Early Aug | Same workload run frontier-only vs ACENET; quality graded blind; ledger report | Cost delta + quality parity documented in one report |
| 3 — Harden | Aug | Retry/escalation tuning, ledger dashboard, failure taxonomy | Escalation rate <20%, savings ≥60% sustained |
| 4 — Productize | Sep | Client deployment packaging, case study, LinkedIn narrative (AI-Native Rebuild series fit), tier integration | ACENET named in a T2/T3 SOW |

Phasing is deliberately behind the August revenue push — Phases 0–2 are contained builds that don't compete with /acquire and Rakesh fulfillment; Phase 4's case study then feeds Attract.

## 7. Revenue Tie-In

- **Differentiation:** competitors resell frontier APIs at pass-through cost. ACE engineers the token economics and shows the receipt. "Same quality, 60–85% lower AI spend, here's the ledger" is a first-principles pitch that lands with capital allocators.
- **Offer mapping:** ACENET becomes infrastructure inside T2/T3 engagements (fractional AI team / firm-wide infrastructure), not a separate SKU in v1. The benchmark report doubles as sales collateral and content-engine material.
- **Margin:** every ACENET deployment cuts ACE's own delivery cost of AI-heavy workstreams, which widens margin on flat retainers.

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Verification cost eats savings | Terse rubric verdicts; ledger tracks verify overhead explicitly |
| Open-model quality drift across providers | Gateway failover + pinned model versions; escalation floor catches misses |
| Context loss between planner and stateless executors | Task-spec schema requires self-contained context; escalation rate flags underspecification |
| Benchmark not credible | Blind quality grading; frontier-only counterfactual computed on identical inputs |
| Build distracts from August revenue goal | Phases 0–2 are timeboxed; Phase 4 only starts after a passing benchmark |

## 9. Open Decisions

| Decision | Recommendation |
|----------|----------------|
| First workload | Deal-document extraction (objective criteria) |
| Planner model | Sonnet-class for planning, Opus-class only for escalation — cheaper judgment where it suffices |
| Name in market | Keep "ACENET" internal until benchmark passes; market the outcome ("engineered token economics"), decide branding at Phase 4 |
| Open-source the harness | Defer. Revisit at Phase 4 — could be a lead magnet, but only after it's a proven moat component |

## 10. Next Actions

1. ~~Create `acenet` repo, scaffold TypeScript project with AI SDK + Gateway~~ Done 2026-07-14 — `~/Desktop/acenet`, full pipeline (plan → execute → verify → retry → escalate) + ledger with live-priced frontier counterfactual + bench harness, typecheck clean
2. ~~Freeze v1 task-spec schema~~ Done 2026-07-14 — `src/schema.ts` (instructions / context / acceptanceCriteria / outputFormat, zod)
3. **[Hamza]** Provision a Vercel AI Gateway key → `.env` as `AI_GATEWAY_API_KEY` (dashboard → AI Gateway → API keys; free monthly credits included)
4. Run `npm run models` to confirm live slugs, then `npm run bench` to pick the executor (5 synthetic extraction tasks are in `bench/tasks/`)
5. Collect 10 real deal documents for the Phase 1 corpus (teasers, CIM excerpts, term sheets — anonymized fine)

_Status 2026-07-14: Phase 0 build complete; blocked only on the gateway key for the first live run._

## Current implementation — 2026-09-05

The July plan above is historical. Its referenced `~/Desktop/acenet` code directory
is absent on this machine and no copy was found in the predecessor vault search.
The runnable implementation now lives at [harness/README.md](harness/README.md).

- Python standard library CLI using installed Codex login by default; API and
  compatible local/hosted model adapters are also included.
- Astra plans and reviews; Luna executes and repairs. Full original input survives
  every handoff. Rejected results are never exported as accepted work.
- Actual independent Astra baseline and token ledger replace the old counterfactual.
- “Lossless quality” and “10x cheaper” are targets, not guarantees. The old statements
  that verification/escalation guarantees frontier quality are unsupported.
- Gateway provisioning is not required for this implementation. Repeated real-task
  benchmarks and blind quality grading are still needed before a savings claim.
