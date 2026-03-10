import communityWomen from "@/assets/community-women.jpg";
import { ArrowRight } from "lucide-react";

const CTABanner = () => {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0">
        <img src={communityWomen} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(210 40% 15% / 0.9), hsl(204 80% 28% / 0.85))" }} />
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground font-display mb-6 leading-tight max-w-3xl mx-auto">
          Your Business Deserves a Financial Partner That Truly Cares
        </h2>
        <p className="text-lg text-primary-foreground/80 font-body max-w-2xl mx-auto mb-8 leading-relaxed">
          Join over 3,000 entrepreneurs who have trusted Kechita Capital to support their growth journey. Whether you're just starting out or looking to expand, we're here to help you every step of the way.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-elevated"
          >
            Apply for Financing <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#services"
            className="border-2 border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 hover:bg-primary-foreground/10 transition-colors"
          >
            Learn More About Our Services
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
