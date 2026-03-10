import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, ArrowRight, MessageCircle, HelpCircle, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    q: "Who can apply for financing?",
    a: "Any entrepreneur, trader, or small business owner with an active business can apply. We serve a wide range of sectors including retail, agriculture, tailoring, food vending, and more."
  },
  {
    q: "How long does the process take?",
    a: "Our streamlined process means you can go from application to disbursement in as little as 3–5 business days, depending on the complexity of your application."
  },
  {
    q: "What documents do I need?",
    a: "You'll typically need your national ID, proof of business (this can be photos of your business, a business registration, or a reference letter), and a brief description of how you plan to use the funds."
  },
  {
    q: "Are there any hidden fees?",
    a: "Absolutely not. We believe in full transparency. All fees, interest rates, and charges are clearly communicated before you sign any agreement. What you see is what you pay."
  },
];

interface BranchOption {
  id: string;
  name: string;
  location: string | null;
  region_name: string;
}

const ContactSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    businessType: "",
    location: "",
    financingAmount: "",
    businessDescription: "",
    branchId: "",
  });

  useEffect(() => {
    const fetchBranches = async () => {
      const { data: regionsData } = await supabase.from("regions").select("id, name").order("name");
      const { data: branchesData } = await supabase.from("branches").select("id, name, location, region_id").order("name");
      if (regionsData && branchesData) {
        const regionMap = Object.fromEntries(regionsData.map(r => [r.id, r.name]));
        setBranches(branchesData.map(b => ({
          id: b.id,
          name: b.name,
          location: b.location,
          region_name: regionMap[b.region_id] || "Unknown",
        })));
      }
    };
    fetchBranches();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-suggest branch when location changes
      if (name === "location" && value.trim().length >= 2 && branches.length > 0) {
        const loc = value.toLowerCase();
        const match = branches.find(
          b =>
            b.name.toLowerCase().includes(loc) ||
            (b.location && b.location.toLowerCase().includes(loc)) ||
            b.region_name.toLowerCase().includes(loc)
        );
        if (match && !prev.branchId) {
          updated.branchId = match.id;
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to submit your application.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.businessType) {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("loan_applications").insert({
      user_id: user.id,
      full_name: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      business_type: formData.businessType.trim(),
      location: formData.location.trim() || null,
      financing_amount: formData.financingAmount.trim() || null,
      business_description: formData.businessDescription.trim() || null,
      branch_id: formData.branchId || null,
    });

    if (error) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubmitted(true);
      toast({
        title: "Application submitted!",
        description: "We'll contact you within 24 hours.",
      });
    }

    setLoading(false);
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-navy text-primary-foreground" aria-labelledby="contact-heading">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-kc-green font-semibold text-sm tracking-wide uppercase">Get In Touch</span>
          <h2 id="contact-heading" className="text-3xl md:text-4xl font-bold mt-3 mb-4 font-display leading-tight">
            Ready to Take the Next Step for Your Business?
          </h2>
          <p className="text-primary-foreground/70 text-lg font-body leading-relaxed">
            Whether you're ready to apply, have questions about our products, or simply want to learn more about how we can help — we'd love to hear from you. Reach out today and let's start a conversation about your business growth.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Info + FAQs */}
          <div>
            <h3 className="text-xl font-bold mb-6 font-display">Contact Information</h3>
            <div className="space-y-5 mb-10">
              {[
                { icon: MapPin, label: "Head Office", value: "Nairobi, Kenya", detail: "With branches across most towns" },
                { icon: Phone, label: "Call Us", value: "+254 XXX XXX XXX", detail: "We're happy to talk" },
                { icon: Mail, label: "Email Us", value: "info@Democapital.co.ke", detail: "We respond within 24 hours" },
                { icon: Clock, label: "Working Hours", value: "Mon - Fri: 8:00 AM - 5:00 PM", detail: "Sat: 8:00 AM - 12:00 PM" },
                { icon: MessageCircle, label: "WhatsApp", value: "+254 XXX XXX XXX", detail: "Quick enquiries welcome" },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-primary-foreground/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-kc-green" />
                  </div>
                  <div>
                    <div className="text-sm text-primary-foreground/50 font-body">{item.label}</div>
                    <div className="font-semibold font-body">{item.value}</div>
                    <div className="text-xs text-primary-foreground/40 font-body">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQs */}
            <h3 className="text-xl font-bold mb-4 font-display flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-kc-green" /> Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-primary-foreground/5 p-4 rounded-xl border border-primary-foreground/10">
                  <h4 className="font-semibold font-body text-sm mb-1">{faq.q}</h4>
                  <p className="text-sm text-primary-foreground/60 font-body leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-primary-foreground/5 backdrop-blur-sm p-8 rounded-2xl border border-primary-foreground/10">
            <h3 className="text-2xl font-bold mb-2 font-display">Apply for Financing</h3>
            <p className="text-primary-foreground/60 text-sm font-body mb-6">
              Fill in the form below and one of our loan officers will get in touch with you within 24 hours to discuss your needs.
            </p>

            {!user && (
              <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg p-4 mb-6">
                <p className="text-sm font-body text-primary-foreground/80 mb-3">
                  Please sign in to submit your application and track its status.
                </p>
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="bg-primary-foreground text-navy px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="border border-primary-foreground/30 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-foreground/10 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-kc-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-kc-green" />
                </div>
                <h4 className="text-xl font-bold font-display mb-2">Application Submitted!</h4>
                <p className="text-primary-foreground/60 font-body mb-6">
                  Thank you for your application. Our team will review it and contact you within 24 hours.
                </p>
                <Link
                  to="/dashboard"
                  className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  View My Applications <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Your phone number"
                      className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com (optional)"
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Business Type *</label>
                    <input
                      type="text"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      placeholder="e.g. Retail Shop, Trading"
                      className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Your county / town"
                      className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Preferred Branch *</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    required
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary font-body"
                  >
                    <option value="" className="text-navy">Select your nearest branch</option>
                    {(() => {
                      const grouped = branches.reduce<Record<string, BranchOption[]>>((acc, b) => {
                        (acc[b.region_name] = acc[b.region_name] || []).push(b);
                        return acc;
                      }, {});
                      return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([region, branchList]) => (
                        <optgroup key={region} label={region}>
                          {branchList.map(b => (
                            <option key={b.id} value={b.id} className="text-navy">
                              {b.name}{b.location ? ` · ${b.location}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">How much financing are you looking for?</label>
                  <input
                    type="text"
                    name="financingAmount"
                    value={formData.financingAmount}
                    onChange={handleChange}
                    placeholder="e.g. KSh 500,000"
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary font-body"
                  />
                </div>
                <div>
                  <label className="text-sm text-primary-foreground/60 mb-1.5 block font-body">Tell Us About Your Business & Needs</label>
                  <textarea
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your business, what you'd use the funds for, and any other details that might help us understand your needs..."
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/10 rounded-lg px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none font-body"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !user}
                  className="w-full bg-gradient-primary text-primary-foreground py-4 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-elevated disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Submit Application <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-xs text-primary-foreground/40 font-body text-center">
                  Your information is secure and will only be used to process your application. We never share your data with third parties.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
