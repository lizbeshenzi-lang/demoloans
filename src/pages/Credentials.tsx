import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Check, Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const PASSWORD = "Demo2026!";
const LOGIN_URL = "https://Demo-growth-hub.lovable.app/login";

interface Credential {
  role: string;
  name: string;
  email: string;
  tier: string;
}

const credentials: Credential[] = [
  // Executive
  { tier: "Executive", role: "System Admin", name: "Admin", email: "admin.new@demo.test" },
  { tier: "Executive", role: "CEO", name: "James Mwangi", email: "ceo@Demo.test" },
  { tier: "Executive", role: "General Manager", name: "Faith Wanjiku", email: "gm@Demo.test" },
  { tier: "Executive", role: "Marketing Lead", name: "Sarah Wanjiku", email: "marketing@Demo.test" },
  // Regional Managers
  { tier: "Regional Managers", role: "RM - Nairobi", name: "Peter Ochieng", email: "rm.nairobi@Demo.test" },
  { tier: "Regional Managers", role: "RM - Central", name: "Grace Muthoni", email: "rm.central@Demo.test" },
  { tier: "Regional Managers", role: "RM - Coast", name: "Hassan Omar", email: "rm.coast@Demo.test" },
  { tier: "Regional Managers", role: "RM - Western", name: "Victor Wanyama", email: "rm.western@Demo.test" },
  { tier: "Regional Managers", role: "RM - Rift Valley", name: "Gladys Cherono", email: "rm.riftvalley@Demo.test" },
  { tier: "Regional Managers", role: "RM - Eastern", name: "Timothy Muturi", email: "rm.eastern@Demo.test" },
  { tier: "Regional Managers", role: "RM - North Eastern", name: "Abdi Noor", email: "rm.northeastern@Demo.test" },
  // Branch Managers
  { tier: "Branch Managers", role: "BM - Westlands", name: "Alice Kamau", email: "bm.westlands@Demo.test" },
  { tier: "Branch Managers", role: "BM - CBD", name: "David Njoroge", email: "bm.cbd@Demo.test" },
  { tier: "Branch Managers", role: "BM - Eastlands", name: "Esther Wambui", email: "bm.eastlands@Demo.test" },
  { tier: "Branch Managers", role: "BM - Karen", name: "Samuel Kipchoge", email: "bm.karen@Demo.test" },
  { tier: "Branch Managers", role: "BM - Mombasa", name: "Amina Said", email: "bm.mombasa@Demo.test" },
  { tier: "Branch Managers", role: "BM - Kisumu", name: "Otieno Ouma", email: "bm.kisumu@Demo.test" },
  { tier: "Branch Managers", role: "BM - Nakuru", name: "Lydia Chebet", email: "bm.nakuru@Demo.test" },
  { tier: "Branch Managers", role: "BM - Nyeri", name: "John Kariuki", email: "bm.nyeri@Demo.test" },
  { tier: "Branch Managers", role: "BM - Eldoret", name: "Margaret Jeptoo", email: "bm.eldoret@Demo.test" },
  { tier: "Branch Managers", role: "BM - Thika", name: "Francis Muturi", email: "bm.thika@Demo.test" },
  { tier: "Branch Managers", role: "BM - Malindi", name: "Fatuma Ali", email: "bm.malindi@Demo.test" },
  { tier: "Branch Managers", role: "BM - Kakamega", name: "Wycliffe Barasa", email: "bm.kakamega@Demo.test" },
  { tier: "Branch Managers", role: "BM - Bungoma", name: "Josephine Nafula", email: "bm.bungoma@Demo.test" },
  { tier: "Branch Managers", role: "BM - Vihiga", name: "Cleophas Shimoli", email: "bm.vihiga@Demo.test" },
  { tier: "Branch Managers", role: "BM - Busia", name: "Rosaline Akoth", email: "bm.busia@Demo.test" },
  { tier: "Branch Managers", role: "BM - Narok", name: "Lemayian Saitoti", email: "bm.narok@Demo.test" },
  { tier: "Branch Managers", role: "BM - Kericho", name: "Hellen Chepkemoi", email: "bm.kericho@Demo.test" },
  { tier: "Branch Managers", role: "BM - Bomet", name: "Kipkirui Bett", email: "bm.bomet@Demo.test" },
  { tier: "Branch Managers", role: "BM - Kajiado", name: "Nashipai Olenguruone", email: "bm.kajiado@Demo.test" },
  { tier: "Branch Managers", role: "BM - Machakos", name: "Benedicta Mwikali", email: "bm.machakos@Demo.test" },
  { tier: "Branch Managers", role: "BM - Kitui", name: "Musyoka Ndunda", email: "bm.kitui@Demo.test" },
  { tier: "Branch Managers", role: "BM - Embu", name: "Njiru Karimi", email: "bm.embu@Demo.test" },
  { tier: "Branch Managers", role: "BM - Meru", name: "Mugambi Kiome", email: "bm.meru@Demo.test" },
  { tier: "Branch Managers", role: "BM - Garissa", name: "Ahmed Hassan", email: "bm.garissa@Demo.test" },
  { tier: "Branch Managers", role: "BM - Wajir", name: "Halima Abdirahman", email: "bm.wajir@Demo.test" },
  { tier: "Branch Managers", role: "BM - Isiolo", name: "Dida Roba", email: "bm.isiolo@Demo.test" },
  // Loan Officers (sample)
  { tier: "Loan Officers", role: "LO - Westlands 1", name: "Catherine Njeri", email: "lo.westlands1@Demo.test" },
  { tier: "Loan Officers", role: "LO - Westlands 2", name: "Brian Mutua", email: "lo.westlands2@Demo.test" },
  { tier: "Loan Officers", role: "LO - CBD 1", name: "Diana Achieng", email: "lo.cbd1@Demo.test" },
  { tier: "Loan Officers", role: "LO - CBD 2", name: "Kevin Otieno", email: "lo.cbd2@Demo.test" },
  // Client
  { tier: "Clients", role: "Sample Client", name: "Test Client", email: "client01@Demo.test" },
];

