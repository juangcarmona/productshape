#!/usr/bin/env bash
# Fetch the verbatim historical OpenSpec packet from ConductionNL/shillinq
# (EUPL-1.2 — kept out of this Apache-2.0 repository; fetched on demand)
# and place it where the replay arms expect it.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
commit=5841441755d8053255a33d143107ba1660e66e1c
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --no-checkout --filter=blob:none https://github.com/ConductionNL/shillinq "$tmp/shillinq"
git -C "$tmp/shillinq" fetch --depth 1 origin "$commit"
git -C "$tmp/shillinq" checkout "$commit" -- openspec/changes/archive/2026-06-14-bookkeeping-vat-btw-filing
src="$tmp/shillinq/openspec/changes/archive/2026-06-14-bookkeeping-vat-btw-filing"
for dest in "$here/pilot" "$here/pilot-b"; do
  [ -d "$dest" ] || continue
  mkdir -p "$dest/openspec/changes/bookkeeping-vat-btw-filing"
  cp -r "$src/proposal.md" "$src/design.md" "$src/tasks.md" "$src/context-brief.md" "$src/specs" \
    "$dest/openspec/changes/bookkeeping-vat-btw-filing/"
done
echo "Packet fetched at $commit."
