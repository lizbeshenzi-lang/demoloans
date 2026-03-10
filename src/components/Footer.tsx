import logo from "@/assets/kechita-logo.jpg";

const Footer = () => {
  return (
    <footer className="bg-mular-navy border-t border-primary-foreground/10" role="contentinfo" aria-label="Site footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <img src={logo} alt="Mular Credit" className="h-14 w-auto mb-4 rounded" />
            <p className="text-primary-foreground/50 text-sm leading-relaxed font-body max-w-xs">
              Fueling ambitions, building futures. Empowering dreams, breaking barriers through financial inclusion.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4 font-display">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {["About", "Mission & Vision", "Services", "How It Works", "Impact", "Blog", "Contact"].map((link) => (
                <a key={link} href={`#${link.toLowerCase().replace(/ & /g, "").replace(/ /g, "")}`} className="text-primary-foreground/50 hover:text-mular-green text-sm transition-colors font-body">
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4 font-display">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/50 font-body">
              <span>info@mularcredit.com</span>
              <span>+254 753 120 221</span>
              <span>Nairobi HQ • Branches Nationwide</span>
              <span>Mon - Fri: 8:00 AM - 5:00 PM</span>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-center">
          <p className="text-primary-foreground/30 text-sm font-body">
            © {new Date().getFullYear()} Kechita Capital Investment Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
