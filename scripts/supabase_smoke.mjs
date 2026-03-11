import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(path = ".env") {
  const raw = fs.readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  const env = {};
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadDotEnv(".env");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  "profiles",
  "user_roles",
  "staff_assignments",
  "loan_applications",
  "loan_repayments",
  "branches",
  "regions",
  "loan_products",
  "ai_insights",
  "audit_log",
];

for (const t of tables) {
  // eslint-disable-next-line no-await-in-loop
  const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
  if (error) {
    console.log(`${t}: ERROR ${error.message}`);
  } else {
    console.log(`${t}: count=${count}`);
  }
}

