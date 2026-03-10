import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface LoanProduct {
  id: string;
  name: string;
  code: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  term_weeks: number;
  processing_fee_percent: number | null;
}

const LoanCalculator = () => {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [amount, setAmount] = useState(10000);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    supabase
      .from("loan_products")
      .select("*")
      .eq("is_active", true)
      .order("min_amount")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const typed = data as LoanProduct[];
          setProducts(typed);
          setSelectedProduct(typed[0]);
          setAmount(typed[0].min_amount);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setAmount(Math.max(selectedProduct.min_amount, Math.min(amount, selectedProduct.max_amount)));
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const totalInterest = amount * (selectedProduct.interest_rate / 100);
  const processingFee = amount * ((selectedProduct.processing_fee_percent || 0) / 100);
  const totalRepayable = amount + totalInterest + processingFee;
  const weeklyPayment = totalRepayable / selectedProduct.term_weeks;

  return (
    <section id="calculator" className="py-16 md:py-24 bg-warm" aria-label="Loan calculator">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" /> Loan Calculator
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">
            Plan Your <span className="text-gradient-primary">Repayments</span>
          </h2>
          <p className="text-muted-foreground font-body mt-3 max-w-lg mx-auto">
            Choose a product and amount to see your weekly repayments, total interest, and fees — no surprises.
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-background rounded-2xl shadow-elevated p-6 sm:p-8">
          {/* Product selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block font-body">Select Product</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-body ${
                    selectedProduct.id === p.id
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  <span className="block font-display text-xs font-bold">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.term_weeks} wks · {p.interest_rate}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground font-body">Loan Amount</label>
              <span className="text-lg font-bold font-display text-primary">
                KES {amount.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[amount]}
              onValueChange={([v]) => setAmount(v)}
              min={selectedProduct.min_amount}
              max={selectedProduct.max_amount}
              step={1000}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-body">
              <span>KES {selectedProduct.min_amount.toLocaleString()}</span>
              <span>KES {selectedProduct.max_amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Results */}
          <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-body mb-1">Weekly Payment</p>
                <p className="text-2xl font-bold font-display text-primary">
                  KES {Math.ceil(weeklyPayment).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-body mb-1">Total Repayable</p>
                <p className="text-2xl font-bold font-display text-foreground">
                  KES {Math.ceil(totalRepayable).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary font-medium font-body mx-auto"
            >
              {expanded ? "Hide" : "Show"} breakdown
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {expanded && (
              <div className="mt-4 space-y-2 text-sm font-body border-t border-primary/10 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal</span>
                  <span className="font-medium text-foreground">KES {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest ({selectedProduct.interest_rate}%)</span>
                  <span className="font-medium text-foreground">KES {Math.ceil(totalInterest).toLocaleString()}</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Fee ({selectedProduct.processing_fee_percent}%)</span>
                    <span className="font-medium text-foreground">KES {Math.ceil(processingFee).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repayment Period</span>
                  <span className="font-medium text-foreground">{selectedProduct.term_weeks} weeks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanCalculator;
