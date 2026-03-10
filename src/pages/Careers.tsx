import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Briefcase, MapPin, Clock, Search, Upload, Send, Building2, Users, ArrowRight } from "lucide-react";

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string;
  salary_range: string | null;
  created_at: string;
}

const Careers = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", national_id: "", email: "", phone: "", cover_letter: "" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase.from("job_postings").select("*").eq("status", "open").order("created_at", { ascending: false });
      setJobs((data as Job[]) || []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const departments = [...new Set(jobs.map(j => j.department))];
  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || j.department === deptFilter;
    const matchType = typeFilter === "all" || j.employment_type === typeFilter;
    return matchSearch && matchDept && matchType;
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyJob) return;
    setSubmitting(true);

    try {
      let resume_file_path = null;
      if (resumeFile) {
        const ext = resumeFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, resumeFile);
        if (uploadErr) throw uploadErr;
        resume_file_path = path;
      }

      const { error } = await supabase.from("job_applications").insert({
        job_id: applyJob.id,
        applicant_name: form.name.trim(),
        applicant_national_id: form.national_id.trim() || null,
        applicant_email: form.email.trim(),
        applicant_phone: form.phone.trim(),
        cover_letter: form.cover_letter.trim() || null,
        resume_file_path,
      });
      if (error) throw error;

      toast.success("Application submitted! We'll be in touch.");
      setApplyJob(null);
      setForm({ name: "", national_id: "", email: "", phone: "", cover_letter: "" });
      setResumeFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">We're Hiring</Badge>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
            Build the Future of <span className="text-primary">Financial Inclusion</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join Kechita Capital and help empower entrepreneurs across Kenya. We're looking for passionate people who believe in economic opportunity for all.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Multiple Locations</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Growing Team</div>
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> {jobs.length} Open Positions</div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-background rounded-xl shadow-lg border border-border p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search positions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Job Listings */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading positions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No positions match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-background border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold font-display text-foreground group-hover:text-primary transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.department}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.employment_type === "full-time" ? "Full-Time" : "Contract"}</span>
                    </div>
                    {job.salary_range && <p className="text-sm font-medium text-primary mt-2">{job.salary_range}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>View Details</Button>
                    <Button size="sm" onClick={() => setApplyJob(job)}>Apply Now <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-display">{selectedJob.title}</DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{selectedJob.department}</Badge>
                  <Badge variant="outline">{selectedJob.location}</Badge>
                  <Badge variant="outline">{selectedJob.employment_type === "full-time" ? "Full-Time" : "Contract"}</Badge>
                </div>
              </DialogHeader>
              {selectedJob.salary_range && <p className="text-sm font-semibold text-primary">{selectedJob.salary_range}</p>}
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">About This Role</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedJob.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Requirements</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedJob.requirements}</p>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => { setSelectedJob(null); setApplyJob(selectedJob); }}>
                Apply for This Position <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Modal */}
      <Dialog open={!!applyJob} onOpenChange={() => setApplyJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Apply — {applyJob?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Wanjiku" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">National ID Number *</label>
              <Input required value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} placeholder="e.g. 12345678" maxLength={20} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone *</label>
              <Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Resume (PDF, DOC)</label>
              <div className="mt-1">
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{resumeFile ? resumeFile.name : "Choose file..."}</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cover Letter</label>
              <Textarea rows={4} value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} placeholder="Tell us why you're a great fit..." />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : <><Send className="w-4 h-4 mr-1" /> Submit Application</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Careers;
