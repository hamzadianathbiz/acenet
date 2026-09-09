#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHONPATH=harness python3 -m unittest discover -s harness/tests
python3 -m unittest discover -s connector/tests
node --test cloud/plan-runtime/tests/*.test.mjs vercel/tests/plan.test.mjs vercel/tests/local_models.test.mjs vercel/tests/openrouter.test.mjs vercel/tests/permissions.test.mjs
node --check app/public/account.js
