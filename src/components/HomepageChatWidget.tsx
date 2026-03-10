import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "What loan products do you offer?",
  "How do I apply for a loan?",
  "What are the interest rates?",
  "How fast is the disbursement?",
];

// Predefined responses for the public chatbot (no AI backend needed for public site)
const KNOWLEDGE_BASE: Record<string, string> = {
  "loan products": "We offer 6 loan products:\n\n• **BiashaBoost** – KES 6K–15K over 6 weeks\n• **QuickCash** – KES 5K–10K over 4 weeks\n• **GrowthPlus** – KES 10K–30K over 12 weeks\n• **MamaBiz** – KES 5K–20K over 8 weeks (women entrepreneurs)\n• **TradeUp** – KES 8K–40K over 10 weeks (market traders)\n• **AgriBoost** – KES 10K–60K over 12 weeks (agricultural businesses)",
  "apply": "Applying is easy!\n\n1. **Sign up** for a free account\n2. Fill in your business details\n3. Get your **credit score** instantly\n4. Choose a loan product\n5. Receive funds in **24–48 hours** via M-Pesa\n\nYou'll need: Valid Kenyan ID, active business (3+ months), and a guarantor.",
  "interest": "Our interest rates vary by product:\n\n• BiashaBoost: ~8% flat over 6 weeks\n• QuickCash: ~6% flat over 4 weeks\n• GrowthPlus: ~12% flat over 12 weeks\n\nNo hidden fees! Processing fee is 2–3% deducted upfront.",
  "disbursement": "Once approved, funds are sent directly to your **M-Pesa within 24–48 hours**. Our fast scoring speeds up the approval process — many clients get approved the same day they apply!",
  "repayment": "We offer **weekly repayment plans** from 4–12 weeks depending on your product. Payments can be made via M-Pesa. For example, BiashaBoost is ~KES 1,250/week for 6 weeks.",
  "requirements": "You need:\n• Valid Kenyan National ID\n• An active business running for at least 3 months\n• A guarantor\n• A registered M-Pesa line\n\nNo collateral needed for loans under KES 20,000!",
  "default": "I'm Kechita's virtual assistant! I can help with questions about our loan products, application process, interest rates, and more. What would you like to know?",
};

function findAnswer(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("product") || q.includes("offer") || q.includes("types")) return KNOWLEDGE_BASE["loan products"];
  if (q.includes("apply") || q.includes("how do i") || q.includes("sign up") || q.includes("get a loan")) return KNOWLEDGE_BASE["apply"];
  if (q.includes("interest") || q.includes("rate") || q.includes("cost") || q.includes("charge")) return KNOWLEDGE_BASE["interest"];
  if (q.includes("disburse") || q.includes("fast") || q.includes("quick") || q.includes("receive") || q.includes("how long")) return KNOWLEDGE_BASE["disbursement"];
  if (q.includes("repay") || q.includes("pay back") || q.includes("weekly") || q.includes("installment")) return KNOWLEDGE_BASE["repayment"];
  if (q.includes("require") || q.includes("need") || q.includes("document") || q.includes("eligible")) return KNOWLEDGE_BASE["requirements"];
  return KNOWLEDGE_BASE["default"];
}

const HomepageChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const answer = findAnswer(msg);
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-green shadow-lg flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
        aria-label="Chat with us"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] sm:w-[380px] h-[480px] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-green px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary-foreground">
          <MessageSquare className="w-5 h-5" />
          <div>
            <span className="font-display font-bold text-sm block">Kechita Assistant</span>
            <span className="text-[10px] text-primary-foreground/70">Ask us anything</span>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="bg-muted rounded-xl px-3 py-2 rounded-bl-sm max-w-[85%]">
              <p className="text-sm text-foreground font-body">
                👋 Hi! I'm Kechita's virtual assistant. How can I help you today?
              </p>
            </div>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-warm hover:bg-muted text-foreground transition-colors border border-border/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-secondary text-secondary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}>
                <div className="whitespace-pre-wrap font-body" dangerouslySetInnerHTML={{
                  __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
                }} />
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-2 rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-secondary" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} className="shrink-0 h-9 w-9 bg-secondary hover:bg-secondary/90">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default HomepageChatWidget;
