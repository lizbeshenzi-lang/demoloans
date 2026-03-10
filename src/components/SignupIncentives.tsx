import { Link } from "react-router-dom";
import {
  Zap, Shield, Clock, TrendingUp, Gift, Users, Star, ArrowRight, CheckCircle
} from "lucide-react";

const incentives = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Credit Score",
    desc: "Get your creditworthiness assessed in seconds — no paperwork, no waiting. We score you fairly based on your business potential.",
    highlight: "FREE",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "24-Hour Disbursement",
    desc: "Approved loans hit your M-Pesa within 24 hours. No more waiting weeks for bank loans to process.",
    highlight: "FAST",
  },
  {
    icon: <Gift className="w-6 h-6" />,
    title: "First Loan Bonus",
    desc: "New clients get reduced processing fees on their first loan — plus priority support from a dedicated loan officer.",
    highlight: "BONUS",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Grow Your Limit",
    desc: "Repay on time and unlock higher loan amounts automatically. Top clients access up to KES 60,000 with premium rates.",
    highlight: "EARN",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "No Hidden Charges",
    desc: "Transparent weekly repayments with zero surprise fees. What you see is what you pay — guaranteed.",
    highlight: "CLEAR",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Refer & Earn",
    desc: "Refer a friend and both of you get reduced rates on your next loan cycle. Build your community, grow together.",
    highlight: "SHARE",
  },
];

const testimonials = [
  { name: "Grace Wanjiku", biz: "Mama Mboga, Westlands", text: "I got my first loan of KES 8,000 in just one day. Now I'm on my third cycle at KES 25,000!" },
  { name: "James Otieno", biz: "Boda Boda, Kisumu", text: "The weekly payments are so manageable. No stress, no pressure. Kechita understands small business." },
  { name: "Fatuma Hassan", biz: "Tailor, Mombasa", text: "My loan officer checks on me every week. It feels like they genuinely want me to succeed." },
];

const SignupIncentives = () => {
  return (
    <section id="incentives" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4" /> Why Join Kechita Capital
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            Start Growing Your Business <span className="text-gradient-primary">Today</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            Hundreds of entrepreneurs have already transformed their businesses with Kechita. Here's what's waiting for you.
          </p>
        </div>

        {/* Incentive Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {incentives.map((item, i) => (
            <div key={i} className="group bg-warm rounded-2xl p-6 border border-border hover:shadow-card-hover hover:border-primary/20 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded-full">
                  {item.highlight}
                </span>
              </div>
              <h3 className="font-display font-bold text-foreground text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-14">
          <h3 className="text-center font-display font-bold text-foreground text-xl mb-8">
            Hear From Our Clients
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-warm rounded-2xl p-5 border border-border">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-foreground font-body mb-4 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground font-display">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.biz}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-primary rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-3">
            Ready to Get Started?
          </h3>
          <p className="text-primary-foreground/80 font-body mb-6 max-w-xl mx-auto">
            Create your free account in 2 minutes and get your credit score instantly. No obligations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="bg-background text-primary px-8 py-3.5 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 hover:bg-background/90 transition-colors shadow-elevated"
            >
              <CheckCircle className="w-5 h-5" /> Create Free Account
            </Link>
            <Link
              to="/login"
              className="border-2 border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 hover:bg-primary-foreground/10 transition-colors"
            >
              Already a Member? Sign In <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignupIncentives;
