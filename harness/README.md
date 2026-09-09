# ACENET: Astra brain, replaceable body

A runnable local harness for briefs → plans → reviewed documents and code artifacts.
Python 3.9+, standard library only. Defaults to your installed Codex CLI/login:
`gpt-6-astra` plans and reviews; `gpt-5.6-luna` executes. No API key needed for the
Codex backend if your login has model access. Model availability is account-specific.

```text
Original brief + explicitly supplied context
                  |
            ASTRA blueprint
     requirements, ordered steps, dependencies,
     acceptance criteria, assembly instructions
                  |
         LUNA executes each step
      full brief + plan + dependency outputs
                  |
        LUNA assembles if multiple steps
                  |
            ASTRA reviews
             /         \
          pass         fail → LUNA repairs once → ASTRA reviews
           |                                  |
      final artifacts                 fail → needs_human_review
```

## Run

From this directory:

```sh
python3 harness.py run examples/brief.md
python3 harness.py run /path/to/brief.md --context /path/to/source.md
python3 -m unittest discover -s tests -v
```

Each run creates a unique folder under `runs/`. CLI prints the absolute path.
Open `answer.md` and `artifacts/` for accepted work; `blueprint.json` is Astra's
execution path. `candidate-*.json`, `review-*.json`, `steps.json`, `calls/` and
`ledger.json` preserve the intermediate evidence. `report.json` records status.
Nonzero exit means failed or needs human review; never treat it as accepted.
Existing output directories are refused, so previous work is not overwritten.
Run folders may contain sensitive supplied content and are gitignored.

The model produces file contents; the Python harness exports them to the run's
artifact directory only. It does not apply changes to an existing repository,
execute generated code, deploy, send messages, or install dependencies. Give
source files explicitly with repeated `--context`; binary attachments are not supported.
For large inputs the harness fails instead of silently truncating them.

## Swap the body

- **Codex login:** default `config.json`.
- **OpenAI API:** `--config examples/config-api.json`, with `OPENAI_API_KEY` set in
  your environment. This uses the Responses API; no credentials in config files.
- **Local/open model:** copy `examples/config-local-body.json` to `config.local.json`;
  set `body.model` to an installed model served by Ollama. Start that server first.
  Then pass `--config config.local.json`. A compatible local server can use another
  `body.base_url`. Local bodies must support Chat Completions JSON mode.
- **Hosted compatible body:** set `backend: "chat"`, HTTPS `base_url`, model ID and
  `key_env` pointing to the provider key's environment variable.

No automatic model substitution or expensive Astra takeover. If the chosen body
cannot satisfy the contract, failure remains visible so you can change the model
or improve the plan. HTTP calls have no hidden retry loop.

Codex calls run with `--ignore-user-config`, `--ephemeral`, `--sandbox read-only`
and a temporary working directory outside the vault. These settings avoid
implicitly loading the vault and configured MCP integrations. Saved authentication
is still used. This is not a filesystem confidentiality sandbox: Codex may retain
read access to other local paths. Use the API backend for a model with no local tools.
The prompt instructs Codex to return JSON without tools, but that instruction alone
is not a tool prohibition enforced by the harness.

## What “lossless” means here

The original brief and all explicitly supplied context are carried verbatim to
every call; the blueprint never replaces them. Dependency outputs also pass intact.
Every criterion must be assigned to a step and reviewed exactly once. Astra checks
both the blueprint and the original brief, so omissions in its own plan can fail review.
Malformed output, missing criteria, incomplete provider responses and unsafe paths
fail closed. One repair is allowed by default. Reviews are model judgments, not proof
of factual correctness or code execution. Run the resulting code's tests separately.

**No system can promise universally lossless Astra quality for 10% of Astra cost.**
Astra can miss errors. Repeated reviews and repairs may cost more than doing the task
with Astra directly. This implementation deliberately reports quality parity as
unmeasured even after Astra accepts a result.

## Measure the target

Run both paths with the same brief and context:

```sh
python3 harness.py run examples/brief.md --out runs/mixed-example
python3 harness.py baseline examples/brief.md --out runs/astra-example
python3 harness.py compare runs/mixed-example runs/astra-example
```

The baseline is an actual independent Astra completion, not Luna's token usage
repriced as Astra. Mixed cost includes planning, execution, assembly, every review
and repair. The baseline has one direct Astra call. Comparison verifies identical
input hashes; it reports cost ratio only when both costs are known and mixed work
was accepted. A ratio ≤0.10 meets the cost target for that task, not quality parity.

Set `rates` per model in a private config to verified USD per million tokens:

```json
{"input": 0, "cached_input": 0, "output": 0}
```

The zeros above illustrate the shape, **not model pricing**. Use real provider
rates. Defaults are `null` so unknown spend is never called free. Ledger token counts
come from provider responses. Dollar figures are calculated estimates using your
rates, not billing receipts; subscription charges, local electricity/hardware and
tool charges are excluded. For Codex subscriptions, token-equivalent API cost is not
your subscription bill. Cached input is priced separately. Failed calls may have
unknown usage; such runs keep total cost unknown.

`max_calls` bounds model invocations; `max_repairs` bounds rework. `stop_after_usd`
can stop the NEXT call once the recorded total reaches a threshold, but it is not a
hard spend cap: the in-flight call can exceed it. It requires known prices and usage.
Use provider-side budgets for billing control. `max_output_tokens` limits API output;
it is not supported as a hard bound for the Codex adapter.

Before claiming parity: select 20–50 representative real tasks, define objective
checks and a grading rubric before seeing outputs, run both paths, randomize labels
for human graders, record correctness/completeness/usefulness and critical failures.
Include rejected runs and repair costs in aggregate economics. Re-run for each body
model. A small passing synthetic task does not establish a general quality claim.

Economics: if the body's relative execution cost is r and Astra planning/review
cost is p times an Astra-only run, the blended ratio is approximately p + r.
To hit 0.10 with r=0.05, the Astra overhead must stay below 0.05. This is a simplified
planning model, not a measured result. Short tasks often cannot amortize that overhead.

## Extension points and limits

`Harness(config, new_directory, provider=...)` is importable from `harness.py`.
A provider returns `(JSON_text, usage)`; tests use deterministic providers and mock
transport responses. Runtime calls are sequential. No resume, shared blueprint
cache, corpus dashboard or automatic execution of generated tests in this version.
Keep the first workload small enough to fit one plan and a few execution steps.

An invalid schema or provider error stops the run with its trace preserved. Improve
or rerun deliberately; the harness does not spend repeatedly to repair JSON errors.

## Integration references

Verified 2026-09-05:
- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)

The July ACENET plan at `../plan.md` is historical. Its external code path is absent
on this machine. This Python implementation uses the installed CLI without needing
a gateway account, and replaces the old quality-guarantee claims with explicit
acceptance states and empirical comparison.

### Dated pricing example

`examples/config-priced.json` contains standard rates read from the official model
pages on 2026-09-05: Astra $10 input / $1 cached input / $50 output; Luna $0.20 /
$0.02 / $1.20 per million tokens. These are token-equivalent estimates, not a Codex
subscription bill. Cache-write premiums and long-context pricing are not included.
Use only for requests below 272K input tokens and recheck rates before relying on them.
You can price an older unpriced trace without modifying it:

```sh
python3 harness.py compare runs/mixed-example runs/astra-example --rates-config examples/config-priced.json
```

## Measured status

See [VALIDATION.md](VALIDATION.md). Twenty harness tests passed. The live mixed run
was accepted and its code passed the example checks, but cost approximately 6.03x
an Astra-only completion on that small task. The 10x savings target was not met.
