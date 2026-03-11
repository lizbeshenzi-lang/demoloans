import logo from "@/assets/demo-loans-logo.png";

const Footer = () => {
  return (
    <footer className="bg-navy border-t border-primary-foreground/10 mt-16" role="contentinfo" aria-label="Site footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <img src={logo} alt="Demo Loans" className="h-14 w-auto mb-4 rounded bg-white p-1" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed font-body max-w-xs">
              Demo Loans is a trusted partner for entrepreneurs and salary earners who need fast, affordable financing. We combine
              responsible lending with practical support so your next step in business or life is easier to take.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4 font-display">Quick links</h4>
            <div className="flex flex-col gap-2">
              {["About", "Mission & Vision", "Services", "How It Works", "Impact", "Blog", "Contact"].map((link) => (
                <a
                  key={link}
                  href={`/#${link.toLowerCase().replace(/ & /g, "").replace(/ /g, "")}`}
                  className="text-primary-foreground/50 hover:text-kc-green text-sm transition-colors font-body"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4 font-display">Contact us</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/50 font-body">
              <span>support@demoloans.co.ke</span>
              <span>+254 700 000 000</span>
              <span>Nairobi HQ · Branch network across Kenya</span>
              <span>Mon–Fri: 8:00am – 5:00pm</span>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-center">
          <p className="text-primary-foreground/40 text-sm font-body">
            © {new Date().getFullYear()} Demo Loans. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
