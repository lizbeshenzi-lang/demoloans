import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv-utils";
import { toast } from "sonner";

type ExportTarget = "loan_applications" | "branches" | "regions" | "loan_products" | "staff_assignments" | "loan_repayments";

const EXPORT_CONFIG: Record<ExportTarget, { columns: string[]; label: string }> = {
  loan_applications: {
    columns: ["full_name", "phone", "email", "business_type", "financing_amount", "location", "business_description", "status", "amount_approved", "created_at"],
    label: "Loan Applications",
  },
  branches: {
    columns: ["name", "code", "location", "region_id"],
    label: "Branches",
  },
  regions: {
    columns: ["name", "code"],
    label: "Regions",
  },
  loan_products: {
    columns: ["name", "code", "interest_rate", "term_weeks", "min_amount", "max_amount", "description", "processing_fee_percent", "is_active"],
    label: "Loan Products",
  },
  staff_assignments: {
    columns: ["user_id", "branch_id", "region_id"],
    label: "Staff Assignments",
  },
  loan_repayments: {
    columns: ["loan_id", "week_number", "amount_due", "amount_paid", "due_date", "paid_date", "status"],
    label: "Repayments",
  },
};

interface Props {
  target: ExportTarget;
}

const AdminCSVExport = ({ target }: Props) => {
  const [exporting, setExporting] = useState(false);
  const config = EXPORT_CONFIG[target];

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.from(target).select("*").order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      if (!data || data.length === 0) { toast.info("No data to export"); return; }
      exportToCSV(data as Record<string, unknown>[], config.label.toLowerCase().replace(/\s/g, "-"), config.columns);
      toast.success(`Exported ${data.length} ${config.label.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
      Export CSV
    </Button>
  );
};

export default AdminCSVExport;
