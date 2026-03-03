#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

for f in "$ROOT"/fixtures/*.sql; do
  base=$(basename "$f" .sql)
  out="$ROOT/fixtures/${base}.report.md"
  echo "==> $base"
  node "$ROOT/bin/schemasentry" scan "$f" --out "$out" >/dev/null
  grep -E "^- P0:|^- P1:|^- P2:" "$out" | sed "s/^/  /"
done
