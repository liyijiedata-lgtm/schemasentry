# SchemaSentry – Postgres Rules v1 (Draft)

Severity levels:
- **P0**: stop-ship / high probability of incident or data corruption
- **P1**: high risk / strong performance or correctness impact
- **P2**: medium risk / maintainability or latent perf issues

> Notes: v1 targets **static schema-only SQL**. Some checks can only be “heuristic”.

## P0 (Stop-ship)

1) **No primary key** on a table
- Evidence: `CREATE TABLE ...` without `PRIMARY KEY`
- Risk: duplicates, broken replication/ETL assumptions, impossible safe updates
- Fix: add surrogate PK, or define natural PK

2) **Large table with no usable index for common access pattern (heuristic)**
- Evidence: table has many columns, no PK, and no indexes; or only non-selective indexes
- Risk: sequential scans → timeouts
- Fix: add PK + essential btree indexes

3) **Using `FLOAT/REAL` for money**
- Evidence: `real`, `double precision` on monetary columns (name-based heuristic: `amount`, `price`, `cost`)
- Risk: rounding errors → financial bugs
- Fix: `numeric(, )` or integer cents

4) **`TEXT/VARCHAR` used for timestamps**
- Evidence: column name contains `time`, `date`, `created`, `updated` but type is `text/varchar`
- Risk: wrong ordering, parsing bugs, slow queries
- Fix: `timestamptz`/`timestamp`/`date`

5) **Missing NOT NULL on key business identifiers (heuristic)**
- Evidence: columns like `user_id`, `order_id`, `tenant_id` nullable
- Risk: silent orphan records, broken joins
- Fix: `SET NOT NULL` + backfill

## P1 (High)

6) **No UNIQUE constraint where natural uniqueness is implied (heuristic)**
- Evidence: columns like `email`, `phone`, `external_id` without unique index/constraint
- Risk: duplicates → auth/accounting bugs
- Fix: `CREATE UNIQUE INDEX CONCURRENTLY ...`

7) **Overuse of `jsonb` as primary storage**
- Evidence: `jsonb` columns named `data`, `payload`, `meta` without supporting generated columns or indexes
- Risk: hard-to-index queries, CPU heavy, app logic sprawl
- Fix: extract hot fields to typed columns; add GIN indexes where needed

8) **No foreign keys in a relational domain (heuristic)**
- Evidence: many `_id` columns but zero `FOREIGN KEY`
- Risk: orphan records, inconsistent deletes
- Fix: add FKs (maybe `NOT VALID` then validate)

9) **FK without index on referencing column**
- Evidence: foreign key exists on `child(parent_id)` but no index on `child(parent_id)`
- Risk: deletes/updates on parent become slow/locky
- Fix: `CREATE INDEX CONCURRENTLY ...` on FK columns

10) **Enum type used for frequently-changing business states**
- Evidence: `CREATE TYPE ... AS ENUM` on columns like `status`, `state`
- Risk: deploy freezes / migration friction
- Fix: lookup table + FK, or smallint + app mapping

11) **No `updated_at` on mutable tables (heuristic)**
- Evidence: missing `updated_at`/`modified_at` columns
- Risk: hard to audit, debug, sync
- Fix: add column + trigger or app-managed update

## P2 (Medium)

12) **Inconsistent naming / reserved keywords**
- Evidence: mixed casing, quoted identifiers, or reserved words
- Risk: tooling friction, bugs
- Fix: standardize naming (snake_case)

13) **Indexes with low value / redundancy**
- Evidence: duplicate indexes, same columns/order; or index is prefix of another
- Risk: write amplification
- Fix: drop redundant indexes (carefully)

14) **Overly-wide indexes**
- Evidence: btree index with many columns (e.g., >4)
- Risk: big index size, slow writes
- Fix: reduce columns; consider partial indexes

15) **Missing partial indexes for soft delete patterns (heuristic)**
- Evidence: `deleted_at` exists but no partial indexes excluding deleted rows
- Risk: queries scan deleted data
- Fix: `WHERE deleted_at IS NULL` partial indexes

16) **No `tenant_id` index in multi-tenant schema (heuristic)**
- Evidence: `tenant_id` exists but no index/partitioning hints
- Risk: cross-tenant scans
- Fix: add composite index starting with tenant_id

17) **Text columns without length constraints where appropriate**
- Evidence: `text` on fields like `country_code`, `currency`
- Risk: data quality drift
- Fix: use `char(2)`, `varchar(3)`, CHECK constraints

---

## Rule format (internal draft)

Each rule will eventually be expressed as:
- id
- title
- severity
- match (AST pattern)
- evidence extractor
- fix suggestion template
