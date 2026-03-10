import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  UserPlus, Camera, Upload, Loader2, CheckCircle, User,
  Briefcase, Home, Tv, Users, Image, X, ChevronRight, ChevronLeft, CreditCard
} from "lucide-react";

interface PhotoSlot {
  type: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  required: boolean;
}

const PHOTO_SLOTS: PhotoSlot[] = [
  { type: "id_front", label: "National ID (Front)", desc: "Clear photo of the front of the client's National ID", icon: CreditCard, required: true },
  { type: "id_back", label: "National ID (Back)", desc: "Clear photo of the back of the client's National ID", icon: CreditCard, required: true },
  { type: "client_portrait", label: "Client Photo", desc: "Clear front-facing portrait of the client", icon: User, required: true },
  { type: "client_with_lo", label: "Client with Loan Officer", desc: "Photo of client together with their Loan Officer", icon: Users, required: true },
  { type: "business_premises", label: "Business Premises", desc: "Photo of the client's business location/shop", icon: Briefcase, required: true },
  { type: "residence", label: "Residence", desc: "Photo of the client's home/residence", icon: Home, required: true },
  { type: "collateral_1", label: "Collateral Item 1", desc: "TV, electronics, furniture, or other valuables", icon: Tv, required: true },
  { type: "collateral_2", label: "Collateral Item 2", desc: "Additional collateral photo (optional)", icon: Tv, required: false },
  { type: "collateral_3", label: "Collateral Item 3", desc: "Additional collateral photo (optional)", icon: Tv, required: false },
];

interface ClientForm {
  full_name: string;
  national_id: string;
  phone: string;
  email: string;
  business_type: string;
  business_description: string;
  location: string;
  financing_amount: string;
}

const ClientOnboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newLoanId, setNewLoanId] = useState<string | null>(null);

  const [form, setForm] = useState<ClientForm>({
    full_name: "", national_id: "", phone: "", email: "", business_type: "",
    business_description: "", location: "", financing_amount: "",
  });

  const [photos, setPhotos] = useState<Record<string, { file: File; preview: string } | null>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const load = async () => {
      const [bRes, pRes] = await Promise.all([
        supabase.from("branches").select("*, regions(name)"),
        supabase.from("loan_products").select("*").eq("is_active", true),
      ]);
      setBranches(bRes.data || []);
      setProducts(pRes.data || []);
    };
    load();
  }, []);

  const handlePhotoSelect = async (type: string, file: File) => {
    const isIdPhoto = type === "id_front" || type === "id_back";
    if (isIdPhoto && file.size > 5 * 1024 * 1024) { toast.error("ID photo must be under 5MB"); return; }

    let processed = file;
    if (file.size > 500 * 1024) {
      try {
        processed = await imageCompression(file, {
          maxSizeMB: isIdPhoto ? 1 : 0.8,
          maxWidthOrHeight: isIdPhoto ? 2048 : 1600,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
      } catch {
        // fall back to original if compression fails
      }
    }

    const preview = URL.createObjectURL(processed);
    setPhotos(prev => ({ ...prev, [type]: { file: processed, preview } }));
  };

  const removePhoto = (type: string) => {
    if (photos[type]?.preview) URL.revokeObjectURL(photos[type]!.preview);
    setPhotos(prev => ({ ...prev, [type]: null }));
  };

  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone || !form.national_id || !form.business_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    const requiredPhotos = PHOTO_SLOTS.filter(s => s.required);
    const missingPhotos = requiredPhotos.filter(s => !photos[s.type]);
    if (missingPhotos.length > 0) {
      toast.error(`Missing required photos: ${missingPhotos.map(p => p.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create loan application
      const { data: loan, error: loanError } = await supabase.from("loan_applications").insert({
        full_name: form.full_name,
        national_id: form.national_id,
        phone: form.phone,
        email: form.email || null,
        business_type: form.business_type,
        business_description: form.business_description || null,
        location: form.location || null,
        financing_amount: form.financing_amount || null,
        branch_id: selectedBranch || null,
        product_id: selectedProduct || null,
        loan_officer_id: user!.id,
        status: "pending",
      }).select("id").single();

      if (loanError) throw loanError;
      setNewLoanId(loan.id);

      // 2. Upload photos
      setUploadingPhotos(true);
      for (const [type, photoData] of Object.entries(photos)) {
        if (!photoData) continue;
        const ext = photoData.file.name.split(".").pop() || "jpg";
        const path = `${loan.id}/${type}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("client-photos")
          .upload(path, photoData.file, { contentType: photoData.file.type });

        if (uploadError) {
          console.error(`Upload failed for ${type}:`, uploadError);
          continue;
        }

        await supabase.from("client_photos").insert({
          client_user_id: user!.id, // Will be updated when client account is linked
          loan_id: loan.id,
          uploaded_by: user!.id,
          photo_type: type,
          file_path: path,
          file_name: photoData.file.name,
          file_size: photoData.file.size,
        });
      }
      setUploadingPhotos(false);

      setSuccess(true);
      toast.success("Client onboarded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard client");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="bg-background rounded-xl border border-border p-8 text-center max-w-md mx-auto">
        <CheckCircle className="w-16 h-16 text-kc-green mx-auto mb-4" />
        <h2 className="text-xl font-bold font-display text-foreground mb-2">Client Onboarded!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The application has been created and all photos uploaded successfully.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => { setSuccess(false); setStep(1); setForm({ full_name: "", national_id: "", phone: "", email: "", business_type: "", business_description: "", location: "", financing_amount: "" }); setPhotos({}); setNewLoanId(null); }}>
            <UserPlus className="w-4 h-4 mr-1" /> Onboard Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" /> Client Onboarding
        </h2>
        <p className="text-sm text-muted-foreground">Register a new client with photos and documentation</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(s)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-kc-green text-white" : "bg-muted text-muted-foreground"
            }`}>{step > s ? "✓" : s}</button>
            <span className="text-xs font-medium text-foreground hidden sm:inline">
              {s === 1 ? "Client Details" : s === 2 ? "Business & Product" : "Photos & Verification"}
            </span>
            {s < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client Details */}
      {step === 1 && (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold font-display text-foreground">Client Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Client's full name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">National ID Number *</label>
              <Input value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} placeholder="e.g. 12345678" maxLength={20} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone Number *</label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+254..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" type="email" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Westlands, Nairobi" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { if (!form.full_name || !form.phone || !form.national_id) { toast.error("Name, ID number, and phone required"); return; } setStep(2); }}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Business & Product */}
      {step === 2 && (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold font-display text-foreground">Business & Financing</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Business Type *</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}>
                <option value="">Select type</option>
                {["Retail Shop", "Food & Beverage", "Salon & Beauty", "Agriculture", "Transport", "Manufacturing", "Services", "Other"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Financing Amount</label>
              <Input value={form.financing_amount} onChange={e => setForm({ ...form, financing_amount: e.target.value })} placeholder="e.g. 25000" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1 block">Business Description</label>
              <Textarea value={form.business_description} onChange={e => setForm({ ...form, business_description: e.target.value })} rows={2} placeholder="Brief description of the client's business..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Branch</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="">Select branch</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name} ({(b as any).regions?.name})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Product</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                <option value="">Select product</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} - {p.interest_rate}% ({p.term_weeks}wks)</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => { if (!form.business_type) { toast.error("Business type required"); return; } setStep(3); }}>
              Next: Photos <Camera className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 3 && (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold font-display text-foreground">Photo Verification</h3>
          <p className="text-xs text-muted-foreground">Upload clear photos for each category. Required items marked with *</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PHOTO_SLOTS.map(slot => {
              const photo = photos[slot.type];
              return (
                <div key={slot.type} className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-colors ${
                  photo ? "border-kc-green bg-green-50/50" : slot.required ? "border-primary/30 hover:border-primary" : "border-border hover:border-primary/30"
                }`}>
                  {photo ? (
                    <div className="relative">
                      <img src={photo.preview} alt={slot.label} className="w-full h-24 object-cover rounded-lg" />
                      <button onClick={() => removePhoto(slot.type)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-[10px] text-kc-green font-medium mt-1">✓ {slot.label}</p>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRefs.current[slot.type]?.click()} className="w-full">
                      <slot.icon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
                      <p className="text-xs font-medium text-foreground">{slot.label}{slot.required ? " *" : ""}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{slot.desc}</p>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        <span onClick={(e) => { e.stopPropagation(); cameraInputRefs.current[slot.type]?.click(); }} className="flex items-center gap-1 text-primary cursor-pointer">
                          <Camera className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Take</span>
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="flex items-center gap-1 text-primary cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Upload</span>
                        </span>
                      </div>
                    </button>
                  )}
                  <input
                    ref={el => { fileInputRefs.current[slot.type] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(slot.type, f); e.target.value = ''; }}
                  />
                  <input
                    ref={el => { cameraInputRefs.current[slot.type] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(slot.type, f); e.target.value = ''; }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>{uploadingPhotos ? "Uploading Photos..." : "Creating Application..."} <Loader2 className="w-4 h-4 animate-spin ml-1" /></>
              ) : (
                <>Submit & Onboard <CheckCircle className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOnboarding;
