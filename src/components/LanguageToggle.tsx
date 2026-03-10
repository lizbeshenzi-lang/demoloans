import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "sw" : "en")}
      aria-label="Toggle language"
      className="gap-1.5 text-xs font-medium"
    >
      <Globe className="w-4 h-4" />
      {lang === "en" ? "SW" : "EN"}
    </Button>
  );
};

export default LanguageToggle;
