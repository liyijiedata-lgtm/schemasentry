#!/usr/bin/env bash
set -euo pipefail

SCHEMA_PATH="${1:-schema.sql}"
REPORT_PATH="${2:-schemasentry-report.md}"
FAIL_ON_P0="${3:-false}"
COMMENT_MODE="${4:-comment}"

if [[ ! -f "$SCHEMA_PATH" ]]; then
  echo "SchemaSentry: schema file not found: $SCHEMA_PATH" >&2
  exit 2
fi

# Run scanner
node "$(dirname "$0")/../../../bin/schemasentry" scan "$SCHEMA_PATH" --format md --out "$REPORT_PATH"

# Extract summary counts (best-effort)
P0=$(grep -E "^- P0:" "$REPORT_PATH" | head -n1 | sed -E 's/[^0-9]*([0-9]+).*/\1/' || true)
P1=$(grep -E "^- P1:" "$REPORT_PATH" | head -n1 | sed -E 's/[^0-9]*([0-9]+).*/\1/' || true)
P2=$(grep -E "^- P2:" "$REPORT_PATH" | head -n1 | sed -E 's/[^0-9]*([0-9]+).*/\1/' || true)
P0=${P0:-0}; P1=${P1:-0}; P2=${P2:-0}

echo "SchemaSentry summary: P0=$P0 P1=$P1 P2=$P2"

# Comment on PR if available
if [[ "$COMMENT_MODE" == "comment" ]] && [[ -n "${GITHUB_TOKEN:-}" ]] && [[ -n "${GITHUB_EVENT_PATH:-}" ]] && command -v jq >/dev/null 2>&1; then
  PR_NUMBER=$(jq -r '.pull_request.number // empty' "$GITHUB_EVENT_PATH")
  REPO=$(jq -r '.repository.full_name // empty' "$GITHUB_EVENT_PATH")

  if [[ -n "$PR_NUMBER" && -n "$REPO" ]]; then
    echo "Posting SchemaSentry report comment to PR #$PR_NUMBER in $REPO"

    BODY=$(python3 - <<'PY'
import json, os, re
path = os.environ['REPORT_PATH']
with open(path,'r',encoding='utf-8') as f:
    report = f.read()

# Extract short summary counts (best-effort)
get = lambda k: re.search(rf"^- {k}:\s*([0-9]+)\s*$", report, re.M)
P0 = int(get('P0').group(1)) if get('P0') else 0
P1 = int(get('P1').group(1)) if get('P1') else 0
P2 = int(get('P2').group(1)) if get('P2') else 0

# keep PR comments bounded
max_len = 60000
if len(report) > max_len:
    report = report[:max_len] + "\n\n...(truncated)"

header = "## SchemaSentry (schema risk scan)\n\n"
summary = f"**Summary:** P0={P0} · P1={P1} · P2={P2}\n\n"

wrapped = header + summary + "<details>\n<summary>Details</summary>\n\n" + report + "\n\n</details>\n"
print(json.dumps({'body': wrapped}))
PY
)

    curl -sS -X POST \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments" \
      -d "$BODY" >/dev/null
  else
    echo "Not a PR event; skip commenting."
  fi
else
  echo "Skipping comment (mode=$COMMENT_MODE)."
fi

if [[ "$FAIL_ON_P0" == "true" || "$FAIL_ON_P0" == "1" ]]; then
  if [[ "$P0" =~ ^[0-9]+$ ]] && (( P0 > 0 )); then
    echo "SchemaSentry: failing because P0 findings > 0" >&2
    exit 10
  fi
fi
