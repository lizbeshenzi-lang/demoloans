/**
 * CSV Import/Export utilities
 */

export const exportToCSV = (data: Record<string, any>[], filename: string, headers?: string[]) => {
  if (data.length === 0) return;
  const keys = headers || Object.keys(data[0]);
  const csvRows = [
    keys.join(","),
    ...data.map(row =>
      keys.map(k => {
        const val = row[k] ?? "";
        return typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))
          ? `"${val.replace(/"/g, '""')}"`
          : `"${val}"`;
      }).join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
};

export const downloadReport = (content: string, filename: string, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const generateLoanReport = (
  loans: any[],
  repayments: any[],
  title: string
): string => {
  const now = new Date().toLocaleString();
  const totalLoans = loans.length;
  const pending = loans.filter(l => l.status === "pending").length;
  const approved = loans.filter(l => l.status === "approved").length;
  const disbursed = loans.filter(l => l.status === "disbursed").length;
  const rejected = loans.filter(l => l.status === "rejected").length;
  const totalDisbursedAmt = loans
    .filter(l => ["approved", "disbursed", "completed"].includes(l.status))
    .reduce((s, l) => s + (Number(l.amount_approved) || 0), 0);
  const totalDue = repayments.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalPaid = repayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const overdue = repayments.filter(r => r.status === "overdue").length;
  const collectionRate = totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : "0";

  return `
=====================================
${title}
Generated: ${now}
=====================================

PORTFOLIO SUMMARY
-----------------
Total Applications:    ${totalLoans}
Pending:               ${pending}
Approved:              ${approved}
Disbursed:             ${disbursed}
Rejected:              ${rejected}
Total Disbursed (KES): ${totalDisbursedAmt.toLocaleString()}

REPAYMENT SUMMARY
-----------------
Total Due (KES):       ${totalDue.toLocaleString()}
Total Collected (KES): ${totalPaid.toLocaleString()}
Collection Rate:       ${collectionRate}%
Overdue Payments:      ${overdue}

LOAN DETAILS
-----------------
${loans.map(l => `${l.full_name} | ${l.business_type} | ${l.financing_amount || "N/A"} | ${l.status} | ${new Date(l.created_at).toLocaleDateString()}`).join("\n")}

--- End of Report ---
`.trim();
};
