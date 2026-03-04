const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { scanSql } = require('../src/scanner');
const { renderMarkdownReport, renderSarifReport } = require('../src/report');

const sqlPath = path.resolve('examples/schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const findings = scanSql(sql);

assert.ok(findings.length >= 6, `expected at least 6 findings, got ${findings.length}`);

const ids = findings.map((f) => f.id);
assert.ok(ids.includes('P0_FLOAT_FOR_MONEY'), 'should flag float money risk');
assert.ok(ids.includes('P0_TEXT_FOR_TIMESTAMP'), 'should flag text timestamp risk');
assert.ok(ids.includes('P1_NULLABLE_ID_COLUMN'), 'should flag nullable *_id column');
assert.ok(ids.includes('P1_MISSING_INDEX_ON_ID_COLUMN'), 'should flag missing index on *_id');
assert.ok(ids.includes('P2_JSON_USAGE'), 'should flag json usage');
assert.ok(ids.includes('P2_SERIAL_USAGE'), 'should flag serial usage');
assert.ok(ids.includes('P2_ENUM_USAGE'), 'should flag enum usage');

// Ignore support (to reduce false positives)
const ignored = scanSql(sql, { config: { ignore: { rules: ['P2_JSON_USAGE'], tables: [], columns: [] } } });
assert.ok(!ignored.map((f) => f.id).includes('P2_JSON_USAGE'), 'ignore.rules should remove matching findings');

const report = renderMarkdownReport(findings);
assert.ok(report.includes('# SchemaSentry Report'), 'report should include title');
assert.ok(report.includes('## Summary'), 'report should include summary');
assert.ok(report.includes('## Findings'), 'report should include findings section');

const sarif = renderSarifReport(findings, { artifactUri: 'schema.sql' });
assert.equal(sarif.version, '2.1.0');
assert.ok(Array.isArray(sarif.runs) && sarif.runs.length === 1, 'sarif should include one run');
assert.ok(sarif.runs[0].tool && sarif.runs[0].tool.driver, 'sarif should include tool.driver');
assert.ok(Array.isArray(sarif.runs[0].results), 'sarif should include results');
assert.ok(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri === 'schema.sql');

console.log(`tests passed with ${findings.length} findings`);
