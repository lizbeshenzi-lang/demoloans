import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SMSRequest {
  campaign_id?: string;
  recipients?: { phone: string; name?: string; user_id?: string; loan_id?: string }[];
  message?: string;
  provider?: 'twilio' | 'africastalking';
}

async function sendViaTwilio(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
      }
    );
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message || `Twilio error ${response.status}` };
    return { success: true, messageId: data.sid };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown Twilio error' };
  }
}

async function sendViaAfricasTalking(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('AT_API_KEY');
  const username = Deno.env.get('AT_USERNAME');
  const from = Deno.env.get('AT_SENDER_ID') || '';

  if (!apiKey || !username) {
    return { success: false, error: "Africa's Talking credentials not configured" };
  }

  try {
    const params = new URLSearchParams({ username, to, message: body });
    if (from) params.set('from', from);

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: `AT error ${response.status}: ${JSON.stringify(data)}` };
    
    const recipients = data?.SMSMessageData?.Recipients;
    if (recipients?.[0]?.statusCode === 101) {
      return { success: true, messageId: recipients[0].messageId };
    }
    return { success: false, error: recipients?.[0]?.status || 'Unknown AT error' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown AT error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const body: SMSRequest = await req.json();
    const { campaign_id, recipients, message, provider = 'twilio' } = body;

    if (!recipients?.length && !campaign_id) {
      return new Response(JSON.stringify({ error: 'recipients or campaign_id required' }), { status: 400, headers: corsHeaders });
    }

    const sendFn = provider === 'africastalking' ? sendViaAfricasTalking : sendViaTwilio;
    let toSend = recipients || [];
    let campaignMessage = message || '';

    // If campaign_id, load campaign and build recipient list
    if (campaign_id) {
      const { data: campaign } = await supabase.from('sms_campaigns').select('*').eq('id', campaign_id).single();
      if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: corsHeaders });
      campaignMessage = campaign.template;

      // Get recipients based on campaign type
      if (campaign.campaign_type === 'recovery') {
        // Overdue loan holders
        const { data: overdue } = await supabase
          .from('loan_repayments')
          .select('loan_id, loan_applications(phone, full_name, user_id)')
          .eq('status', 'overdue')
          .limit(500);
        
        const seen = new Set<string>();
        toSend = (overdue || []).filter((r: any) => {
          const phone = r.loan_applications?.phone;
          if (!phone || seen.has(phone)) return false;
          seen.add(phone);
          return true;
        }).map((r: any) => ({
          phone: r.loan_applications.phone,
          name: r.loan_applications.full_name,
          user_id: r.loan_applications.user_id,
          loan_id: r.loan_id,
        }));
      } else if (campaign.campaign_type === 'reminder') {
        // Pending repayments due soon
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const { data: upcoming } = await supabase
          .from('loan_repayments')
          .select('loan_id, loan_applications(phone, full_name, user_id)')
          .eq('status', 'pending')
          .lte('due_date', nextWeek.toISOString().split('T')[0])
          .limit(500);

        const seen = new Set<string>();
        toSend = (upcoming || []).filter((r: any) => {
          const phone = r.loan_applications?.phone;
          if (!phone || seen.has(phone)) return false;
          seen.add(phone);
          return true;
        }).map((r: any) => ({
          phone: r.loan_applications.phone,
          name: r.loan_applications.full_name,
          user_id: r.loan_applications.user_id,
          loan_id: r.loan_id,
        }));
      } else {
        // Marketing - all active clients
        let query = supabase.from('loan_applications').select('phone, full_name, user_id, id').in('status', ['approved', 'disbursed']);
        if (campaign.branch_id) query = query.eq('branch_id', campaign.branch_id);
        const { data: clients } = await query.limit(500);
        
        const seen = new Set<string>();
        toSend = (clients || []).filter((c: any) => {
          if (!c.phone || seen.has(c.phone)) return false;
          seen.add(c.phone);
          return true;
        }).map((c: any) => ({
          phone: c.phone,
          name: c.full_name,
          user_id: c.user_id,
          loan_id: c.id,
        }));
      }
    }

    let sent = 0, delivered = 0, failed = 0;
    const results: any[] = [];

    for (const recipient of toSend) {
      // Personalize message
      let personalizedMsg = (campaignMessage || message || '')
        .replace(/\{name\}/g, recipient.name || 'Valued Customer')
        .replace(/\{phone\}/g, recipient.phone);

      const result = await sendFn(recipient.phone, personalizedMsg);

      // Record message
      await supabase.from('sms_messages').insert({
        campaign_id: campaign_id || null,
        recipient_phone: recipient.phone,
        recipient_name: recipient.name,
        recipient_user_id: recipient.user_id,
        loan_id: recipient.loan_id,
        message_body: personalizedMsg,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.messageId,
        error_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      });

      if (result.success) { sent++; delivered++; } else { failed++; }
      results.push({ phone: recipient.phone, ...result });
    }

    // Update campaign stats
    if (campaign_id) {
      await supabase.from('sms_campaigns').update({
        total_sent: sent + failed,
        total_delivered: delivered,
        total_failed: failed,
        status: 'sent',
      }).eq('id', campaign_id);
    }

    return new Response(JSON.stringify({ success: true, sent, delivered, failed, total: toSend.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-sms error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
