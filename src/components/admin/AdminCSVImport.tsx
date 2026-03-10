import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, Loader2, X, CheckCircle, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { parseCSV } from "@/lib/csv-utils";
import { autoMapColumns, applyMapping, ColumnMapping } from "@/lib/csv-smart-mapper";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type ImportTarget = "loan_applications" | "branches" | "regions" | "loan_products" | "staff_assignments" | "loan_repayments";

const TEMPLATES: Record<ImportTarget, { headers: string[]; required: string[]; label: string; numericFields: string[] }> = {
  loan_applications: {
    headers: ["full_name", "phone", "email", "business_type", "financing_amount", "location", "business_description"],
    required: ["full_name", "phone", "business_type"],
    label: "Loan Applications",
    numericFields: [],
  },
  branches: {
    headers: ["name", "code", "location", "region_id"],
    required: ["name", "code", "region_id"],
    label: "Branches",
    numericFields: [],
  },
  regions: {
    headers: ["name", "code"],
    required: ["name", "code"],
    label: "Regions",
    numericFields: [],
  },
  loan_products: {
    headers: ["name", "code", "interest_rate", "term_weeks", "min_amount", "max_amount", "description", "processing_fee_percent"],
    required: ["name", "code", "interest_rate", "term_weeks"],
    label: "Loan Products",
    numericFields: ["interest_rate", "term_weeks", "min_amount", "max_amount", "processing_fee_percent"],
  },
  staff_assignments: {
    headers: ["user_id", "branch_id", "region_id"],
    required: ["user_id"],
    label: "Staff Assignments",
    numericFields: [],
  },
  loan_repayments: {
    headers: ["loan_id", "week_number", "amount_due", "amount_paid", "due_date", "paid_date", "status"],
    required: ["loan_id", "week_number", "amount_due", "due_date"],
    label: "Repayments",
    numericFields: ["week_number", "amount_due", "amount_paid"],
  },
};

