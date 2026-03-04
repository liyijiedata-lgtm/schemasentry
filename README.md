# SchemaSentry (Postgres)

Scan your Postgres schema and catch *future outages* before they ship.

**What it does**
- Parses `pg_dump --schema-only` SQL (or a `schema.sql` file)
- Runs a set of opinionated Postgres schema risk checks
- Produces a report (Markdown/HTML) with evidence + fix suggestions

**Why**
Most production incidents are not “the database is down”. They’re:
- missing constraints → silent data corruption
- wrong indexes → latency spikes and timeouts
- JSONB everywhere → unbounded CPU + hard-to-query data
- enums / migrations mistakes → deploy freezes

SchemaSentry tries to flag those early.

## Quickstart

> MVP mode (no DB access required):

1) Export schema:

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > schema.sql
```

2) Run:

```bash
schemasentry scan schema.sql --format md --out report.md
```

## Local development

```bash
npm install
npm test
npm run scan:example
```

This writes an example report to `examples/report.md`.

## Config (reduce false positives)

Create `schemasentry.config.json` (optional):

```json
{
  "ignore": {
    "rules": ["P2_JSON_USAGE"],
    "tables": ["public.event_log"],
    "columns": ["orders.payload"]
  }
}
```

Run with:

```bash
schemasentry scan schema.sql --out report.md --config schemasentry.config.json
```

## Output

- Severity: **P0** (stop-ship), **P1** (high), **P2** (medium)
- Evidence: table/column/index/constraint names
- Suggested fix: SQL snippet + explanation

## Checks (v0)

See: [`rules/POSTGRES_RULES_V1.md`](rules/POSTGRES_RULES_V1.md)

## Roadmap

- [x] MVP CLI: scan schema.sql → Markdown report
- [x] GitHub Action (PR comment) (shadow mode)
- [x] CI gate (fail on P0/P1/P2 via `--fail-on`, respects ignore config)
- [x] Config file (ignore/allowlist)
- [x] SARIF export (`--format sarif`)
- [ ] Pro ruleset hooks (core vs pro)
- [ ] Connect-to-DB mode (introspect via `information_schema`)

## License

TBD (for now: All rights reserved until we decide open-source vs source-available split).
