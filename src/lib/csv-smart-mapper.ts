/**
 * Intelligent CSV column mapper with fuzzy matching and data-pattern detection.
 */

// ── Aliases: common CSV header variants → canonical DB column names ──────────
const ALIAS_MAP: Record<string, string[]> = {
  // loan_applications
  full_name: ["name", "full name", "fullname", "client name", "client", "applicant", "borrower", "customer name", "customer"],
  phone: ["phone", "phone number", "tel", "telephone", "mobile", "cell", "contact", "phone_number", "contact_number", "msisdn"],
  email: ["email", "e-mail", "email address", "mail", "email_address"],
  business_type: ["business type", "business", "sector", "industry", "type of business", "business_type", "category"],
  financing_amount: ["amount", "financing amount", "loan amount", "requested amount", "financing_amount", "principal", "loan_amount"],
  location: ["location", "address", "area", "town", "city", "county", "region", "place"],
  business_description: ["description", "business description", "business_description", "details", "notes", "about"],
  // branches
  name: ["name", "branch name", "branch", "title"],
  code: ["code", "branch code", "branch_code", "region code", "region_code", "short code"],
  region_id: ["region id", "region_id", "region"],
  // loan_products
  interest_rate: ["interest rate", "interest_rate", "rate", "interest", "apr"],
  term_weeks: ["term weeks", "term_weeks", "term", "weeks", "duration", "tenure", "period"],
  min_amount: ["min amount", "min_amount", "minimum", "min", "minimum amount"],
  max_amount: ["max amount", "max_amount", "maximum", "max", "maximum amount"],
  processing_fee_percent: ["processing fee", "processing_fee_percent", "fee", "processing fee percent", "fee percent"],
  description: ["description", "desc", "details", "notes"],
};

// ── Data-pattern detectors ──────────────────────────────────────────────────
const PATTERN_DETECTORS: { field: string; test: (values: string[]) => number }[] = [
  {
    field: "phone",
    test: (vals) => {
      const phoneRe = /^[+]?\d[\d\s\-()]{6,15}$/;
      return vals.filter(v => phoneRe.test(v.trim())).length / Math.max(vals.length, 1);
    },
  },
  {
    field: "email",
    test: (vals) => {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return vals.filter(v => emailRe.test(v.trim())).length / Math.max(vals.length, 1);
    },
  },
  {
    field: "financing_amount",
    test: (vals) => {
      const numRe = /^[KkSs$€£]?\s?[\d,]+\.?\d*$/;
      const matches = vals.filter(v => numRe.test(v.trim()) && parseFloat(v.replace(/[^0-9.]/g, "")) > 100);
      return matches.length / Math.max(vals.length, 1);
    },
  },
  {
    field: "interest_rate",
    test: (vals) => {
      const matches = vals.filter(v => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n < 100;
      });
      return matches.length / Math.max(vals.length, 1) * 0.5; // lower confidence — many columns have small numbers
    },
  },
  {
    field: "location",
    test: (vals) => {
      // heuristic: mostly alpha strings with spaces, avg length > 4
      const alpha = vals.filter(v => /^[A-Za-z\s,.-]{3,}$/.test(v.trim()));
      return alpha.length / Math.max(vals.length, 1) * 0.4;
    },
  },
];

// ── Normalise header for comparison ─────────────────────────────────────────
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Levenshtein distance (for short strings, simple impl) ───────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

export interface ColumnMapping {
  csvHeader: string;
  dbColumn: string | null;
  confidence: number; // 0-1
  method: "exact" | "alias" | "fuzzy" | "pattern" | "manual";
  sampleValues: string[];
}

/**
 * Given CSV headers, target DB columns, and a few sample rows,
 * produce an intelligent best-guess mapping for each CSV column.
 */
export function autoMapColumns(
  csvHeaders: string[],
  targetColumns: string[],
  sampleRows: Record<string, string>[]
): ColumnMapping[] {
  const samples = (header: string) => sampleRows.map(r => r[header] ?? "").filter(Boolean).slice(0, 10);
  const usedDb = new Set<string>();

  // Phase 1: exact & alias matching
  const mappings: ColumnMapping[] = csvHeaders.map(csvH => {
    const norm = normalise(csvH);
    const vals = samples(csvH);

    // exact
    for (const db of targetColumns) {
      if (usedDb.has(db)) continue;
      if (normalise(db) === norm) {
        usedDb.add(db);
        return { csvHeader: csvH, dbColumn: db, confidence: 1, method: "exact" as const, sampleValues: vals };
      }
    }
    // alias
    for (const db of targetColumns) {
      if (usedDb.has(db)) continue;
      const aliases = ALIAS_MAP[db] ?? [];
      if (aliases.some(a => normalise(a) === norm || norm.includes(normalise(a)))) {
        usedDb.add(db);
        return { csvHeader: csvH, dbColumn: db, confidence: 0.9, method: "alias" as const, sampleValues: vals };
      }
    }
    return { csvHeader: csvH, dbColumn: null, confidence: 0, method: "manual" as const, sampleValues: vals };
  });

  // Phase 2: fuzzy for unmatched
  for (const m of mappings) {
    if (m.dbColumn) continue;
    const norm = normalise(m.csvHeader);
    let bestDb: string | null = null;
    let bestScore = 0;
    for (const db of targetColumns) {
      if (usedDb.has(db)) continue;
      const dist = levenshtein(norm, normalise(db));
      const maxLen = Math.max(norm.length, db.length);
      const sim = maxLen > 0 ? 1 - dist / maxLen : 0;
      if (sim > 0.55 && sim > bestScore) { bestScore = sim; bestDb = db; }
    }
    if (bestDb) {
      m.dbColumn = bestDb;
      m.confidence = Math.round(bestScore * 100) / 100;
      m.method = "fuzzy";
      usedDb.add(bestDb);
    }
  }

  // Phase 3: data-pattern detection for remaining
  for (const m of mappings) {
    if (m.dbColumn) continue;
    if (m.sampleValues.length === 0) continue;
    let bestField: string | null = null;
    let bestConf = 0.5; // threshold
    for (const det of PATTERN_DETECTORS) {
      if (usedDb.has(det.field) || !targetColumns.includes(det.field)) continue;
      const conf = det.test(m.sampleValues);
      if (conf > bestConf) { bestConf = conf; bestField = det.field; }
    }
    if (bestField) {
      m.dbColumn = bestField;
      m.confidence = Math.round(bestConf * 100) / 100;
      m.method = "pattern";
      usedDb.add(bestField);
    }
  }

  return mappings;
}

/**
 * Apply a mapping to transform raw CSV rows into DB-ready objects.
 */
export function applyMapping(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  numericFields: string[]
): Record<string, unknown>[] {
  const activeMap = mappings.filter(m => m.dbColumn);
  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    for (const m of activeMap) {
      const raw = row[m.csvHeader]?.trim() ?? "";
      if (!raw) continue;
      if (numericFields.includes(m.dbColumn!)) {
        obj[m.dbColumn!] = parseFloat(raw.replace(/[^0-9.-]/g, "")) || 0;
      } else {
        obj[m.dbColumn!] = raw;
      }
    }
    return obj;
  });
}
