#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
printf '\nACENET · Preparing your connection\n\n'
UV="$HOME/.local/bin/uv"
if [ ! -x "$UV" ]; then
  if command -v uv >/dev/null 2>&1; then UV="$(command -v uv)"; else
    printf 'Installing the Python runtime manager for your user account…\n'
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi
fi
"$UV" python install 3.12
ACENET_PYTHON="$("$UV" python find 3.12)"
"$ACENET_PYTHON" setup.py "$@"
