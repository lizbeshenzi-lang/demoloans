const PublicContactSection = () => {
  return (
    <section id="contact" className="py-20 md:py-28 bg-navy text-primary-foreground" aria-labelledby="public-contact-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-kc-green font-semibold text-sm tracking-wide uppercase">Talk to our team</span>
          <h2
            id="public-contact-heading"
            className="text-3xl md:text-4xl font-bold mt-3 mb-4 font-display leading-tight"
          >
            Ready to finance your next step?
          </h2>
          <p className="text-primary-foreground/70 text-lg font-body leading-relaxed">
            Call, email, or visit us and a Demo Loans officer will help you choose the right product and explain every step of
            the process in simple language.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-primary-foreground/5 rounded-2xl p-6 border border-primary-foreground/15">
            <h3 className="font-display font-semibold text-base mb-2">Call or WhatsApp</h3>
            <p className="text-sm text-primary-foreground/70 font-body mb-1">+254 700 000 000</p>
            <p className="text-xs text-primary-foreground/50 font-body">
              Mon–Fri, 8:00am – 5:00pm. We are happy to answer quick questions.
            </p>
          </div>

          <div className="bg-primary-foreground/5 rounded-2xl p-6 border border-primary-foreground/15">
            <h3 className="font-display font-semibold text-base mb-2">Email</h3>
            <p className="text-sm text-primary-foreground/70 font-body mb-1">support@demoloans.co.ke</p>
            <p className="text-xs text-primary-foreground/50 font-body">
              We respond within one business day with clear next steps.
            </p>
          </div>

          <div className="bg-primary-foreground/5 rounded-2xl p-6 border border-primary-foreground/15">
            <h3 className="font-display font-semibold text-base mb-2">Visit a branch</h3>
            <p className="text-sm text-primary-foreground/70 font-body mb-1">Nairobi HQ · Branch network across Kenya</p>
            <p className="text-xs text-primary-foreground/50 font-body">
              Walk in, ask for a Demo Loans officer, and we will guide you through the application.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicContactSection;

