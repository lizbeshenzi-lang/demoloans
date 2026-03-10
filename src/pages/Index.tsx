import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import MissionVisionSection from "@/components/MissionVisionSection";
import ServicesSection from "@/components/ServicesSection";
import ProcessSection from "@/components/ProcessSection";
import ImpactSection from "@/components/ImpactSection";
import TeamSection from "@/components/TeamSection";
import SignupIncentives from "@/components/SignupIncentives";
import FAQSection from "@/components/FAQSection";
import CTABanner from "@/components/CTABanner";
import BlogSection from "@/components/BlogSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import HomepageChatWidget from "@/components/HomepageChatWidget";
import LoanCalculator from "@/components/LoanCalculator";
import ScrollFadeIn from "@/components/ScrollFadeIn";

const Index = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" role="main">
        <HeroSection />
        <ScrollFadeIn><AboutSection /></ScrollFadeIn>
        <ScrollFadeIn><MissionVisionSection /></ScrollFadeIn>
        <ScrollFadeIn><ServicesSection /></ScrollFadeIn>
        <ScrollFadeIn><LoanCalculator /></ScrollFadeIn>
        <ScrollFadeIn><ProcessSection /></ScrollFadeIn>
        <ScrollFadeIn><ImpactSection /></ScrollFadeIn>
        <ScrollFadeIn><TeamSection /></ScrollFadeIn>
        <ScrollFadeIn><SignupIncentives /></ScrollFadeIn>
        <ScrollFadeIn><FAQSection /></ScrollFadeIn>
        <ScrollFadeIn><CTABanner /></ScrollFadeIn>
        <ScrollFadeIn><BlogSection /></ScrollFadeIn>
        <ScrollFadeIn><ContactSection /></ScrollFadeIn>
      </main>
      <Footer />
      <HomepageChatWidget />
    </div>
  );
};

export default Index;