const announcementMessage = `Subject: Demo Capital Digital Transformation — New Platform Access

Dear Team,

I am pleased to announce that Demo Capital is embracing a new digital era. We have launched the Demo Growth Hub, a modern platform that will streamline our loan operations, client management, reporting, and internal communications across all 7 regions and 26 branches.

The platform is currently in TESTING PHASE and we need each of you to log in, explore your dashboard, and provide feedback.

Platform URL: ${LOGIN_URL}

How to log in:
1. Visit the link above
2. Use your assigned email and password below
3. Change your password after first login

————————————————

CEO — James Mwangi
Email: ceo@Demo.test | Password: ${PASSWORD}

General Manager — Faith Wanjiku
Email: gm@Demo.test | Password: ${PASSWORD}

Marketing Lead — Sarah Wanjiku
Email: marketing@Demo.test | Password: ${PASSWORD}

————————————————

Regional Managers:
• Nairobi — Peter Ochieng: rm.nairobi@Demo.test
• Central — Grace Muthoni: rm.central@Demo.test
• Coast — Hassan Omar: rm.coast@Demo.test
• Western — Victor Wanyama: rm.western@Demo.test
• Rift Valley — Gladys Cherono: rm.riftvalley@Demo.test
• Eastern — Timothy Muturi: rm.eastern@Demo.test
• North Eastern — Abdi Noor: rm.northeastern@Demo.test

Branch Managers (email format: bm.[branch]@Demo.test):
• Westlands — Alice Kamau | CBD — David Njoroge | Eastlands — Esther Wambui
• Karen — Samuel Kipchoge | Nakuru — Lydia Chebet | Nyeri — John Kariuki
• Eldoret — Margaret Jeptoo | Thika — Francis Muturi | Mombasa — Amina Said
• Kisumu — Otieno Ouma | Malindi — Fatuma Ali | Kakamega — Wycliffe Barasa
• Bungoma — Josephine Nafula | Vihiga — Cleophas Shimoli | Busia — Rosaline Akoth
• Narok — Lemayian Saitoti | Kericho — Hellen Chepkemoi | Bomet — Kipkirui Bett
• Kajiado — Nashipai Olenguruone | Machakos — Benedicta Mwikali | Kitui — Musyoka Ndunda
• Embu — Njiru Karimi | Meru — Mugambi Kiome | Garissa — Ahmed Hassan
• Wajir — Halima Abdirahman | Isiolo — Dida Roba

Loan Officers (email format: lo.[branch][1 or 2]@Demo.test):
Two officers per branch. Example: lo.westlands1@Demo.test, lo.mombasa2@Demo.test

All passwords: ${PASSWORD}

————————————————

What to do:
1. Log in and explore your role-specific dashboard
2. Verify that your branch/region data looks correct
3. Report any issues to the Admin (admin.new@demo.test)

IMPORTANT: This is a testing environment. Please do not enter real client data yet. We will announce the go-live date separately.

Welcome to the future of Demo Capital.

— Management`;

