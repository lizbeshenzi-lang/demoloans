import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit2, Eye, Trash2, Calendar, Video, Phone, User2, Loader2, ExternalLink, Copy } from "lucide-react";
import { format } from "date-fns";

interface JobPosting {
  id: string; title: string; department: string; location: string; employment_type: string;
  description: string; requirements: string; salary_range: string | null; status: string; created_at: string;
}

interface JobApplication {
  id: string; job_id: string; applicant_name: string; applicant_email: string; applicant_phone: string;
  resume_file_path: string | null; cover_letter: string | null; status: string; notes: string | null;
  reviewed_by: string | null; created_at: string; updated_at: string;
  job_postings?: { title: string };
}

interface Interview {
  id: string; application_id: string; interviewer_user_id: string | null; scheduled_at: string;
  duration_minutes: number; interview_type: string; meeting_link: string | null; status: string;
  notes: string | null; created_at: string;
  job_applications?: { applicant_name: string; applicant_email: string; job_postings?: { title: string } };
}

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  screening: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  interview: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  hired: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const AdminRecruitment = () => {
  const [activeTab, setActiveTab] = useState("postings");
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobDialog, setJobDialog] = useState(false);
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [appDetail, setAppDetail] = useState<JobApplication | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<JobApplication | null>(null);
  const [schedForm, setSchedForm] = useState({ scheduled_at: "", duration_minutes: "30", interview_type: "video" });
  const [jobForm, setJobForm] = useState({ title: "", department: "", location: "Nairobi, Kenya", employment_type: "full-time", description: "", requirements: "", salary_range: "", status: "open" });
  const [saving, setSaving] = useState(false);
  const [appFilter, setAppFilter] = useState("all");

  const fetchAll = async () => {
    const [j, a, i] = await Promise.all([
      supabase.from("job_postings").select("*").order("created_at", { ascending: false }),
      supabase.from("job_applications").select("*, job_postings(title)").order("created_at", { ascending: false }),
      supabase.from("interview_schedules").select("*, job_applications(applicant_name, applicant_email, job_postings(title))").order("scheduled_at", { ascending: false }),
    ]);
    setJobs((j.data as JobPosting[]) || []);
    setApplications((a.data as JobApplication[]) || []);
    setInterviews((i.data as Interview[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveJob = async () => {
    setSaving(true);
    try {
      if (editJob) {
        const { error } = await supabase.from("job_postings").update(jobForm).eq("id", editJob.id);
        if (error) throw error;
        toast.success("Job updated");
      } else {
        const { error } = await supabase.from("job_postings").insert(jobForm);
        if (error) throw error;
        toast.success("Job created");
      }
      setJobDialog(false);
      setEditJob(null);
      setJobForm({ title: "", department: "", location: "Nairobi, Kenya", employment_type: "full-time", description: "", requirements: "", salary_range: "", status: "open" });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Delete this job posting?")) return;
    await supabase.from("job_postings").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from("job_applications").update({ status: newStatus }).eq("id", appId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${newStatus}`);
    fetchAll();
  };

  const handleScheduleInterview = async () => {
    if (!scheduleDialog || !schedForm.scheduled_at) return;
    setSaving(true);
    const meetingLink = `${window.location.origin}/interview/${crypto.randomUUID()}`;
    try {
      const { error } = await supabase.from("interview_schedules").insert({
        application_id: scheduleDialog.id,
        scheduled_at: schedForm.scheduled_at,
        duration_minutes: parseInt(schedForm.duration_minutes),
        interview_type: schedForm.interview_type,
        meeting_link: schedForm.interview_type === "video" ? meetingLink : null,
      });
      if (error) throw error;
      await supabase.from("job_applications").update({ status: "interview" }).eq("id", scheduleDialog.id);
      toast.success("Interview scheduled!");
      setScheduleDialog(null);
      setSchedForm({ scheduled_at: "", duration_minutes: "30", interview_type: "video" });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const filteredApps = appFilter === "all" ? applications : applications.filter(a => a.status === appFilter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="postings">Job Postings ({jobs.length})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
        </TabsList>

        {/* JOB POSTINGS */}
        <TabsContent value="postings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditJob(null); setJobForm({ title: "", department: "", location: "Nairobi, Kenya", employment_type: "full-time", description: "", requirements: "", salary_range: "", status: "open" }); setJobDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New Position
            </Button>
          </div>
          <div className="grid gap-3">
            {jobs.map(j => (
              <div key={j.id} className="bg-background border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.department} · {j.location} · {j.employment_type}</p>
                </div>
                <Badge variant={j.status === "open" ? "default" : "secondary"}>{j.status}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditJob(j); setJobForm({ title: j.title, department: j.department, location: j.location, employment_type: j.employment_type, description: j.description, requirements: j.requirements, salary_range: j.salary_range || "", status: j.status }); setJobDialog(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteJob(j.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* APPLICATIONS */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["all", "applied", "screening", "interview", "offer", "hired", "rejected"].map(s => (
              <Button key={s} variant={appFilter === s ? "default" : "outline"} size="sm" onClick={() => setAppFilter(s)}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== "all" && <span className="ml-1 text-xs opacity-70">({applications.filter(a => a.status === s).length})</span>}
              </Button>
            ))}
          </div>
          <div className="grid gap-3">
            {filteredApps.map(app => (
              <div key={app.id} className="bg-background border border-border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{app.applicant_name}</p>
                    <p className="text-xs text-muted-foreground">{app.applicant_email} · {app.applicant_phone}</p>
                    <p className="text-xs text-primary mt-0.5">{app.job_postings?.title || "Unknown position"}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[app.status] || ""}`}>{app.status}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => setAppDetail(app)}><Eye className="w-3 h-3 mr-1" /> View</Button>
                  <Select value={app.status} onValueChange={v => handleStatusChange(app.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["applied", "screening", "interview", "offer", "hired", "rejected"].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setScheduleDialog(app)}>
                    <Calendar className="w-3 h-3 mr-1" /> Schedule Interview
                  </Button>
                </div>
              </div>
            ))}
            {filteredApps.length === 0 && <p className="text-center text-muted-foreground py-8">No applications found.</p>}
          </div>
        </TabsContent>

        {/* INTERVIEWS */}
        <TabsContent value="interviews" className="space-y-4">
          <div className="grid gap-3">
            {interviews.map(iv => (
              <div key={iv.id} className="bg-background border border-border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{iv.job_applications?.applicant_name}</p>
                    <p className="text-xs text-muted-foreground">{iv.job_applications?.job_postings?.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(iv.scheduled_at), "PPp")} · {iv.duration_minutes}min ·
                      {iv.interview_type === "video" ? <Video className="w-3 h-3 inline ml-1" /> : iv.interview_type === "phone" ? <Phone className="w-3 h-3 inline ml-1" /> : <User2 className="w-3 h-3 inline ml-1" />}
                      {" "}{iv.interview_type}
                    </p>
                  </div>
                  <Badge variant={iv.status === "scheduled" ? "default" : iv.status === "completed" ? "secondary" : "destructive"}>{iv.status}</Badge>
                </div>
                {iv.meeting_link && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(iv.meeting_link!, "_blank")}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Join Video Call
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(iv.meeting_link!); toast.success("Link copied!"); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copy Link
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {interviews.length === 0 && <p className="text-center text-muted-foreground py-8">No interviews scheduled yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Job Create/Edit Dialog */}
      <Dialog open={jobDialog} onOpenChange={setJobDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editJob ? "Edit Position" : "New Position"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Title *</label><Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Department *</label><Input value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Location *</label><Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Type</label>
                <Select value={jobForm.employment_type} onValueChange={v => setJobForm(f => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="full-time">Full-Time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Status</label>
                <Select value={jobForm.status} onValueChange={v => setJobForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium">Salary Range</label><Input value={jobForm.salary_range} onChange={e => setJobForm(f => ({ ...f, salary_range: e.target.value }))} placeholder="KES 80,000 - 120,000/month" /></div>
            <div><label className="text-sm font-medium">Description *</label><Textarea rows={4} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Requirements *</label><Textarea rows={4} value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSaveJob} disabled={saving || !jobForm.title || !jobForm.department || !jobForm.description || !jobForm.requirements}>
              {saving ? "Saving..." : editJob ? "Update Position" : "Create Position"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Detail Dialog */}
      <Dialog open={!!appDetail} onOpenChange={() => setAppDetail(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {appDetail && (
            <>
              <DialogHeader><DialogTitle>Application — {appDetail.applicant_name}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div><strong>Position:</strong> {appDetail.job_postings?.title}</div>
                <div><strong>Email:</strong> {appDetail.applicant_email}</div>
                <div><strong>Phone:</strong> {appDetail.applicant_phone}</div>
                <div><strong>Status:</strong> <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[appDetail.status]}`}>{appDetail.status}</span></div>
                <div><strong>Applied:</strong> {format(new Date(appDetail.created_at), "PPp")}</div>
                {appDetail.cover_letter && <div><strong>Cover Letter:</strong><p className="mt-1 text-muted-foreground whitespace-pre-line">{appDetail.cover_letter}</p></div>}
                {appDetail.resume_file_path && (
                  <div>
                    <strong>Resume:</strong>
                    <Button variant="outline" size="sm" className="ml-2" onClick={async () => {
                      const { data } = await supabase.storage.from("resumes").createSignedUrl(appDetail.resume_file_path!, 3600);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      else toast.error("Could not generate download link");
                    }}>Download Resume</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={!!scheduleDialog} onOpenChange={() => setScheduleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Interview — {scheduleDialog?.applicant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Date & Time *</label><Input type="datetime-local" value={schedForm.scheduled_at} onChange={e => setSchedForm(f => ({ ...f, scheduled_at: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Duration (min)</label><Input type="number" value={schedForm.duration_minutes} onChange={e => setSchedForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Type</label>
                <Select value={schedForm.interview_type} onValueChange={v => setSchedForm(f => ({ ...f, interview_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="video">Video Call</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="in-person">In-Person</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleScheduleInterview} disabled={saving || !schedForm.scheduled_at}>
              {saving ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecruitment;
