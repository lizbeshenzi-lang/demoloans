import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "sw";

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  "nav.home": { en: "Home", sw: "Nyumbani" },
  "nav.about": { en: "About", sw: "Kuhusu" },
  "nav.mission": { en: "Mission & Vision", sw: "Dhamira na Maono" },
  "nav.services": { en: "Services", sw: "Huduma" },
  "nav.process": { en: "How It Works", sw: "Jinsi Inavyofanya Kazi" },
  "nav.impact": { en: "Impact", sw: "Athari" },
  "nav.blog": { en: "Blog", sw: "Blogu" },
  "nav.contact": { en: "Contact", sw: "Wasiliana" },
  "nav.signin": { en: "Sign In", sw: "Ingia" },
  "nav.getstarted": { en: "Get Started", sw: "Anza Sasa" },
  "nav.dashboard": { en: "Dashboard", sw: "Dashibodi" },
  "nav.signout": { en: "Sign Out", sw: "Toka" },
  // CTA
  "cta.apply": { en: "Apply for Financing", sw: "Omba Ufadhili" },
  "cta.learnmore": { en: "Learn More", sw: "Jifunze Zaidi" },
  // Calculator
  "calc.title": { en: "Plan Your Repayments", sw: "Panga Malipo Yako" },
  "calc.weekly": { en: "Weekly Payment", sw: "Malipo ya Kila Wiki" },
  "calc.total": { en: "Total Repayable", sw: "Jumla ya Kulipa" },
  "calc.product": { en: "Select Product", sw: "Chagua Bidhaa" },
  "calc.amount": { en: "Loan Amount", sw: "Kiasi cha Mkopo" },
  // Loan statuses
  "status.pending": { en: "Pending", sw: "Inasubiri" },
  "status.approved": { en: "Approved", sw: "Imeidhinishwa" },
  "status.disbursed": { en: "Disbursed", sw: "Imetolewa" },
  "status.completed": { en: "Completed", sw: "Imekamilika" },
  "status.rejected": { en: "Rejected", sw: "Imekataliwa" },
  // Common
  "common.loading": { en: "Loading...", sw: "Inapakia..." },
  "common.submit": { en: "Submit", sw: "Wasilisha" },
  "common.back": { en: "Back", sw: "Rudi" },
  "common.continue": { en: "Continue", sw: "Endelea" },
  "common.myloans": { en: "My Loans", sw: "Mikopo Yangu" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("kc-lang");
    return (saved === "sw" ? "sw" : "en") as Lang;
  });

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("kc-lang", l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
