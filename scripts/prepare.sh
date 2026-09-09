#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd vercel && node prepare.mjs)
node cloud/scripts/prepare-pages.mjs
