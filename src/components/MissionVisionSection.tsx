import missionTeam from "@/assets/mission-team.jpg";
import communityWomen from "@/assets/community-women.jpg";
import { Eye, Compass, Star } from "lucide-react";

const MissionVisionSection = () => {
  return (
    <section id="mission" className="py-20 md:py-28" aria-labelledby="mission-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">Our Purpose</span>
          <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
            Driven by Purpose, Guided by Vision
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed">
            At Demo Credit Limited, everything we do is anchored in a clear mission and an ambitious vision for the future of financial inclusion in Kenya.
          </p>
        </div>

        {/* Mission */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Compass className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground font-display">Our Mission</h3>
            </div>
            <p className="text-lg text-foreground leading-relaxed mb-4 font-body">
              We don't just provide loans we unlock potential. We're dismantling financial barriers and creating pathways to prosperity for every Kenyan, regardless of gender, age, or background. This is financial inclusion reimagined.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6 font-body">
              We are committed to reaching underserved entrepreneurs — the market trader who needs capital to stock her stall, the farmer who wants to expand his harvest, the tailor growing her workshop. We believe these everyday business owners are the backbone of our economy, and they deserve a financial partner who understands their journey.
            </p>
            <ul className="space-y-3">
              {[
                "Provide flexible, fairly-priced financing products",
                "Promote financial literacy and business management skills",
                "Build long-term relationships based on trust and mutual respect",
                "Contribute to economic growth and poverty reduction",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 font-body">
                  <Star className="w-5 h-5 text-kc-green shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-elevated">
            <img src={missionTeam} alt="Demo Capital team working together" className="w-full h-[400px] md:h-[480px] object-cover" />
          </div>
        </div>

        {/* Vision */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 rounded-2xl overflow-hidden shadow-elevated">
            <img src={communityWomen} alt="Women entrepreneurs empowered by Demo Capital" className="w-full h-[400px] md:h-[480px] object-cover" />
          </div>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-green flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground font-display">Our Vision</h3>
            </div>
            <p className="text-lg text-foreground leading-relaxed mb-4 font-body">
              To be the most trusted and impactful financial partner for small businesses and entrepreneurs — a catalyst for economic empowerment, financial inclusion, and community development.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6 font-body">
              We envision a future where every hardworking entrepreneur has access to the capital and support they need to turn their aspirations into thriving businesses. A future where financial services are not a barrier, but a bridge — connecting ambition to achievement.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6 font-body">
              We dream of communities where small businesses flourish, families prosper, and economies grow stronger from the ground up. Demo Capital is working every day to make that vision a reality, one entrepreneur at a time.
            </p>
            <div className="bg-warm p-6 rounded-xl border border-border">
              <p className="text-foreground font-display text-xl italic leading-relaxed">
                "When entrepreneurs succeed, entire communities rise. That's the future we're building."
              </p>
              <p className="text-muted-foreground text-sm mt-2 font-body">— Demo Capital Leadership</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionVisionSection;
