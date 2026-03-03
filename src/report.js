function severityRank(sev) {
  if (sev === 'P0') return 0;
  if (sev === 'P1') return 1;
  return 2;
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

module.exports = { renderMarkdownReport };
