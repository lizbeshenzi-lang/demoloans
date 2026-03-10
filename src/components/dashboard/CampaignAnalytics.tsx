import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, Send, CheckCircle, XCircle, Clock, Loader2,
  BarChart3, PieChart as PieIcon, Activity, CalendarIcon
} from "lucide-react";
import { format, subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SMSMessage {
  id: string;
  campaign_id: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  created_at: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(var(--destructive))",
  "hsl(217 91% 60%)",
];

type PresetKey = "7d" | "30d" | "90d" | "all" | "custom";
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

const CampaignAnalytics = () => {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetKey>("30d");
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  const handlePreset = (key: PresetKey) => {
    setPreset(key);
    const now = new Date();
    if (key === "7d") { setFromDate(subDays(now, 7)); setToDate(now); }
    else if (key === "30d") { setFromDate(subDays(now, 30)); setToDate(now); }
    else if (key === "90d") { setFromDate(subMonths(now, 3)); setToDate(now); }
    else if (key === "all") { setFromDate(undefined); setToDate(undefined); }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [msgRes, campRes] = await Promise.all([
        supabase.from("sms_messages").select("id, campaign_id, status, sent_at, created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("sms_campaigns").select("id, name, campaign_type, total_sent, total_delivered, total_failed, created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      setMessages((msgRes.data || []) as SMSMessage[]);
      setCampaigns((campRes.data || []) as Campaign[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (fromDate && isBefore(d, startOfDay(fromDate))) return false;
    if (toDate && isAfter(d, endOfDay(toDate))) return false;
    return true;
  };

  const filteredMessages = useMemo(() => messages.filter(m => inRange(m.created_at)), [messages, fromDate, toDate]);
  const filteredCampaigns = useMemo(() => campaigns.filter(c => inRange(c.created_at)), [campaigns, fromDate, toDate]);

  // Delivery rate trend (by week)
  const deliveryTrend = useMemo(() => {
    const weeks: Record<string, { sent: number; delivered: number; failed: number }> = {};
    filteredCampaigns.forEach(c => {
      const d = new Date(c.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weeks[key]) weeks[key] = { sent: 0, delivered: 0, failed: 0 };
      weeks[key].sent += c.total_sent || 0;
      weeks[key].delivered += c.total_delivered || 0;
      weeks[key].failed += c.total_failed || 0;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, d]) => ({
        week: new Date(week).toLocaleDateString("en", { month: "short", day: "numeric" }),
        sent: d.sent,
        delivered: d.delivered,
        failed: d.failed,
        rate: d.sent > 0 ? Math.round((d.delivered / d.sent) * 100) : 0,
      }));
  }, [filteredCampaigns]);

  // Best send times (hour of day)
  const sendTimeData = useMemo(() => {
    const hours: Record<number, { total: number; delivered: number }> = {};
    filteredMessages.forEach(m => {
      if (!m.sent_at) return;
      const h = new Date(m.sent_at).getHours();
      if (!hours[h]) hours[h] = { total: 0, delivered: 0 };
      hours[h].total++;
      if (m.status === "sent" || m.status === "delivered") hours[h].delivered++;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}:00`,
      messages: hours[h]?.total || 0,
      deliveryRate: hours[h]?.total ? Math.round((hours[h].delivered / hours[h].total) * 100) : 0,
    })).filter(d => d.messages > 0);
  }, [filteredMessages]);

  // Campaign type comparison
  const typeComparison = useMemo(() => {
    const types: Record<string, { sent: number; delivered: number; failed: number; count: number }> = {};
    campaigns.forEach(c => {
      const t = c.campaign_type || "other";
      if (!types[t]) types[t] = { sent: 0, delivered: 0, failed: 0, count: 0 };
      types[t].sent += c.total_sent || 0;
      types[t].delivered += c.total_delivered || 0;
      types[t].failed += c.total_failed || 0;
      types[t].count++;
    });
    return Object.entries(types).map(([type, d]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      campaigns: d.count,
      sent: d.sent,
      delivered: d.delivered,
      failed: d.failed,
      rate: d.sent > 0 ? Math.round((d.delivered / d.sent) * 100) : 0,
    }));
  }, [filteredCampaigns]);

  // Summary stats
  const totals = useMemo(() => {
    const t = filteredCampaigns.reduce((acc, c) => ({
      sent: acc.sent + (c.total_sent || 0),
      delivered: acc.delivered + (c.total_delivered || 0),
      failed: acc.failed + (c.total_failed || 0),
    }), { sent: 0, delivered: 0, failed: 0 });
    return { ...t, rate: t.sent > 0 ? Math.round((t.delivered / t.sent) * 1000) / 10 : 0, campaigns: filteredCampaigns.length };
  }, [filteredCampaigns]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Campaign Performance Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Delivery trends, optimal send times, and campaign type comparison</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "outline"}
            onClick={() => handlePreset(p.key)}
            className="text-xs h-8"
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 text-xs justify-start", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {fromDate ? format(fromDate, "MMM d, yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => { setFromDate(d); setPreset("custom"); }}
                disabled={(d) => d > new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 text-xs justify-start", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {toDate ? format(toDate, "MMM d, yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => { setToDate(d); setPreset("custom"); }}
                disabled={(d) => d > new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        {preset === "custom" && fromDate && toDate && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {format(fromDate, "MMM d")} – {format(toDate, "MMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard icon={<BarChart3 className="w-5 h-5" />} label="Campaigns" value={totals.campaigns.toString()} />
        <SummaryCard icon={<Send className="w-5 h-5" />} label="Total Sent" value={totals.sent.toLocaleString()} />
        <SummaryCard icon={<CheckCircle className="w-5 h-5" />} label="Delivered" value={totals.delivered.toLocaleString()} color="text-green-600" />
        <SummaryCard icon={<XCircle className="w-5 h-5" />} label="Failed" value={totals.failed.toLocaleString()} color="text-destructive" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="Delivery Rate" value={`${totals.rate}%`} color="text-primary" />
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No campaign data yet. Send campaigns to see analytics.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Delivery Rate Trend */}
          <div className="bg-background rounded-xl border border-border p-5">
            <h3 className="font-semibold font-display text-foreground text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Delivery Rate Trend
            </h3>
            {deliveryTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={deliveryTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="delivered" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Delivered" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" strokeWidth={2} name="Failed" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" name="Rate %" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet</p>
            )}
          </div>

          {/* Best Send Times */}
          <div className="bg-background rounded-xl border border-border p-5">
            <h3 className="font-semibold font-display text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Best Send Times
            </h3>
            {sendTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sendTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" name="Messages" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deliveryRate" fill="hsl(142 76% 36%)" name="Delivery %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet</p>
            )}
          </div>

          {/* Campaign Type Comparison */}
          <div className="bg-background rounded-xl border border-border p-5">
            <h3 className="font-semibold font-display text-foreground text-sm mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" /> Campaign Type Breakdown
            </h3>
            {typeComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={typeComparison} dataKey="sent" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, rate }) => `${type} ${rate}%`}>
                    {typeComparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet</p>
            )}
          </div>

          {/* Type Performance Table */}
          <div className="bg-background rounded-xl border border-border p-5">
            <h3 className="font-semibold font-display text-foreground text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Type Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium text-xs">Type</th>
                    <th className="text-right py-2 text-muted-foreground font-medium text-xs">Campaigns</th>
                    <th className="text-right py-2 text-muted-foreground font-medium text-xs">Sent</th>
                    <th className="text-right py-2 text-muted-foreground font-medium text-xs">Delivered</th>
                    <th className="text-right py-2 text-muted-foreground font-medium text-xs">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {typeComparison.map(t => (
                    <tr key={t.type} className="border-b border-border/50">
                      <td className="py-2 font-medium text-foreground">{t.type}</td>
                      <td className="py-2 text-right text-muted-foreground">{t.campaigns}</td>
                      <td className="py-2 text-right text-muted-foreground">{t.sent}</td>
                      <td className="py-2 text-right text-green-600">{t.delivered}</td>
                      <td className="py-2 text-right font-semibold text-primary">{t.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) => (
  <div className="bg-background rounded-xl border border-border p-4">
    <div className={`w-6 h-6 mb-1.5 ${color || "text-muted-foreground"}`}>{icon}</div>
    <p className="text-xl font-bold font-display text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default CampaignAnalytics;
