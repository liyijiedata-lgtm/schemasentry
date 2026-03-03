const { parseSchemaSql } = require('./parser');
const { runChecks } = require('./checks');
const { renderMarkdownReport } = require('./report');

function scanSql(sql) {
  const schema = parseSchemaSql(sql);
  return runChecks(schema);
}

function scanSqlToMarkdown(sql) {
  return renderMarkdownReport(scanSql(sql));
}

module.exports = { scanSql, scanSqlToMarkdown };
