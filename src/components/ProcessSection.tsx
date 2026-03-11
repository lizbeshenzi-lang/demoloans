import { FileText, Search, CheckCircle, Wallet, ArrowRight, MessageCircle, Clock } from "lucide-react";

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Apply",
    desc: "Visit our office or reach out to one of our loan officers. Fill out a simple, straightforward application form with your basic business information. No complicated paperwork or unnecessary bureaucracy.",
    detail: "You'll need your national ID, proof of business, and a brief description of how you plan to use the funds.",
  },
  {
    icon: Search,
    step: "02",
    title: "Assessment",
    desc: "Our experienced team reviews your application quickly and fairly. We look at your business potential, repayment capacity, and growth plans — not just your credit history.",
    detail: "We may visit your business to better understand your operations and tailor the right financing for you.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Discussion",
    desc: "We sit down with you to discuss the best financing option, agree on terms, and answer any questions you may have. Everything is explained clearly — no fine print, no surprises.",
    detail: "This is a conversation, not an interrogation. We want you to feel confident and informed.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Approval",
    desc: "Once approved, you receive a clear offer letter outlining the loan amount, interest rate, repayment schedule, and all terms. You sign only when you're fully comfortable.",
    detail: "We pride ourselves on transparent terms that you can easily understand and plan around.",
  },
  {
    icon: Wallet,
    step: "05",
    title: "Disbursement",
    desc: "Your financing is disbursed promptly — often within days. The funds go directly to you so you can start putting them to work in your business immediately.",
    detail: "Many of our clients receive their funds within 48–72 hours of final approval.",
  },
  {
    icon: Clock,
    step: "06",
    title: "Support & Repayment",
    desc: "Throughout your repayment period, our team stays in touch to provide support, answer questions, and help you manage your finances. We celebrate your milestones and help you plan your next steps.",
    detail: "Good repayment history qualifies you for higher amounts and better terms in the future.",
  },
];

const ProcessSection = () => {
  return (
    <section id="process" className="py-20 md:py-28 bg-warm" aria-labelledby="process-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">How It Works</span>
          <h2 id="process-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
            A Simple, Transparent Process From Start to Finish
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed">
            We've designed our lending process to be as simple and stress-free as possible. No confusing jargon, no hidden steps — just a clear path from application to funding. Here's how it works:
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="relative bg-background p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                  <s.icon className="w-6 h-6 text-primary-foreground" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-kc-green text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground font-display">{s.title}</h3>
              </div>
              <p className="text-muted-foreground font-body leading-relaxed text-sm mb-3">{s.desc}</p>
              <p className="text-xs text-primary font-body italic">{s.detail}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 bg-background p-8 rounded-2xl shadow-card max-w-2xl mx-auto">
          <h4 className="text-xl font-bold text-foreground font-display mb-3">Ready to Get Started?</h4>
          <p className="text-muted-foreground font-body mb-5">
            The entire process from application to disbursement can take as little as 3–5 business days. Don't let funding be the thing that holds your business back.
          </p>
          <a href="/contact" className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            Start Your Application <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
