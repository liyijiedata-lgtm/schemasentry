function normalizeIdent(ident) {
  return ident.replace(/"/g, '').trim();
}

function splitSqlList(input) {
  const items = [];
  let current = '';
  let depth = 0;
  let inSingle = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (ch === "'" && input[i - 1] !== '\\') {
      inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (!inSingle) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;

      if (ch === ',' && depth === 0) {
        if (current.trim()) items.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) items.push(current.trim());
  return items;
}

function extractColumnType(def) {
  const stripped = def.replace(/\s+/g, ' ').trim();
  const constraintStart = stripped.search(/\s+(?:NOT\s+NULL|NULL|DEFAULT|CONSTRAINT|PRIMARY\s+KEY|REFERENCES|CHECK|UNIQUE)\b/i);
  if (constraintStart === -1) return stripped;
  return stripped.slice(0, constraintStart).trim();
}

function parseColumnsList(rawCols) {
  return splitSqlList(rawCols)
    .map((c) => normalizeIdent(c.split(/\s+/)[0]))
    .filter(Boolean);
}

function parseCreateTable(sql, tables) {
  const createTableRegex = /CREATE TABLE\s+(?:ONLY\s+)?([^\s(]+)\s*\(([^]*?)\);/gi;
  let m;

  while ((m = createTableRegex.exec(sql)) !== null) {
    const tableName = normalizeIdent(m[1]);
    const body = m[2];
    const entries = splitSqlList(body);

    const table = { name: tableName, columns: [], constraints: [] };

    for (const entryRaw of entries) {
      const entry = entryRaw.trim();
      if (!entry) continue;

      const isTableConstraint = /^(CONSTRAINT\s+\S+\s+)?(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE)\b/i.test(entry);
      if (isTableConstraint) {
        const nameMatch = /^CONSTRAINT\s+([^\s]+)\s+/i.exec(entry);
        const constraintName = nameMatch ? normalizeIdent(nameMatch[1]) : undefined;

        const pkMatch = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(entry);
        if (pkMatch) {
          table.constraints.push({
            type: 'PRIMARY_KEY',
            name: constraintName,
            columns: parseColumnsList(pkMatch[1]),
          });
          continue;
        }

        const uniqueMatch = /UNIQUE\s*\(([^)]+)\)/i.exec(entry);
        if (uniqueMatch) {
          table.constraints.push({
            type: 'UNIQUE',
            name: constraintName,
            columns: parseColumnsList(uniqueMatch[1]),
          });
          continue;
        }

        const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(/i.exec(entry);
        if (fkMatch) {
          table.constraints.push({
            type: 'FOREIGN_KEY',
            name: constraintName,
            columns: parseColumnsList(fkMatch[1]),
            referencesTable: normalizeIdent(fkMatch[2]),
          });
        }
        continue;
      }

      const colNameMatch = /^([^\s]+)\s+(.+)$/s.exec(entry);
      if (!colNameMatch) continue;

      const colName = normalizeIdent(colNameMatch[1]);
      const remainder = colNameMatch[2];
      const type = extractColumnType(remainder).toLowerCase();
      const notNull = /\bNOT\s+NULL\b/i.test(remainder);
      const isPrimaryKeyInline = /\bPRIMARY\s+KEY\b/i.test(remainder);
      const hasReferencesInline = /\bREFERENCES\b/i.test(remainder);

      const column = {
        name: colName,
        type,
        notNull,
        isPrimaryKeyInline,
        hasReferencesInline,
      };
      table.columns.push(column);

      if (isPrimaryKeyInline) {
        table.constraints.push({ type: 'PRIMARY_KEY', columns: [colName] });
      }

      const inlineFkMatch = /REFERENCES\s+([^\s(]+)/i.exec(remainder);
      if (inlineFkMatch) {
        table.constraints.push({
          type: 'FOREIGN_KEY',
          columns: [colName],
          referencesTable: normalizeIdent(inlineFkMatch[1]),
        });
      }
    }

    tables.set(tableName, table);
  }
}

function parseAlterTableConstraints(sql, tables) {
  const alterRegex = /ALTER TABLE\s+(?:ONLY\s+)?([^\s;]+)\s+ADD CONSTRAINT\s+([^\s]+)\s+([^;]+);/gi;
  let m;

  while ((m = alterRegex.exec(sql)) !== null) {
    const tableName = normalizeIdent(m[1]);
    const constraintName = normalizeIdent(m[2]);
    const body = m[3];

    const table = tables.get(tableName);
    if (!table) continue;

    const pk = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(body);
    if (pk) {
      table.constraints.push({
        type: 'PRIMARY_KEY',
        name: constraintName,
        columns: parseColumnsList(pk[1]),
      });
      continue;
    }

    const unique = /UNIQUE\s*\(([^)]+)\)/i.exec(body);
    if (unique) {
      table.constraints.push({
        type: 'UNIQUE',
        name: constraintName,
        columns: parseColumnsList(unique[1]),
      });
      continue;
    }

    const fk = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(/i.exec(body);
    if (fk) {
      table.constraints.push({
        type: 'FOREIGN_KEY',
        name: constraintName,
        columns: parseColumnsList(fk[1]),
        referencesTable: normalizeIdent(fk[2]),
      });
    }
  }
}

function parseIndexes(sql) {
  const indexes = [];
  const indexRegex = /CREATE\s+(UNIQUE\s+)?INDEX\s+([^\s]+)\s+ON\s+(?:ONLY\s+)?([^\s(]+)\s*(?:USING\s+\w+\s*)?\(([^;]+?)\)\s*(?:WHERE\s+[^;]+)?;/gi;
  let m;

  while ((m = indexRegex.exec(sql)) !== null) {
    const unique = Boolean(m[1]);
    const name = normalizeIdent(m[2]);
    const table = normalizeIdent(m[3]);
    const columns = splitSqlList(m[4])
      .map((piece) => normalizeIdent(piece.trim().split(/\s+/)[0]))
      .filter(Boolean);

    indexes.push({ name, table, columns, unique });
  }

  return indexes;
}

function parseEnums(sql) {
  const enums = [];
  const enumRegex = /CREATE TYPE\s+([^\s]+)\s+AS\s+ENUM\s*\(([^;]+)\);/gi;
  let m;

  while ((m = enumRegex.exec(sql)) !== null) {
    const name = normalizeIdent(m[1]);
    const values = splitSqlList(m[2]).map((v) => v.trim().replace(/^'+|'+$/g, ''));
    enums.push({ name, values });
  }

  return enums;
}

function parseSchemaSql(sql) {
  const tables = new Map();

  parseCreateTable(sql, tables);
  parseAlterTableConstraints(sql, tables);

  return {
    tables,
    indexes: parseIndexes(sql),
    enums: parseEnums(sql),
  };
}

module.exports = { parseSchemaSql };
