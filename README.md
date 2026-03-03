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

## Output

- Severity: **P0** (stop-ship), **P1** (high), **P2** (medium)
- Evidence: table/column/index/constraint names
- Suggested fix: SQL snippet + explanation

## Checks (v0)

See: [`rules/POSTGRES_RULES_V1.md`](rules/POSTGRES_RULES_V1.md)

## Roadmap

- [ ] GitHub Action (PR comment + CI gate)
- [ ] SARIF export
- [ ] Config file (ignore/allowlist)
- [ ] Connect-to-DB mode (introspect via `information_schema`)

## License

TBD (for now: All rights reserved until we decide open-source vs source-available split).
