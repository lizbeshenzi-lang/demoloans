import entrepreneurWoman from "@/assets/entrepreneur-woman.jpg";
import partnership from "@/assets/partnership.jpg";
import { Heart, Users, Target, Handshake, Award, Globe } from "lucide-react";

const values = [
  { icon: Heart, title: "Empowerment", desc: "We believe every entrepreneur deserves access to capital to grow their dreams, regardless of their size or background." },
  { icon: Users, title: "Community", desc: "Building stronger communities through financial inclusion, job creation, and sustainable business growth." },
  { icon: Target, title: "Transparency", desc: "Clear terms, honest communication, and absolutely no hidden fees — ever. What you see is what you get." },
  { icon: Handshake, title: "Partnership", desc: "We walk alongside our clients as long-term financial partners, celebrating every milestone together." },
  { icon: Award, title: "Integrity", desc: "We operate with the highest ethical standards, treating every client with dignity and respect." },
  { icon: Globe, title: "Inclusion", desc: "Reaching underserved entrepreneurs in both urban and rural areas, ensuring no one is left behind." },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-warm" aria-labelledby="about-heading">
      <div className="container mx-auto px-4">
        {/* Main About */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
          {/* Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-elevated">
              <img src={entrepreneurWoman} alt="Entrepreneur supported by Mular Credit" className="w-full h-[400px] md:h-[520px] object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-gradient-primary text-primary-foreground p-6 rounded-xl shadow-elevated hidden md:block">
              <div className="text-3xl font-bold font-display">Your Growth</div>
              <div className="text-sm opacity-80">Our Pride</div>
            </div>
            {/* Secondary image */}
            <div className="absolute -top-4 -left-4 w-32 h-32 rounded-xl overflow-hidden shadow-elevated hidden lg:block border-4 border-background">
              <img src={partnership} alt="Business partnership" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="text-primary font-semibold text-sm tracking-wide uppercase">About Mular Credit</span>
            <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-6 font-display leading-tight">
              A Financial Partner You Can Trust
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4 font-body">
              Mular Credit is a financial services company dedicated to providing loans to entrepreneurs, traders, and everyday business owners. Founded with a deep commitment to financial inclusion, we exist to bridge the gap between ambition and opportunity.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed mb-4 font-body">
              For over a decade, we have served hundreds of entrepreneurs across diverse sectors — from market traders and retail shop owners to tailors, farmers, and food vendors. We understand the unique challenges small businesses face, and we design our products to meet those needs with flexibility and fairness.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed mb-8 font-body">
              At Mular Credit, we believe that when businesses grow, communities thrive. That's why we go beyond lending — offering financial literacy training, business advisory support, and a genuine partnership that helps our clients build sustainable, profitable enterprises.
            </p>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl shadow-card mb-2">
              <div className="w-1 h-16 bg-gradient-green rounded-full shrink-0" />
              <blockquote className="text-foreground italic font-display text-lg">
                "We don't just fund businesses — we invest in people and their potential."
              </blockquote>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">Our Core Values</span>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-3 mb-4 font-display">
            The Principles That Guide Everything We Do
          </h3>
          <p className="text-muted-foreground font-body">
            These values are not just words on a wall — they are the foundation of every interaction, every loan, and every relationship we build.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {values.map((v) => (
            <div key={v.title} className="flex gap-4 p-5 bg-background rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                <v.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground font-display text-lg">{v.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 font-body leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
