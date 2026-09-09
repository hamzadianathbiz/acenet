# ACENET evaluation prompts

Synthetic data only. Run each test separately, attaching only its numbered input file. Do not attach ANSWER-KEY.md. These are small accuracy tests that fit today's app, not a demonstration of bulk ingestion. Run each through the harness and the optional independent Astra baseline, with identical instructions and inputs. The baseline consumes extra allowance. Score outputs before looking at which model produced them.

## 1. Deal reasoning
Attach 01-deal-review.md.

Using only the attachment, write an investment-screening memo of at most 500 words. Reconcile conflicting revenue and EBITDA figures. Calculate evidence-supported adjusted EBITDA, margin and the proposed enterprise-value multiple. Flag concentration and renewal risk. Separate facts from assumptions and unknowns. Cite source letter and page/slide/row for every financial claim. Do not fabricate missing data or present a final investment recommendation.

## 2. Action extraction
Attach 02-delivery-notes.md.

As of 8 September 2026, produce an action register with item, owner, latest agreed deadline, status, dependencies and source reference. Later explicit updates supersede earlier status. Mark deadlines that have passed but were not rescheduled; do not invent replacement dates. Separate suggestions from commitments. Identify the actual blocker and the next useful action. Draft a short internal status update without sending it.

## 3. Spreadsheet reconciliation
Attach 03-invoices.csv.

As of 8 September 2026, calculate overdue unpaid invoices by currency. Remove exact duplicate rows by invoice ID and report what was removed. Exclude paid, void, future-due and credit entries from overdue unpaid totals. Report credit entries separately without netting them. Flag missing amounts without treating them as zero. Do not convert currencies. Return a reconciled table and downloadable CSV, citing invoice IDs for every exception.

## Score each pair

Check ANSWER-KEY.md after both runs. Record critical errors, omitted requirements, unsupported claims, source accuracy, elapsed time and recorded API-equivalent cost. Reject either answer if it makes a critical numerical or status error. A cheaper wrong answer fails. Compare savings only for outputs that pass the same checks. Subscription dollar equivalents are not cash charges. Repeat with representative real files after the synthetic tests; three small examples cannot establish universal quality parity or 90% savings.
