const fs = require('fs');
const path = require('path');
const { scanSql } = require('./scanner');
const { renderMarkdownReport, renderSarifReport } = require('./report');
const { loadConfig } = require('./config');

function usage() {
  return [
    'Usage:',
    '  schemasentry scan <schema.sql> --format md --out report.md',
    '',
    'Options:',
    "  --format <md|sarif>       Output format (default: md)",
    '  --out <file>              Write report to file (otherwise stdout)',
    '  --config <file>           Optional config file (default: schemasentry.config.json if present)',
    '  --fail-on <P0|P1|P2|none> CI gate: exit non-zero if findings at/above threshold exist (default: P0)',
  ].join('\n');
}

function severityRank(sev) {
  if (sev === 'P0') return 0;
  if (sev === 'P1') return 1;
  return 2;
}

function shouldFail(findings, failOn) {
  if (!failOn || failOn === 'NONE') return false;
  const thresholdRank = severityRank(failOn);
  return findings.some((f) => severityRank(f.severity) <= thresholdRank);
}

function countBySeverity(findings) {
  const counts = { P0: 0, P1: 0, P2: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}

function parseArgs(args) {
  if (args.length < 2 || args[0] !== 'scan') {
    throw new Error(usage());
  }

  const schemaPath = args[1];
  let format = 'md';
  let outPath;
  let configPath;
  let failOn = 'P0';

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
    if (arg === '--fail-on') {
      failOn = (args[i + 1] || '').toUpperCase();
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  if (!['md', 'sarif'].includes(format)) {
    throw new Error(`Unsupported format: ${format}. Supported: md, sarif.`);
  }

  if (failOn && !['P0', 'P1', 'P2', 'NONE'].includes(failOn)) {
    throw new Error(`Unsupported --fail-on value: ${failOn}. Supported: P0, P1, P2, none.`);
  }

  return { command: 'scan', schemaPath, format, outPath, configPath, failOn };
}

async function main(args) {
  const parsed = parseArgs(args);
  const sql = fs.readFileSync(parsed.schemaPath, 'utf8');

  const defaultConfig = path.resolve('schemasentry.config.json');
  const config = loadConfig(parsed.configPath || (fs.existsSync(defaultConfig) ? defaultConfig : null));

  const findings = scanSql(sql, { config });

  let output;
  if (parsed.format === 'md') {
    output = renderMarkdownReport(findings);
  } else if (parsed.format === 'sarif') {
    const sarif = renderSarifReport(findings, { artifactUri: path.basename(parsed.schemaPath) });
    output = JSON.stringify(sarif, null, 2);
  }

  if (parsed.outPath) {
    const abs = path.resolve(parsed.outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, output, 'utf8');
    if (config && config._path) {
      process.stdout.write(`SchemaSentry report written to ${abs} (config: ${config._path})\n`);
    } else {
      process.stdout.write(`SchemaSentry report written to ${abs}\n`);
    }
  } else {
    process.stdout.write(output);
  }

  if (shouldFail(findings, parsed.failOn)) {
    const counts = countBySeverity(findings);
    const threshold = parsed.failOn;
    const thresholdRank = severityRank(threshold);
    const triggered = findings
      .filter((f) => severityRank(f.severity) <= thresholdRank)
      .map((f) => f.id);

    const uniqueTriggered = Array.from(new Set(triggered)).sort();

    process.stderr.write(
      [
        `SchemaSentry CI gate: FAIL (fail-on=${threshold})`,
        `Findings (post-ignore): P0=${counts.P0} P1=${counts.P1} P2=${counts.P2}`,
        `Triggered rules: ${uniqueTriggered.join(', ')}`,
        `Tip: use --fail-on none to disable the gate, or add ignores in schemasentry.config.json.`,
      ].join('\n') +
        '\n',
    );

    process.exitCode = 2;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    const message = err && err.message ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  });
}

module.exports = { main };
