import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/kechita-logo.jpg";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const navLinks = [
    { label: t("nav.home"), href: "#home" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.mission"), href: "#mission" },
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.process"), href: "#process" },
    { label: t("nav.impact"), href: "#impact" },
    { label: "Team", href: "#team" },
    { label: t("nav.blog"), href: "#blog" },
    { label: t("nav.contact"), href: "#contact" },
    { label: "Careers", href: "/careers", isRoute: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">
        <a href="#home" className="flex items-center gap-2" aria-label="Demo Credit Limited - Go to homepage">
          <img src={logo} alt="" className="h-12 md:h-14 w-auto" aria-hidden="true" />
          <span className="sr-only">Demo Credit Limited</span>
        </a>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-6" role="menubar">
          {navLinks.map((link) => (
            link.isRoute ? (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors focus-visible:text-primary"
                role="menuitem"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors focus-visible:text-primary"
                role="menuitem"
              >
                {link.label}
              </a>
            )
          ))}
          
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5"
                aria-label={t("nav.dashboard")}
              >
                <User className="w-4 h-4" aria-hidden="true" /> {t("nav.dashboard")}
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5"
                aria-label={t("nav.signout")}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> {t("nav.signout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors border border-primary px-4 py-2 rounded-lg"
              >
                {t("nav.signin")}
              </Link>
              <Link
                to="/signup"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-md"
                role="button"
              >
                {t("nav.getstarted")}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-foreground p-2"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="lg:hidden bg-background border-b border-border animate-fade-in" role="menu" aria-label="Mobile navigation">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              link.isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-foreground/70 hover:text-primary py-2 transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-foreground/70 hover:text-primary py-2 transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}

            <div className="flex items-center gap-2 py-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-foreground/70 hover:text-primary py-2 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> {t("nav.dashboard")}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="text-base font-medium text-foreground/70 hover:text-primary py-2 transition-colors flex items-center gap-2 text-left"
                >
                  <LogOut className="w-4 h-4" /> {t("nav.signout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="text-base font-semibold text-primary hover:text-primary/80 py-2 transition-colors border border-primary px-4 rounded-lg text-center"
                >
                  {t("nav.signin")}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="bg-primary text-primary-foreground px-5 py-3 rounded-lg text-base font-bold text-center mt-2 shadow-md"
                >
                  {t("nav.getstarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
