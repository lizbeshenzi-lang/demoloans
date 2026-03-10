import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "marketing@mularcredit.test";
  const password = "Mular2026!";
  const fullName = "Sarah Wanjiku";

  // Check if user already exists
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .single();

  if (existingProfile) {
    // Ensure role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", existingProfile.user_id)
      .eq("role", "marketing_lead")
      .single();

    if (!existingRole) {
      // Remove old role, add marketing_lead
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existingProfile.user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id: existingProfile.user_id, role: "marketing_lead" });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "User already exists, role ensured",
      email, password 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Create new user
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    return new Response(JSON.stringify({ success: false, error: createErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = newUser.user.id;

  // Update profile (created by trigger)
  await supabaseAdmin.from("profiles").update({
    full_name: fullName,
    email,
    phone: "+254700100200",
    location: "Nairobi HQ",
  }).eq("user_id", userId);

  // Replace default 'user' role with marketing_lead
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "marketing_lead" });

  return new Response(JSON.stringify({
    success: true,
    message: "Marketing lead created",
    email,
    password,
    user_id: userId,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
