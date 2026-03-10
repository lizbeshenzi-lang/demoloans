import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Building2, MapPin, Phone, Briefcase, DollarSign, FileText, User, Package, Clock, Percent, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import logo from "@/assets/kechita-logo.jpg";

interface BranchOption {
  id: string;
  name: string;
  location: string | null;
  region_name: string;
}

interface LoanProduct {
  id: string;
  name: string;
  code: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  term_weeks: number;
  processing_fee_percent: number | null;
}

const Apply = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    nationalId: "",
    phone: "",
    email: "",
    businessType: "",
    location: "",
    financingAmount: "",
    businessDescription: "",
    branchId: "",
    productId: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: regionsData }, { data: branchesData }, { data: productsData }] = await Promise.all([
        supabase.from("regions").select("id, name").order("name"),
        supabase.from("branches").select("id, name, location, region_id").order("name"),
        supabase.from("loan_products").select("*").eq("is_active", true).order("min_amount"),
      ]);
      if (regionsData && branchesData) {
        const regionMap = Object.fromEntries(regionsData.map(r => [r.id, r.name]));
        setBranches(branchesData.map(b => ({
          id: b.id, name: b.name, location: b.location,
          region_name: regionMap[b.region_id] || "Unknown",
        })));
      }
      if (productsData) setProducts(productsData as LoanProduct[]);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "location" && value.trim().length >= 2 && branches.length > 0) {
        const loc = value.toLowerCase();
        const match = branches.find(
          b => b.name.toLowerCase().includes(loc) ||
            (b.location && b.location.toLowerCase().includes(loc)) ||
            b.region_name.toLowerCase().includes(loc)
        );
        if (match && !prev.branchId) updated.branchId = match.id;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.fullName || !formData.phone || !formData.nationalId || !formData.businessType || !formData.branchId) {
      toast({ title: "Required fields missing", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("loan_applications").insert({
      user_id: user.id,
      full_name: formData.fullName.trim(),
      national_id: formData.nationalId.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      business_type: formData.businessType.trim(),
      location: formData.location.trim() || null,
      financing_amount: formData.financingAmount.trim() || null,
      business_description: formData.businessDescription.trim() || null,
      branch_id: formData.branchId || null,
      product_id: formData.productId || null,
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll contact you within 24 hours." });
    }
    setLoading(false);
  };

  const canAdvance = step === 1
    ? formData.fullName && formData.phone && formData.nationalId && formData.businessType
    : formData.branchId && formData.productId;

  const selectedProduct = products.find(p => p.id === formData.productId);

  const groupedBranches = branches.reduce<Record<string, BranchOption[]>>((acc, b) => {
    (acc[b.region_name] = acc[b.region_name] || []).push(b);
    return acc;
  }, {});

  if (authLoading) {
    return <div className="min-h-screen bg-warm flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-body transition-all";
  const labelClass = "text-sm font-medium text-foreground mb-1.5 block font-body flex items-center gap-2";

  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="bg-background shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Mular Credit" className="h-10 w-auto rounded" />
            <span className="font-display font-bold text-xl text-foreground hidden sm:block">Mular Credit</span>
          </Link>
          <Link to="/my-loans">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> My Loans</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        {!submitted && (
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm font-body ${step >= s ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {s === 1 ? "Your Details" : "Product & Branch"}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 rounded ${step > s ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        )}

        {submitted ? (
          <div className="bg-background rounded-2xl shadow-card p-10 text-center">
            <div className="w-20 h-20 bg-kc-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-kc-green" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-3">Application Submitted!</h1>
            <p className="text-muted-foreground font-body mb-2">
              Thank you for your application. Our team will review it and contact you within 24 hours.
            </p>
            <p className="text-sm text-muted-foreground/70 font-body mb-8">
              You can track your application status from your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/my-loans">
                <Button className="bg-gradient-primary">
                  View My Applications <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); setFormData({ fullName: "", nationalId: "", phone: "", email: "", businessType: "", location: "", financingAmount: "", businessDescription: "", branchId: "", productId: "" }); }}>
                Submit Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-background rounded-2xl shadow-card p-6 sm:p-8">
              <h1 className="text-2xl font-bold font-display text-foreground mb-1">
                {step === 1 ? "Apply for Financing" : "Choose Product & Branch"}
              </h1>
              <p className="text-muted-foreground font-body text-sm mb-6">
                {step === 1 ? "Tell us about yourself and your business." : "Select a financing product and your preferred branch."}
              </p>

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}><User className="w-4 h-4 text-primary" /> Full Name *</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your full name" className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}><Phone className="w-4 h-4 text-primary" /> Phone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="07XX XXX XXX" className={inputClass} required />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}><CreditCard className="w-4 h-4 text-primary" /> National ID Number *</label>
                      <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} placeholder="e.g. 12345678" className={inputClass} required maxLength={20} />
                    </div>
                    <div>
                      <label className={labelClass}><Briefcase className="w-4 h-4 text-primary" /> Business Type *</label>
                      <input type="text" name="businessType" value={formData.businessType} onChange={handleChange} placeholder="e.g. Retail Shop, M-Pesa Agent, Farming" className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email Address <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}><MapPin className="w-4 h-4 text-primary" /> Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Your county / town" className={inputClass} />
                    {formData.location && formData.branchId && (
                      <p className="text-xs text-kc-green mt-1 font-body flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Branch auto-suggested based on location
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {/* Product Selection */}
                  <div>
                    <label className={labelClass}><Package className="w-4 h-4 text-primary" /> Choose a Product *</label>
                    <div className="grid sm:grid-cols-2 gap-3 mt-2">
                      {products.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, productId: p.id, financingAmount: prev.financingAmount || `KES ${p.min_amount.toLocaleString()}` }))}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${formData.productId === p.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 bg-background"}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold font-display text-foreground text-sm">{p.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${formData.productId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p.code}</span>
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="w-3 h-3 text-primary/70" />
                              <span>KES {(p.min_amount / 1000).toFixed(0)}k–{(p.max_amount / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Percent className="w-3 h-3 text-primary/70" />
                              <span>{p.interest_rate}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3 text-primary/70" />
                              <span>{p.term_weeks} wks</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {products.length === 0 && <p className="text-sm text-muted-foreground mt-2">Loading products...</p>}
                  </div>

                  {/* Amount with product range hint */}
                  <div>
                    <label className={labelClass}><DollarSign className="w-4 h-4 text-primary" /> Financing Amount</label>
                    <input type="text" name="financingAmount" value={formData.financingAmount} onChange={handleChange} placeholder="e.g. KES 15,000" className={inputClass} />
                    {selectedProduct && (
                      <p className="text-xs text-muted-foreground mt-1 font-body">
                        {selectedProduct.name} range: KES {selectedProduct.min_amount.toLocaleString()} – KES {selectedProduct.max_amount.toLocaleString()} · {selectedProduct.term_weeks} weekly repayments
                      </p>
                    )}
                  </div>

                  {/* Branch */}
                  <div>
                    <label className={labelClass}><Building2 className="w-4 h-4 text-primary" /> Preferred Branch *</label>
                    <select name="branchId" value={formData.branchId} onChange={handleChange} required className={inputClass}>
                      <option value="">Select your nearest branch</option>
                      {Object.entries(groupedBranches).sort(([a], [b]) => a.localeCompare(b)).map(([region, list]) => (
                        <optgroup key={region} label={region}>
                          {list.map(b => (
                            <option key={b.id} value={b.id}>{b.name}{b.location ? ` · ${b.location}` : ""}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={labelClass}><FileText className="w-4 h-4 text-primary" /> Tell Us About Your Business & Needs</label>
                    <textarea name="businessDescription" value={formData.businessDescription} onChange={handleChange} rows={3} placeholder="Describe your business, what you'd use the funds for..." className={`${inputClass} resize-none`} />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : <div />}

              {step < 2 ? (
                <Button type="button" disabled={!canAdvance} onClick={() => setStep(2)} className="bg-gradient-primary">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading || !canAdvance} className="bg-gradient-primary">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Application <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground/60 font-body text-center mt-4">
              Your information is secure and will only be used to process your application.
            </p>
          </form>
        )}
      </main>
    </div>
  );
};

export default Apply;
