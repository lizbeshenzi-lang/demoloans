import { Banknote, Store, RefreshCw, GraduationCap, ShieldCheck, BarChart3, ArrowRight, Sprout, Landmark } from "lucide-react";
import partnership from "@/assets/partnership.jpg";
import ScrollFadeIn from "@/components/ScrollFadeIn";

const services = [
  {
    icon: Banknote,
    title: "Business Loans",
    desc: "Whether you're looking to expand your existing business, purchase new equipment, or invest in growth opportunities, our business loans are designed with flexibility in mind. We offer competitive interest rates, manageable repayment periods, and loan amounts tailored to your specific business needs. No unnecessary paperwork, no unreasonable collateral demands.",
    features: ["Competitive interest rates", "Flexible repayment terms", "Tailored loan amounts"],
  },
  {
    icon: Store,
    title: "Trade Financing",
    desc: "For traders and vendors who need capital to purchase stock, expand their inventory, or take advantage of seasonal market opportunities, our trade financing solutions provide the quick, reliable access to funds you need. We understand the pace of trade and ensure our disbursement matches your business rhythm.",
    features: ["Quick disbursement", "Seasonal flexibility", "Stock purchasing support"],
  },
  {
    icon: RefreshCw,
    title: "Working Capital",
    desc: "Keep your business running smoothly with short-term working capital loans designed to cover daily operational expenses, bridge cash flow gaps, and ensure you never miss a business opportunity. From paying suppliers to managing payroll, we provide the financial cushion your business needs.",
    features: ["Cash flow management", "Operational expense coverage", "Bridge financing"],
  },
  {
    icon: GraduationCap,
    title: "Financial Literacy Training",
    desc: "We believe knowledge is as important as capital. Our financial literacy programs equip entrepreneurs with essential skills in bookkeeping, budgeting, savings, and financial planning. These workshops help you make smarter decisions, manage risk, and build a more resilient business over time.",
    features: ["Bookkeeping skills", "Budget planning", "Risk management"],
  },
  {
    icon: Sprout,
    title: "Agricultural Financing",
    desc: "Supporting farmers and agri-entrepreneurs with financing for inputs, equipment, and seasonal working capital. We understand the agricultural cycle and design repayment schedules that align with harvest periods, making it easier for you to invest in your farm without financial strain.",
    features: ["Input financing", "Harvest-aligned repayment", "Equipment funding"],
  },
  {
    icon: Landmark,
    title: "Group Lending",
    desc: "Our group lending model allows small groups of entrepreneurs to access financing together, leveraging collective accountability and mutual support. This approach makes financing accessible to those who may not qualify individually and builds a supportive community of fellow business owners.",
    features: ["Collective accountability", "Peer support", "Accessible qualification"],
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 md:py-28" aria-labelledby="services-heading">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <span className="text-primary font-semibold text-sm tracking-wide uppercase">Our Services</span>
            <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
              Financial Solutions Designed for Entrepreneurs Like You
            </h2>
            <p className="text-muted-foreground text-lg font-body leading-relaxed">
              We offer a comprehensive range of financing products and support services specifically designed for small businesses and entrepreneurs. Each product is built with the understanding that every business is unique — and your financing should be too.
            </p>
            <p className="text-muted-foreground text-base font-body leading-relaxed mt-4">
              From retail shop owners and market traders to farmers and service providers, our products are tailored to the real-world needs of everyday business owners who are working hard to grow.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-elevated">
            <img src={partnership} alt="Financial partnership" className="w-full h-[300px] md:h-[350px] object-cover" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <ScrollFadeIn key={s.title} delay={i * 120}>
              <div
                className="group p-6 bg-background rounded-2xl border border-border hover:border-primary/30 shadow-card hover:shadow-card-hover transition-all duration-300 h-full"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 font-display">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-body text-sm mb-4">{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-body">
                      <div className="w-1.5 h-1.5 rounded-full bg-kc-green shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollFadeIn>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground font-body mb-4">Not sure which product is right for you? We're happy to help.</p>
          <a href="/contact" className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            Talk to Our Team <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
