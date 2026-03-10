import teamCeo from "@/assets/team-ceo.jpg";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import teamCoo from "@/assets/team-coo.jpg";
import teamCfo from "@/assets/team-cfo.jpg";
import teamOps from "@/assets/team-ops.jpg";
import teamTech from "@/assets/team-tech.jpg";
import teamMarketing from "@/assets/team-marketing.jpg";
import { Linkedin, Twitter, Star } from "lucide-react";

const founder = {
  name: "Simon Mutunga",
  role: "Founder & Chief Executive Officer",
  img: teamCeo,
  bio: "A visionary leader with over 15 years in financial services across East Africa, Simon founded Demo Capital with a singular mission: to democratize access to capital for everyday entrepreneurs. His relentless drive to empower underserved communities has transformed Demo from a single-branch operation into a nationwide force powering over 3,000 businesses. Under his leadership, Demo has disbursed over KSh 300 million and earned a reputation as the most trusted micro-lending partner in Kenya. Simon's philosophy is simple — when you invest in people, the returns are limitless.",
};

const team = [
  {
    name: "Faith Wanjiku",
    role: "Chief Operating Officer",
    img: teamCoo,
    bio: "Ensures seamless operations across all 26 branches and 7 regions with relentless efficiency.",
  },
  {
    name: "Daniel Kamau",
    role: "Chief Financial Officer",
    img: teamCfo,
    bio: "Manages financial strategy and risk, keeping Demo's growth sustainable and investor-ready.",
  },
  {
    name: "Agnes Nyambura",
    role: "Director of Operations",
    img: teamOps,
    bio: "Oversees loan processing, client onboarding, and field team coordination nationwide.",
  },
  {
    name: "Kevin Otieno",
    role: "Head of Technology",
    img: teamTech,
    bio: "Architects the digital platforms powering Demo's 1–3 hour disbursement promise.",
  },
  {
    name: "Sarah Wanjiku",
    role: "Head of Marketing & Growth",
    img: teamMarketing,
    bio: "Drives brand awareness and client acquisition across urban and rural markets.",
  },
];

const TeamSection = () => {
  return (
    <section id="team" className="py-20 md:py-28 bg-warm" aria-labelledby="team-heading">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">Our Leadership</span>
          <h2 id="team-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
            The People Behind Your Growth
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed">
            A dedicated team of professionals committed to empowering Kenya's entrepreneurs with accessible, fair, and fast financing.
          </p>
        </div>

        {/* Founder — Featured Card */}
        <div className="relative mb-16">
          <div className="bg-gradient-primary rounded-3xl overflow-hidden shadow-elevated">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Photo */}
              <div className="relative">
                <img
                  src={founder.img}
                  alt={founder.name}
                  className="w-full h-[400px] lg:h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-current" /> FOUNDER & CEO
                </div>
              </div>

              {/* Bio */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-3xl md:text-4xl font-bold text-primary-foreground font-display mb-2">
                  {founder.name}
                </h3>
                <p className="text-secondary text-sm font-semibold uppercase tracking-wider mb-6">
                  {founder.role}
                </p>
                <p className="text-primary-foreground/85 text-base leading-relaxed font-body mb-8">
                  {founder.bio}
                </p>
                <div className="flex gap-3">
                  <span className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 transition-colors cursor-pointer">
                    <Linkedin className="w-4 h-4" />
                  </span>
                  <span className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/20 transition-colors cursor-pointer">
                    <Twitter className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {team.map((member, i) => (
            <ScrollFadeIn key={member.name} delay={i * 150}>
              <div
                className="group bg-background rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-foreground font-display text-lg">{member.name}</h4>
                  <p className="text-primary text-xs font-semibold uppercase tracking-wider mt-0.5 mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">{member.bio}</p>
                </div>
              </div>
            </ScrollFadeIn>
          ))}
        </div>

        {/* Join CTA */}
        <div className="text-center mt-14">
          <p className="text-muted-foreground font-body mb-4">Want to be part of Kenya's financial inclusion revolution?</p>
          <a
            href="/careers"
            className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity shadow-elevated"
          >
            Join Our Team
          </a>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
