#!/bin/bash
set -euo pipefail
ACENET_CODE="${1:-}"
ACENET_PROVIDER="${2:-chatgpt}"
if [[ ! "$ACENET_CODE" =~ ^[A-Z0-9-]{8,40}$ ]] || [[ "$ACENET_PROVIDER" != chatgpt && "$ACENET_PROVIDER" != claude ]]; then
  printf 'Copy a fresh setup command from your ACENET account.\n' >&2; exit 1
fi
ACENET_TEMP="$(mktemp -d "${TMPDIR:-/tmp}/acenet-setup.XXXXXXXX")"
trap 'rm -rf -- "$ACENET_TEMP"' EXIT
printf '\nACENET · Setting up your connection\n'
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 '__ACENET_ORIGIN__/acenet-mac.zip' -o "$ACENET_TEMP/helper.zip"
ACENET_ACTUAL="$(shasum -a 256 "$ACENET_TEMP/helper.zip")"
if [[ "${ACENET_ACTUAL%% *}" != '__ACENET_MAC_SHA256__' ]]; then
  printf 'The helper was updated. Copy a new setup command and try again.\n' >&2; exit 1
fi
unzip -q "$ACENET_TEMP/helper.zip" -d "$ACENET_TEMP/helper"
bash "$ACENET_TEMP/helper/Start-ACENET.command" --code "$ACENET_CODE" --provider "$ACENET_PROVIDER"
