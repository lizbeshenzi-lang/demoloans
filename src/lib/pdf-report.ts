/**
 * PDF Report Generator using browser print-to-PDF
 * Generates styled HTML reports and triggers print/save as PDF
 */

interface LoanData {
  id: string;
  full_name: string;
  business_type: string;
  financing_amount: string;
  status: string;
  created_at: string;
  risk_score: number | null;
  amount_approved: number | null;
  disbursement_date: string | null;
  expected_completion_date: string | null;
  phone?: string;
  email?: string | null;
  branch_id?: string | null;
}

interface RepaymentData {
  id: string;
  loan_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  week_number: number;
  status: string;
  paid_date: string | null;
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  location: string | null;
}

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a8fcb; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1a8fcb; }
  .header .meta { text-align: right; font-size: 11px; color: #666; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 15px; color: #1a8fcb; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: #f8f9fc; border: 1px solid #e0e7ef; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-card .value { font-size: 22px; font-weight: 700; color: #1a8fcb; }
  .stat-card .label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1a8fcb; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f8f9fc; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .status-pending { background: #fef3cd; color: #856404; }
  .status-approved { background: #d4edda; color: #155724; }
  .status-disbursed { background: #cce5ff; color: #004085; }
  .status-completed { background: #d1ecf1; color: #0c5460; }
  .status-rejected { background: #f8d7da; color: #721c24; }
  .status-paid { background: #d4edda; color: #155724; }
  .status-overdue { background: #f8d7da; color: #721c24; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
`;

const formatCurrency = (n: number) => `KES ${n.toLocaleString()}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
const statusClass = (s: string) => `status status-${s}`;

function openPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export function generateLoanSummaryPDF(loans: LoanData[], repayments: RepaymentData[]) {
  const now = new Date().toLocaleString("en-KE");
  const totalLoans = loans.length;
  const pending = loans.filter(l => l.status === "pending").length;
  const approved = loans.filter(l => l.status === "approved" || l.status === "disbursed" || l.status === "completed").length;
  const disbursedAmt = loans.filter(l => ["approved", "disbursed", "completed"].includes(l.status)).reduce((s, l) => s + (Number(l.amount_approved) || 0), 0);
  const totalDue = repayments.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalPaid = repayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const overdue = repayments.filter(r => r.status === "overdue").length;
  const collectionRate = totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : "0";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loan Portfolio Summary</title><style>${STYLES}</style></head><body>
    <div class="header">
      <h1>📊 Loan Portfolio Summary</h1>
      <div class="meta">demo Capital Investment Ltd<br/>Generated: ${now}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">${totalLoans}</div><div class="label">Total Applications</div></div>
      <div class="stat-card"><div class="value">${pending}</div><div class="label">Pending</div></div>
      <div class="stat-card"><div class="value">${formatCurrency(disbursedAmt)}</div><div class="label">Total Disbursed</div></div>
      <div class="stat-card"><div class="value">${collectionRate}%</div><div class="label">Collection Rate</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">${formatCurrency(totalDue)}</div><div class="label">Total Due</div></div>
      <div class="stat-card"><div class="value">${formatCurrency(totalPaid)}</div><div class="label">Total Collected</div></div>
      <div class="stat-card"><div class="value">${overdue}</div><div class="label">Overdue Payments</div></div>
      <div class="stat-card"><div class="value">${approved}</div><div class="label">Approved/Active</div></div>
    </div>
    <div class="section">
      <h2>All Applications</h2>
      <table>
        <tr><th>#</th><th>Client</th><th>Business</th><th>Amount</th><th>Approved</th><th>Status</th><th>Date</th></tr>
        ${loans.map((l, i) => `<tr>
          <td>${i + 1}</td><td>${l.full_name}</td><td>${l.business_type}</td>
          <td>${l.financing_amount || "N/A"}</td><td>${l.amount_approved ? formatCurrency(l.amount_approved) : "—"}</td>
          <td><span class="${statusClass(l.status)}">${l.status}</span></td><td>${formatDate(l.created_at)}</td>
        </tr>`).join("")}
      </table>
    </div>
    <div class="footer">demo Capital Investment Limited — Confidential Report</div>
  </body></html>`;

  openPrintWindow(html);
}

export function generateRepaymentSchedulePDF(loan: LoanData, repayments: RepaymentData[]) {
  const now = new Date().toLocaleString("en-KE");
  const sorted = [...repayments].sort((a, b) => a.week_number - b.week_number);
  const totalDue = sorted.reduce((s, r) => s + Number(r.amount_due), 0);
  const totalPaid = sorted.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const balance = totalDue - totalPaid;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Repayment Schedule - ${loan.full_name}</title><style>${STYLES}</style></head><body>
    <div class="header">
      <h1>📅 Repayment Schedule</h1>
      <div class="meta">demo Capital Investment Ltd<br/>Generated: ${now}</div>
    </div>
    <div class="section">
      <h2>Client Details</h2>
      <table>
        <tr><th>Client</th><th>Business</th><th>Amount Requested</th><th>Amount Approved</th><th>Status</th></tr>
        <tr>
          <td><strong>${loan.full_name}</strong></td><td>${loan.business_type}</td>
          <td>${loan.financing_amount || "N/A"}</td><td>${loan.amount_approved ? formatCurrency(loan.amount_approved) : "—"}</td>
          <td><span class="${statusClass(loan.status)}">${loan.status}</span></td>
        </tr>
      </table>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">${formatCurrency(totalDue)}</div><div class="label">Total Due</div></div>
      <div class="stat-card"><div class="value">${formatCurrency(totalPaid)}</div><div class="label">Total Paid</div></div>
      <div class="stat-card"><div class="value">${formatCurrency(balance)}</div><div class="label">Balance</div></div>
      <div class="stat-card"><div class="value">${sorted.length}</div><div class="label">Installments</div></div>
    </div>
    <div class="section">
      <h2>Schedule</h2>
      <table>
        <tr><th>Week</th><th>Due Date</th><th>Amount Due</th><th>Amount Paid</th><th>Paid Date</th><th>Status</th></tr>
        ${sorted.map(r => `<tr>
          <td>${r.week_number}</td><td>${formatDate(r.due_date)}</td>
          <td>${formatCurrency(r.amount_due)}</td><td>${r.amount_paid ? formatCurrency(r.amount_paid) : "—"}</td>
          <td>${r.paid_date ? formatDate(r.paid_date) : "—"}</td>
          <td><span class="${statusClass(r.status)}">${r.status}</span></td>
        </tr>`).join("")}
      </table>
    </div>
    <div class="footer">demo Capital Investment Limited — Confidential Report</div>
  </body></html>`;

  openPrintWindow(html);
}

export function generateBranchPerformancePDF(
  branches: BranchData[],
  loans: LoanData[],
  repayments: RepaymentData[]
) {
  const now = new Date().toLocaleString("en-KE");

  const branchStats = branches.map(b => {
    const branchLoans = loans.filter(l => l.branch_id === b.id);
    const branchLoanIds = new Set(branchLoans.map(l => l.id));
    const branchRepayments = repayments.filter(r => branchLoanIds.has(r.loan_id));
    const disbursed = branchLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status)).reduce((s, l) => s + (Number(l.amount_approved) || 0), 0);
    const due = branchRepayments.reduce((s, r) => s + Number(r.amount_due || 0), 0);
    const paid = branchRepayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const overdue = branchRepayments.filter(r => r.status === "overdue").length;
    const rate = due > 0 ? ((paid / due) * 100).toFixed(1) : "0";
    return { ...b, totalLoans: branchLoans.length, disbursed, due, paid, overdue, rate };
  }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Branch Performance Report</title><style>${STYLES}</style></head><body>
    <div class="header">
      <h1>🏢 Branch Performance Report</h1>
      <div class="meta">demo Capital Investment Ltd<br/>Generated: ${now}</div>
    </div>
    <div class="section">
      <h2>Performance by Branch</h2>
      <table>
        <tr><th>Branch</th><th>Code</th><th>Location</th><th>Loans</th><th>Disbursed</th><th>Collected</th><th>Overdue</th><th>Collection Rate</th></tr>
        ${branchStats.map(b => `<tr>
          <td><strong>${b.name}</strong></td><td>${b.code}</td><td>${b.location || "—"}</td>
          <td>${b.totalLoans}</td><td>${formatCurrency(b.disbursed)}</td><td>${formatCurrency(b.paid)}</td>
          <td>${b.overdue}</td><td><strong>${b.rate}%</strong></td>
        </tr>`).join("")}
      </table>
    </div>
    <div class="footer">demo Capital Investment Limited — Confidential Report</div>
  </body></html>`;

  openPrintWindow(html);
}
