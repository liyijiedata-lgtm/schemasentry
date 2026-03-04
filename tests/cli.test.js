const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const bin = path.resolve('bin/schemasentry');
const schema = path.resolve('examples/schema.sql');

// SARIF output to stdout should be valid JSON
{
  const res = spawnSync('node', [bin, 'scan', schema, '--format', 'sarif', '--fail-on', 'none'], { encoding: 'utf8' });
  assert.equal(res.status, 0, `expected exit 0, got ${res.status}, stderr=${res.stderr}`);
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.version, '2.1.0');
}

// CI gate: --fail-on P2 should fail if there are any findings (after ignores)
{
  const res = spawnSync('node', [bin, 'scan', schema, '--format', 'md', '--fail-on', 'P2'], { encoding: 'utf8' });
  assert.equal(res.status, 2, `expected exit 2 when failing gate, got ${res.status}, stderr=${res.stderr}`);
}

// CI gate + ignores: ignore all P0/P1/P2 rules -> should not fail
{
  const tmpConfig = path.resolve('fixtures/tmp-all-ignored.config.json');
  const fs = require('fs');
  fs.writeFileSync(
    tmpConfig,
    JSON.stringify({ ignore: { rules: ['P0_NO_PRIMARY_KEY','P0_FLOAT_FOR_MONEY','P0_TEXT_FOR_TIMESTAMP','P1_NULLABLE_ID_COLUMN','P1_MISSING_INDEX_ON_ID_COLUMN','P2_JSON_USAGE','P2_SERIAL_USAGE','P2_ENUM_USAGE'], tables: [], columns: [] } }, null, 2),
    'utf8'
  );
  const res = spawnSync('node', [bin, 'scan', schema, '--format', 'md', '--fail-on', 'P2', '--config', tmpConfig], { encoding: 'utf8' });
  assert.equal(res.status, 0, `expected exit 0 when all ignored, got ${res.status}, stderr=${res.stderr}`);
  fs.unlinkSync(tmpConfig);
}

console.log('cli tests passed');
