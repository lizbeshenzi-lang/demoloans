import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

import slide1 from "@/assets/hero-slide-1.jpg";
import slide2 from "@/assets/hero-slide-2.jpg";
import slide3 from "@/assets/hero-slide-3.jpg";
import slide4 from "@/assets/hero-slide-4.jpg";
import slide5 from "@/assets/hero-slide-5.jpg";

const SLIDES = [
  { img: slide1, caption: "Fueling Ambitions, Building Futures", sub: "Empowering women entrepreneurs and marginalized communities" },
  { img: slide2, caption: "Empowering Dreams, Breaking Barriers", sub: "Digital financial inclusion for every Kenyan" },
  { img: slide3, caption: "Women-Led Economic Transformation", sub: "73% of our borrowers are women driving change" },
  { img: slide4, caption: "Youth Innovation & Enterprise", sub: "Supporting young entrepreneurs aged 18-35" },
  { img: slide5, caption: "Community Wealth Creation", sub: "Building economic ecosystems that lift entire communities" },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        // Only compute parallax while section is visible
        if (rect.bottom > 0) {
          setScrollY(window.scrollY);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => goTo(current + 1), 5000);
    return () => clearInterval(t);
  }, [paused, current, goTo]);

  return (
    <section id="home" className="relative" ref={sectionRef} aria-label="Hero banner">
      {/* Full-width image carousel */}
      <div
        className="relative w-full aspect-[16/7] min-h-[520px] max-h-[85vh] overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured highlights"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              opacity: i === current ? 1 : 0,
              transform: i === current ? "scale(1)" : "scale(1.04)",
            }}
          >
            <img
              src={slide.img}
              alt={slide.caption}
              className="w-full h-[120%] object-cover will-change-transform"
              style={{ transform: `translateY(${scrollY * -0.15}px)` }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}

        {/* Bottom caption bar — sits at the bottom, semi-transparent for legibility but NOT covering the image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-mular-navy/80 via-mular-navy/40 to-transparent pt-20 pb-6 px-6 md:px-12">
          <div className="container mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2
                className="text-2xl md:text-4xl lg:text-5xl font-bold font-display text-primary-foreground leading-tight transition-all duration-500"
                key={`h-${current}`}
              >
                {SLIDES[current].caption}
              </h2>
              <p className="text-sm md:text-base text-primary-foreground/70 font-body mt-2 max-w-lg">
                {SLIDES[current].sub}
              </p>
            </div>

            {/* Nav arrows */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => goTo(current - 1)}
                className="w-10 h-10 rounded-full border border-primary-foreground/30 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(current + 1)}
                className="w-10 h-10 rounded-full border border-primary-foreground/30 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dot indicators with progress */}
          <div className="container mx-auto flex gap-2 mt-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="relative h-1 flex-1 max-w-[80px] rounded-full overflow-hidden bg-primary-foreground/20"
                aria-label={`Go to slide ${i + 1}`}
              >
                {i === current ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-secondary rounded-full"
                    style={{
                      animation: paused ? "none" : "progress 5s linear forwards",
                      width: paused ? "100%" : undefined,
                    }}
                  />
                ) : i < current ? (
                  <div className="absolute inset-0 bg-primary-foreground/50 rounded-full" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA strip below the carousel — clean, no overlay */}
      <div className="bg-kc-navy">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground">
                Affordable Financing That <span className="text-secondary">Grows With You</span>
              </h1>
              <p className="text-sm text-primary-foreground/60 font-body mt-1.5 max-w-xl">
                Fast microloans disbursed via M-Pesa in 24 hours. No collateral for loans under KES 20,000.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/signup"
                className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#services"
                className="border border-primary-foreground/20 text-primary-foreground px-6 py-3 rounded-lg font-semibold text-sm inline-flex items-center gap-2 hover:bg-primary-foreground/5 transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Our Products
              </a>
            </div>
          </div>

          {/* Stat strip */}
          <div className="flex flex-wrap gap-8 md:gap-14 mt-8 pt-6 border-t border-primary-foreground/10">
            {[
              { num: "3,000+", label: "Businesses Supported" },
              { num: "KSh 300M+", label: "Capital Disbursed" },
              { num: "90%", label: "Client Satisfaction" },
              { num: "1–3 hrs", label: "Average Disbursement" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold font-display text-primary-foreground">{s.num}</p>
                <p className="text-xs text-primary-foreground/50 font-body">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
