const fs = require('fs');
const path = require('path');

/**
 * Minimal config to reduce false positives (high-precision default).
 *
 * Supported shape:
 * {
 *   "ignore": {
 *     "rules": ["P2_JSON_USAGE"],
 *     "tables": ["public.some_table"],
 *     "columns": ["orders.user_id"]
 *   }
 * }
 */
function loadConfig(configPath) {
  if (!configPath) return null;
  const abs = path.resolve(configPath);
  if (!fs.existsSync(abs)) return null;

  const raw = fs.readFileSync(abs, 'utf8');
  const json = JSON.parse(raw);

  const ignore = (json && json.ignore) || {};
  const rules = Array.isArray(ignore.rules) ? ignore.rules.map(String) : [];
  const tables = Array.isArray(ignore.tables) ? ignore.tables.map(String) : [];
  const columns = Array.isArray(ignore.columns) ? ignore.columns.map(String) : [];

  return { ignore: { rules, tables, columns }, _path: abs };
}

function applyIgnores(findings, config) {
  if (!config || !config.ignore) return findings;
  const ignoreRules = new Set(config.ignore.rules || []);
  const ignoreTables = new Set(config.ignore.tables || []);
  const ignoreColumns = new Set(config.ignore.columns || []);

  // Heuristic mapping: evidence strings often include "table.col" or "table col".
  function findingMentionsIgnoredTarget(f) {
    const evidence = Array.isArray(f.evidence) ? f.evidence : [];

    for (const ev of evidence) {
      // direct column match (table.column)
      for (const c of ignoreColumns) {
        if (ev.includes(c)) return true;
      }
      // table match
      for (const t of ignoreTables) {
        if (ev.includes(`table ${t}`) || ev.startsWith(`${t}.`) || ev.includes(`${t}.`)) return true;
      }
    }
    return false;
  }

  return findings.filter((f) => {
    if (ignoreRules.has(f.id)) return false;
    if (findingMentionsIgnoredTarget(f)) return false;
    return true;
  });
}

module.exports = { loadConfig, applyIgnores };
