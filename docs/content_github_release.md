# SchemaSentry v0 – Postgres schema risk scanner

Production incidents often start *before* runtime: in the schema.

SchemaSentry scans a Postgres `schema.sql` (from `pg_dump --schema-only`) and generates a report of:
- missing keys / constraints
- index pitfalls
- risky types (money/time)
- JSONB anti-patterns
- enum/migration friction

## Why I built it
Teams move fast, schemas drift, and reviews miss the same things again and again.
This is a “schema linter” with incident-shaped opinions.

## What’s next
- GitHub Action for PR comments + CI gate
- SARIF export
- Config ignore/allowlist

If you have a schema sample you can share (even sanitized), I’ll tune the rules and reduce false positives.
