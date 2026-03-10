import entrepreneurMan from "@/assets/entrepreneur-man.jpg";
import communityWomen from "@/assets/community-women.jpg";
import { Quote, TrendingUp, Users, Briefcase, MapPin } from "lucide-react";

const testimonials = [
  {
    quote: "Kechita Capital believed in my small shop when no one else would. They gave me my first loan of KSh 150,000 and today, I have two branches and employ five people. They didn't just give me money — they gave me hope.",
    name: "Grace Wanjiku",
    role: "Retail Shop Owner, Nairobi",
    growth: "Grew from 1 to 2 branches",
  },
  {
    quote: "The process was simple and transparent. I got my working capital within three days and was able to stock up for the festive season. My sales doubled that month. I've been a Kechita client for four years now and I keep coming back.",
    name: "James Ochieng",
    role: "Market Trader, Kisumu",
    growth: "Sales doubled in first month",
  },
  {
    quote: "They don't just give you money — they genuinely care about your business success. The financial literacy training helped me understand how to manage my cash flow properly. That's what makes Kechita different from any other lender.",
    name: "Sarah Njeri",
    role: "Food Vendor, Nakuru",
    growth: "Expanded to catering services",
  },
  {
    quote: "As a tailor, I needed a sewing machine and fabric to grow my business. Kechita gave me a loan with repayment terms I could manage. Now I employ two apprentices and serve customers from three counties.",
    name: "Mercy Akinyi",
    role: "Tailor & Fashion Designer, Mombasa",
    growth: "Now employs 2 apprentices",
  },
  {
    quote: "I was hesitant about taking a loan, but the Kechita team explained everything clearly. There were no hidden fees, no surprises. I invested in better farming inputs and my yield increased by 60%. I'm already planning my next season.",
    name: "Peter Kipchoge",
    role: "Smallholder Farmer, Eldoret",
    growth: "60% increase in crop yield",
  },
];

const impactStats = [
  { icon: Users, value: "3,000+", label: "Entrepreneurs Empowered" },
  { icon: Briefcase, value: "KSh 300M+", label: "Capital Disbursed" },
  { icon: TrendingUp, value: "90%", label: "Client Satisfaction" },
  { icon: MapPin, value: "30+", label: "Counties Served" },
];

const ImpactSection = () => {
  return (
    <section id="impact" className="py-20 md:py-28" aria-labelledby="impact-heading">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">Our Impact</span>
          <h2 id="impact-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
            Real Stories of Growth, Resilience & Transformation
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed">
            Behind every loan is a story of determination, hard work, and dreams being realised. These are the entrepreneurs who trusted Kechita Capital — and the results speak for themselves.
          </p>
        </div>

        {/* Impact Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {impactStats.map((stat) => (
            <div key={stat.label} className="bg-gradient-primary text-primary-foreground p-6 rounded-2xl text-center shadow-elevated">
              <stat.icon className="w-8 h-8 mx-auto mb-3 opacity-80" />
              <div className="text-3xl md:text-4xl font-bold font-display">{stat.value}</div>
              <div className="text-sm opacity-70 font-body mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials + Image Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-6">
            {testimonials.slice(0, 3).map((t) => (
              <div key={t.name} className="bg-warm p-6 rounded-xl shadow-card">
                <Quote className="w-8 h-8 text-primary/30 mb-3" />
                <p className="text-foreground italic leading-relaxed font-body mb-4">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground font-display">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                  <span className="text-xs bg-kc-green/10 text-kc-green-dark px-3 py-1 rounded-full font-semibold font-body">
                    {t.growth}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden shadow-elevated">
              <img src={communityWomen} alt="Women entrepreneurs empowered by Kechita" className="w-full h-[280px] object-cover" />
            </div>

            {testimonials.slice(3).map((t) => (
              <div key={t.name} className="bg-warm p-6 rounded-xl shadow-card">
                <Quote className="w-8 h-8 text-primary/30 mb-3" />
                <p className="text-foreground italic leading-relaxed font-body mb-4">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground font-display">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                  <span className="text-xs bg-kc-green/10 text-kc-green-dark px-3 py-1 rounded-full font-semibold font-body">
                    {t.growth}
                  </span>
                </div>
              </div>
            ))}

            {/* Second image */}
            <div className="rounded-2xl overflow-hidden shadow-elevated">
              <img src={entrepreneurMan} alt="Successful entrepreneur" className="w-full h-[280px] object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