const tierColors: Record<string, string> = {
  Executive: "bg-primary text-primary-foreground",
  "Regional Managers": "bg-accent text-accent-foreground",
  "Branch Managers": "bg-secondary text-secondary-foreground",
  "Loan Officers": "bg-muted text-muted-foreground",
  Clients: "bg-destructive/10 text-destructive",
};

const Credentials = () => {
  const navigate = useNavigate();
  const [copiedTable, setCopiedTable] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const copyTableToClipboard = () => {
    const lines = credentials.map(c => `${c.role}\t${c.name}\t${c.email}\t${PASSWORD}`);
    const header = "Role\tName\tEmail\tPassword";
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
    toast({ title: "Credentials table copied!" });
  };

  const copyMessageToClipboard = () => {
    navigator.clipboard.writeText(announcementMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
    toast({ title: "Announcement message copied!" });
  };

  const tiers = [...new Set(credentials.map(c => c.tier))];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 print:p-2">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Demo Growth Hub — Staff Credentials</h1>
          <p className="text-muted-foreground">Testing Phase • All accounts use password: <code className="bg-muted px-2 py-0.5 rounded font-mono text-sm">{PASSWORD}</code></p>
          <p className="text-muted-foreground text-sm">Login: <a href={LOGIN_URL} className="text-primary underline">{LOGIN_URL}</a></p>
        </div>

        {/* Credentials Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">All Login Credentials</CardTitle>
            <Button size="sm" variant="outline" onClick={copyTableToClipboard} className="print:hidden">
              {copiedTable ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedTable ? "Copied!" : "Copy Table"}
            </Button>
          </CardHeader>
          <CardContent>
            {tiers.map(tier => (
              <div key={tier} className="mb-6 last:mb-0">
                <Badge className={`mb-2 ${tierColors[tier] || ""}`}>{tier}</Badge>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credentials.filter(c => c.tier === tier).map(c => (
                      <TableRow key={c.email}>
                        <TableCell className="font-medium">{c.role}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.email}</TableCell>
                        <TableCell className="font-mono text-sm">{PASSWORD}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {tier === "Loan Officers" && (
                  <p className="text-xs text-muted-foreground mt-1 ml-1">
                    + 48 more loan officers (2 per branch). Format: lo.[branch][1/2]@Demo.test
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Draft Announcement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">📣 Draft Announcement Message</CardTitle>
            <Button size="sm" variant="outline" onClick={copyMessageToClipboard} className="print:hidden">
              {copiedMessage ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedMessage ? "Copied!" : "Copy Message"}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-4 rounded-lg border font-sans leading-relaxed">
              {announcementMessage}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Credentials;
