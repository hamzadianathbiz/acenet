# Adaptive policy benchmark · 8 September 2026

Local real native-subscription calls; policy deployed to Cloudflare on 8 September 2026. Task: the deal-normalization coding brief in `harness/examples/brief.md`. Raw reports, prompts and ledgers live in `harness/runs/adaptive-v2-check/`.

| Call | Input tokens | Output tokens | API equivalent USD |
|---|---:|---:|---:|
| Luna draft | 6,736 | 1,302 | 0.0029096 |
| Astra check/corrections | 9,860 | 649 | 0.1310500 |
| Mixed total | 16,596 | 1,951 | **0.1339596** |
| Independent Astra-only | 8,762 | 2,485 | **0.2118700** |

No cached input was reported. Rates per million tokens: Astra input $10/output $50; Luna input $0.20/output $1.20, matching the shared calculator. Savings: **$0.0779104 API equivalent (36.77%)**. Native ledgers correctly leave actual billed dollars null: subscription allowance is not an API invoice.

Both outputs passed the same five independent acceptance checks. Their own generated test suites also passed (mixed seven, baseline twelve). Astra found a Decimal/cents normalization bug in the draft and supplied three exact replacements. This demonstrates successful checking on one task, not universal quality parity or the 90% cost-reduction target.

The benchmark used the new draft/check policy before final minor native feature-flag and task-instruction refinements. These figures are recorded observations, not a guarantee for every task or final release. Connector research can add substantial native tool context. Optional UI baseline measurement consumes additional allowance and must not be included in normal harness cost when comparing the two alternatives.