interface Props {
  target: ImportTarget;
  onComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing";

const confidenceBadge = (m: ColumnMapping) => {
  if (!m.dbColumn) return <Badge variant="outline" className="text-xs text-muted-foreground">Unmapped</Badge>;
  if (m.confidence >= 0.9) return <Badge className="text-xs bg-primary text-primary-foreground">Exact</Badge>;
  if (m.confidence >= 0.7) return <Badge variant="secondary" className="text-xs">Likely</Badge>;
  return <Badge variant="outline" className="text-xs border-accent text-accent-foreground">Guess</Badge>;
};

const AdminCSVImport = ({ target, onComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const template = TEMPLATES[target];

  const reset = () => { setStep("upload"); setRawRows([]); setMappings([]); setErrors([]); setSuccessCount(0); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { toast.error("No data rows found in CSV"); return; }

      setRawRows(parsed);
      const auto = autoMapColumns(Object.keys(parsed[0]), template.headers, parsed.slice(0, 20));
      setMappings(auto);
      setStep("mapping");

      const mapped = auto.filter(m => m.dbColumn).length;
      const total = auto.length;
      toast.success(`Detected ${parsed.length} rows • Auto-mapped ${mapped}/${total} columns`);
    };
    reader.readAsText(file);
  };

  const updateMapping = (csvHeader: string, dbColumn: string | null) => {
    setMappings(prev => prev.map(m =>
      m.csvHeader === csvHeader ? { ...m, dbColumn, confidence: dbColumn ? 1 : 0, method: "manual" as const } : m
    ));
  };

  const missingRequired = () => {
    const mappedDb = new Set(mappings.filter(m => m.dbColumn).map(m => m.dbColumn!));
    return template.required.filter(r => !mappedDb.has(r));
  };

  const handleImport = async () => {
    setStep("importing");
    setImporting(true);
    const transformed = applyMapping(rawRows, mappings, template.numericFields);
    const errs: string[] = [];
    let success = 0;

    for (let i = 0; i < transformed.length; i++) {
      const row = transformed[i];
      const missingFields = template.required.filter(f => !row[f] || String(row[f]).trim() === "");
      if (missingFields.length > 0) {
        errs.push(`Row ${i + 1}: Missing ${missingFields.join(", ")}`);
        continue;
      }
      if (target === "loan_applications") row.status = "pending";

      const { error } = await supabase.from(target).insert(row as any);
      if (error) errs.push(`Row ${i + 1}: ${error.message}`);
      else success++;
    }

    setErrors(errs);
    setSuccessCount(success);
    if (success > 0) { toast.success(`${success} records imported`); onComplete(); }
    if (errs.length > 0) toast.error(`${errs.length} rows had errors`);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = template.headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${target}-template.csv`;
    a.click();
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => { setOpen(true); reset(); }}>
        <Upload className="w-4 h-4 mr-1" /> Import CSV
      </Button>
    );
  }

  const missing = missingRequired();

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Smart Import — {template.label}
        </h3>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }}><X className="w-4 h-4" /></Button>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Upload any CSV — columns will be <strong>auto-detected</strong> using header names and data patterns.
            Required: <strong>{template.required.join(", ")}</strong>
          </p>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="text-sm" />
            <Button size="sm" variant="outline" onClick={downloadTemplate}>Template</Button>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Review column mappings. Adjust any that look wrong.</p>

          <div className="max-h-64 overflow-auto border border-border rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 sticky top-0">
                  <th className="p-2 text-left font-semibold">CSV Column</th>
                  <th className="p-2 text-left font-semibold">→ Maps To</th>
                  <th className="p-2 text-left font-semibold">Confidence</th>
                  <th className="p-2 text-left font-semibold">Sample</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(m => (
                  <tr key={m.csvHeader} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="p-2 font-medium text-foreground">{m.csvHeader}</td>
                    <td className="p-2">
                      <select
                        value={m.dbColumn ?? ""}
                        onChange={e => updateMapping(m.csvHeader, e.target.value || null)}
                        className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                      >
                        <option value="">— Skip —</option>
                        {template.headers.map(h => (
                          <option key={h} value={h}>{h}{template.required.includes(h) ? " *" : ""}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">{confidenceBadge(m)}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[160px]" title={m.sampleValues.join(", ")}>
                      {m.sampleValues.slice(0, 2).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {missing.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded p-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Required columns not mapped: <strong>{missing.join(", ")}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { reset(); }}>Back</Button>
            <Button size="sm" onClick={() => setStep("preview")} disabled={missing.length > 0}>
              <ArrowRight className="w-4 h-4 mr-1" /> Preview {rawRows.length} rows
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Showing first 5 rows as they will be imported.</p>

          {(() => {
            const transformed = applyMapping(rawRows.slice(0, 5), mappings, template.numericFields);
            const cols = mappings.filter(m => m.dbColumn).map(m => m.dbColumn!);
            return (
              <div className="max-h-48 overflow-auto border border-border rounded text-xs">
                <table className="w-full">
                  <thead><tr className="bg-muted/50 sticky top-0">
                    {cols.map(c => <th key={c} className="p-1.5 text-left font-semibold">{c}</th>)}
                  </tr></thead>
                  <tbody>
                    {transformed.map((r, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {cols.map(c => <td key={c} className="p-1.5 text-muted-foreground truncate max-w-[120px]">{String(r[c] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rawRows.length > 5 && <p className="p-1.5 text-center text-muted-foreground">…and {rawRows.length - 5} more</p>}
              </div>
            );
          })()}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setStep("mapping")}>Back</Button>
            <Button size="sm" onClick={handleImport}>
              <CheckCircle className="w-4 h-4 mr-1" /> Import {rawRows.length} Records
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing / Results */}
      {step === "importing" && (
        <div className="space-y-2">
          {importing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Importing…
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                ✅ {successCount} imported{errors.length > 0 && ` • ⚠️ ${errors.length} errors`}
              </p>
              {errors.length > 0 && (
                <div className="max-h-24 overflow-auto bg-destructive/5 border border-destructive/20 rounded p-2 text-xs text-destructive">
                  {errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => { setOpen(false); reset(); }}>Done</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCSVImport;
