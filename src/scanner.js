const { parseSchemaSql } = require('./parser');
const { runChecks } = require('./checks');
const { renderMarkdownReport } = require('./report');
const { applyIgnores } = require('./config');

function scanSql(sql, opts = {}) {
  const schema = parseSchemaSql(sql);
  const findings = runChecks(schema);
  return applyIgnores(findings, opts.config);
}

function scanSqlToMarkdown(sql, opts = {}) {
  return renderMarkdownReport(scanSql(sql, opts));
}

module.exports = { scanSql, scanSqlToMarkdown };
