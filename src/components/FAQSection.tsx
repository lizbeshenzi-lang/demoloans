import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "What are the requirements to apply for a loan?",
    a: "You need a valid Kenyan ID, an active business that has been running for at least 3 months, and a guarantor. We welcome all types of small businesses — from market vendors to boda boda operators.",
  },
  {
    q: "How quickly can I receive my loan?",
    a: "Once your application is approved, funds are disbursed within 24–48 hours directly to your M-Pesa. Our fast scoring system speeds up the approval process significantly.",
  },
  {
    q: "What loan amounts do you offer?",
    a: "We offer loans ranging from KES 5,000 to KES 60,000 across multiple products. First-time borrowers typically start with KES 5,000–15,000 and can access higher amounts with good repayment history.",
  },
  {
    q: "What are the repayment terms?",
    a: "We offer flexible weekly repayment plans from 4 to 12 weeks depending on the product. For example, our BiashaBoost product is KES 6,000 repaid over 6 weeks at approximately KES 1,250 per week.",
  },
  {
    q: "What happens if I can't make a payment on time?",
    a: "We understand that businesses face challenges. Contact your loan officer immediately — we offer restructuring options and grace periods for genuine hardship cases. Early communication is key.",
  },
  {
    q: "How does the credit scoring work?",
    a: "Our system analyzes your business type, repayment history, location, and market factors to generate a risk score. This helps us make faster, fairer lending decisions — just data-driven insights.",
  },
  {
    q: "Can I apply for a second loan while still repaying?",
    a: "Yes! If you have a strong repayment record (80%+ on-time payments), you may qualify for a top-up loan or a new product before your current loan is fully repaid.",
  },
  {
    q: "Is my personal information safe?",
    a: "Absolutely. We use bank-grade encryption and strict data policies. Your information is never shared with third parties and is only used for loan processing and fraud prevention.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-warm" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
          </div>
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            Got Questions? We've Got Answers
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            Everything you need to know about our financing solutions, application process, and repayment plans.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-background rounded-xl border border-border px-5 shadow-card data-[state=open]:shadow-card-hover transition-shadow"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-foreground text-sm md:text-base hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-body text-sm leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
