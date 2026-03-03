const fs = require('fs');
const path = require('path');
const { scanSqlToMarkdown } = require('./scanner');
const { loadConfig } = require('./config');

function usage() {
  return [
    'Usage:',
    '  schemasentry scan <schema.sql> --format md --out report.md',
    '',
    'Options:',
    '  --format md          Output format (only md is supported in MVP)',
    '  --out <file>         Write report to file (otherwise stdout)',
    '  --config <file>      Optional config file (default: schemasentry.config.json if present)',
  ].join('\n');
}

function parseArgs(args) {
  if (args.length < 2 || args[0] !== 'scan') {
    throw new Error(usage());
  }

  const schemaPath = args[1];
  let format = 'md';
  let outPath;
  let configPath;

  for (let i = 2; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--format') {
      format = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--out') {
      outPath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--config') {
      configPath = args[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  if (format !== 'md') {
    throw new Error(`Unsupported format: ${format}. Only 'md' is available in MVP.`);
  }

  return { command: 'scan', schemaPath, format, outPath, configPath };
}

async function main(args) {
  const parsed = parseArgs(args);
  const sql = fs.readFileSync(parsed.schemaPath, 'utf8');

  const defaultConfig = path.resolve('schemasentry.config.json');
  const config = loadConfig(parsed.configPath || (fs.existsSync(defaultConfig) ? defaultConfig : null));

  const report = scanSqlToMarkdown(sql, { config });

  if (parsed.outPath) {
    const abs = path.resolve(parsed.outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, report, 'utf8');
    if (config && config._path) {
      process.stdout.write(`SchemaSentry report written to ${abs} (config: ${config._path})\n`);
    } else {
      process.stdout.write(`SchemaSentry report written to ${abs}\n`);
    }
    return;
  }

  process.stdout.write(report);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    const message = err && err.message ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  });
}

module.exports = { main };
