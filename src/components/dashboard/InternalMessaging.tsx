import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Send, X, Inbox, PenLine, Loader2, Users, Building2, MapPin,
  ChevronDown, Star, Reply, Trash2, CheckCheck, Mail, MailOpen
} from "lucide-react";

interface Message {
  id: string; sender_id: string; recipient_id: string | null; recipient_role: string | null;
  branch_id: string | null; region_id: string | null; subject: string; body: string;
  priority: string; is_read: boolean; parent_id: string | null; created_at: string;
}

interface Profile { user_id: string; full_name: string | null; email: string | null; }

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO", gm: "General Manager", regional_manager: "Regional Managers",
  branch_manager: "Branch Managers", loan_officer: "Loan Officers", admin: "Admins"
};

const InternalMessaging = () => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [view, setView] = useState<"inbox" | "sent">("inbox");

  // Compose form
  const [sendTo, setSendTo] = useState<"user" | "role" | "branch" | "region">("user");
  const [recipientId, setRecipientId] = useState("");
  const [recipientRole, setRecipientRole] = useState("loan_officer");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canBroadcast = role === "ceo" || role === "gm" || role === "regional_manager" || role === "branch_manager" || role === "admin";

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("internal_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email");
    if (data) setProfiles(data);
  }, []);

  useEffect(() => {
    if (open && user) {
      fetchMessages();
      fetchProfiles();
    }
  }, [open, user, fetchMessages, fetchProfiles]);

  // Realtime
  useEffect(() => {
    if (!open || !user) return;
    const channel = supabase
      .channel('internal-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user, fetchMessages]);

  const getProfileName = (userId: string) => {
    const p = profiles.find(p => p.user_id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  const inboxMessages = messages.filter(m => m.sender_id !== user?.id);
  const sentMessages = messages.filter(m => m.sender_id === user?.id);
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;
  const displayMessages = view === "inbox" ? inboxMessages : sentMessages;

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !user) return;
    setSending(true);
    const insertData: Record<string, any> = {
      sender_id: user.id,
      subject: subject.trim(),
      body: body.trim(),
      priority,
    };
    if (sendTo === "user" && recipientId) insertData.recipient_id = recipientId;
    if (sendTo === "role") insertData.recipient_role = recipientRole;
    if (replying) insertData.parent_id = replying;

    const { error } = await supabase.from("internal_messages").insert(insertData as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Message sent");
      setComposing(false); setReplying(null);
      setSubject(""); setBody(""); setPriority("normal");
      fetchMessages();
    }
    setSending(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("internal_messages").update({ is_read: true } as any).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("internal_messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
    setSelectedMsg(null);
    toast.success("Message deleted");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-kc-green shadow-lg flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
        aria-label="Open Messages"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-[10px] text-primary-foreground rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[420px] h-[560px] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary to-kc-green px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary-foreground">
          <MessageSquare className="w-5 h-5" />
          <span className="font-display font-bold text-sm">Internal Messages</span>
          {unreadCount > 0 && <span className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setComposing(true); setSelectedMsg(null); setReplying(null); }} className="text-primary-foreground/70 hover:text-primary-foreground p-1">
            <PenLine className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {composing ? (
        /* Compose */
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          <h3 className="font-display font-bold text-sm text-foreground">{replying ? "Reply" : "New Message"}</h3>
          {canBroadcast && !replying && (
            <div className="flex gap-1.5">
              {(["user", "role"] as const).map(t => (
                <button key={t} onClick={() => setSendTo(t)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", sendTo === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {t === "user" ? "Person" : "Role Group"}
                </button>
              ))}
            </div>
          )}
          {sendTo === "user" && !replying && (
            <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
              <option value="">Select recipient...</option>
              {profiles.filter(p => p.user_id !== user?.id).map(p => (
                <option key={p.user_id} value={p.user_id}>{p.full_name || p.email}</option>
              ))}
            </select>
          )}
          {sendTo === "role" && !replying && (
            <select value={recipientRole} onChange={e => setRecipientRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." rows={5} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
          <div className="flex items-center justify-between">
            <select value={priority} onChange={e => setPriority(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
              <option value="normal">Normal</option>
              <option value="high">🔴 High Priority</option>
              <option value="urgent">🚨 Urgent</option>
            </select>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setComposing(false); setReplying(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
                {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />} Send
              </Button>
            </div>
          </div>
        </div>
      ) : selectedMsg ? (
        /* Message Detail */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border space-y-2">
            <button onClick={() => setSelectedMsg(null)} className="text-xs text-primary hover:underline">← Back</button>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-foreground text-sm">{selectedMsg.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  From: {getProfileName(selectedMsg.sender_id)} · {new Date(selectedMsg.created_at).toLocaleString()}
                </p>
              </div>
              {selectedMsg.priority !== "normal" && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", selectedMsg.priority === "urgent" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700")}>
                  {selectedMsg.priority}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedMsg.body}</p>
          </div>
          <div className="p-3 border-t border-border flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setReplying(selectedMsg.id);
              setRecipientId(selectedMsg.sender_id);
              setSendTo("user");
              setSubject(`Re: ${selectedMsg.subject}`);
              setComposing(true);
            }}>
              <Reply className="w-3 h-3 mr-1" /> Reply
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(selectedMsg.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      ) : (
        /* Message List */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border">
            {(["inbox", "sent"] as const).map(tab => (
              <button key={tab} onClick={() => setView(tab)} className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors capitalize", view === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>
                {tab === "inbox" ? <><Inbox className="w-3 h-3 inline mr-1" />Inbox ({inboxMessages.length})</> : <><Send className="w-3 h-3 inline mr-1" />Sent ({sentMessages.length})</>}
              </button>
            ))}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : displayMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No messages
              </div>
            ) : (
              displayMessages.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMsg(m); if (!m.is_read && m.sender_id !== user?.id) markRead(m.id); }}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors",
                    !m.is_read && m.sender_id !== user?.id && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!m.is_read && m.sender_id !== user?.id ? <Mail className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> : <MailOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs truncate", !m.is_read && m.sender_id !== user?.id ? "font-bold text-foreground" : "font-medium text-foreground")}>
                          {view === "inbox" ? getProfileName(m.sender_id) : (m.recipient_id ? getProfileName(m.recipient_id) : m.recipient_role ? ROLE_LABELS[m.recipient_role] || m.recipient_role : "Broadcast")}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{new Date(m.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className={cn("text-xs truncate mt-0.5", !m.is_read && m.sender_id !== user?.id ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.subject}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{m.body.slice(0, 80)}</p>
                    </div>
                    {m.priority !== "normal" && <Star className={cn("w-3 h-3 shrink-0", m.priority === "urgent" ? "text-destructive" : "text-amber-500")} />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalMessaging;
