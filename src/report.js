function severityRank(sev) {
  if (sev === 'P0') return 0;
  if (sev === 'P1') return 1;
  return 2;
}

function toSarifLevel(sev) {
  if (sev === 'P0') return 'error';
  if (sev === 'P1') return 'warning';
  return 'note';
}

function renderMarkdownReport(findings) {
  const summary = {
    P0: findings.filter((f) => f.severity === 'P0').length,
    P1: findings.filter((f) => f.severity === 'P1').length,
    P2: findings.filter((f) => f.severity === 'P2').length,
  };

  const sorted = [...findings].sort((a, b) => {
    const rankDiff = severityRank(a.severity) - severityRank(b.severity);
    if (rankDiff !== 0) return rankDiff;
    return a.id.localeCompare(b.id);
  });

  const lines = [];
  lines.push('# SchemaSentry Report');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- P0: ${summary.P0}`);
  lines.push(`- P1: ${summary.P1}`);
  lines.push(`- P2: ${summary.P2}`);
  lines.push(`- Total findings: ${findings.length}`);
  lines.push('');

  if (sorted.length === 0) {
    lines.push('No findings.');
    return lines.join('\n');
  }

  lines.push('## Findings');
  lines.push('');

  for (let i = 0; i < sorted.length; i += 1) {
    const f = sorted[i];
    lines.push(`### ${i + 1}. [${f.severity}] ${f.title}`);
    lines.push('');
    lines.push(`- Rule ID: \`${f.id}\``);
    lines.push(`- Description: ${f.description}`);
    lines.push(`- Suggested fix: ${f.suggestedFix}`);
    lines.push('- Evidence:');
    for (const ev of f.evidence) {
      lines.push(`  - ${ev}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderSarifReport(findings, opts = {}) {
  const artifactUri = opts.artifactUri || 'schema.sql';

  // De-duplicate rules by id.
  const ruleMap = new Map();
  for (const f of findings) {
    if (!ruleMap.has(f.id)) {
      ruleMap.set(f.id, {
        id: f.id,
        name: f.id,
        shortDescription: { text: f.title },
        fullDescription: { text: f.description },
        help: { text: f.suggestedFix },
        properties: { severity: f.severity },
      });
    }
  }

  const rules = [...ruleMap.values()].sort((a, b) => a.id.localeCompare(b.id));

  const results = findings.map((f) => {
    const evidence = (f.evidence || []).map((e) => `- ${e}`).join('\n');
    const messageParts = [`[${f.severity}] ${f.title}`, f.description];
    if (evidence) messageParts.push('Evidence:\n' + evidence);

    return {
      ruleId: f.id,
      level: toSarifLevel(f.severity),
      message: { text: messageParts.join('\n\n') },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: artifactUri },
          },
        },
      ],
      properties: {
        severity: f.severity,
      },
    };
  });

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'SchemaSentry',
            rules,
          },
        },
        results,
      },
    ],
  };
}

module.exports = { renderMarkdownReport, renderSarifReport };
