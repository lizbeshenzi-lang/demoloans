import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── SMS Provider Helpers ──────────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Try Twilio first, fallback to Africa's Talking
  const twilioResult = await sendViaTwilio(to, body);
  if (twilioResult.success) return twilioResult;

  const atResult = await sendViaAT(to, body);
  if (atResult.success) return atResult;

  return { success: false, error: `Twilio: ${twilioResult.error}; AT: ${atResult.error}` };
}

async function sendViaTwilio(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from) return { success: false, error: 'Twilio not configured' };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    const data = await res.json();
    return res.ok ? { success: true, messageId: data.sid } : { success: false, error: data.message || `Twilio ${res.status}` };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Twilio error' }; }
}

async function sendViaAT(to: string, body: string) {
  const apiKey = Deno.env.get('AT_API_KEY');
  const username = Deno.env.get('AT_USERNAME');
  if (!apiKey || !username) return { success: false, error: 'AT not configured' };

  try {
    const params = new URLSearchParams({ username, to, message: body });
    const senderId = Deno.env.get('AT_SENDER_ID');
    if (senderId) params.set('from', senderId);

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { 'apiKey': apiKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params,
    });
    const data = await res.json();
    const r = data?.SMSMessageData?.Recipients?.[0];
    return r?.statusCode === 101 ? { success: true, messageId: r.messageId } : { success: false, error: r?.status || `AT ${res.status}` };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'AT error' }; }
}

// ── Message Templates ─────────────────────────────────────────────

const TEMPLATES = {
  approval_welcome: (name: string, amount: string) =>
    `Congratulations ${name}! Your Demo Capital financing of KES ${amount} has been approved. Your Loan Officer will contact you shortly with disbursement details. Thank you for choosing Demo Capital!`,

  reminder_2days: (name: string, amount: string, dueDate: string) =>
    `Dear ${name}, your Demo Capital repayment of KES ${amount} is due on ${dueDate}. Please ensure timely payment to maintain your good standing. Thank you!`,

  reminder_due_today: (name: string, amount: string) =>
    `Hi ${name}, your Demo Capital repayment of KES ${amount} is due TODAY. Please make your payment to avoid any penalties. Thank you!`,

  overdue_mild: (name: string, amount: string, days: number) =>
    `Dear ${name}, your repayment of KES ${amount} is ${days} day(s) overdue. Please settle your payment as soon as possible. Contact your Loan Officer if you need assistance.`,

  overdue_warning: (name: string, amount: string, days: number) =>
    `NOTICE: ${name}, your Demo Capital repayment of KES ${amount} is now ${days} days overdue. Failure to pay may result in penalties. Please contact us immediately.`,

  overdue_escalation: (name: string, amount: string, days: number) =>
    `URGENT: ${name}, your account with Demo Capital is ${days} days in arrears (KES ${amount}). This matter has been escalated to management. Please settle immediately to avoid further action.`,

  overdue_final: (name: string, amount: string, days: number) =>
    `FINAL NOTICE: ${name}, your Demo Capital account is ${days} days overdue (KES ${amount}). Recovery proceedings will commence if payment is not received within 48 hours. Call us now.`,
};

// ── Record SMS in database ────────────────────────────────────────

async function recordSMS(supabase: any, params: {
  phone: string; name?: string; userId?: string; loanId?: string;
  body: string; status: string; messageId?: string; error?: string; campaignType: string;
}) {
  await supabase.from('sms_messages').insert({
    recipient_phone: params.phone,
    recipient_name: params.name,
    recipient_user_id: params.userId,
    loan_id: params.loanId,
    message_body: params.body,
    status: params.status,
    provider_message_id: params.messageId,
    error_message: params.error,
    sent_at: params.status === 'sent' ? new Date().toISOString() : null,
  });
}

// ── Trigger Handlers ──────────────────────────────────────────────

async function handleApprovalWelcome(supabase: any, loanId: string) {
  const { data: loan } = await supabase
    .from('loan_applications')
    .select('id, full_name, phone, financing_amount, amount_approved, user_id')
    .eq('id', loanId)
    .single();

  if (!loan?.phone) return { sent: 0, error: 'No loan or phone found' };

  const amount = loan.amount_approved || loan.financing_amount || '0';
  const msg = TEMPLATES.approval_welcome(loan.full_name, String(amount));
  const result = await sendSMS(loan.phone, msg);

  await recordSMS(supabase, {
    phone: loan.phone, name: loan.full_name, userId: loan.user_id,
    loanId: loan.id, body: msg, status: result.success ? 'sent' : 'failed',
    messageId: result.messageId, error: result.error, campaignType: 'approval',
  });

  return { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1 };
}

async function handlePaymentReminders(supabase: any) {
  const today = new Date();
  const in2Days = new Date(today);
  in2Days.setDate(in2Days.getDate() + 2);
  const todayStr = today.toISOString().split('T')[0];
  const in2DaysStr = in2Days.toISOString().split('T')[0];

  // Get pending repayments due today or in 2 days
  const { data: repayments } = await supabase
    .from('loan_repayments')
    .select('id, loan_id, amount_due, due_date, week_number, loan_applications(full_name, phone, user_id)')
    .eq('status', 'pending')
    .in('due_date', [todayStr, in2DaysStr])
    .limit(500);

  let sent = 0, failed = 0;
  const seen = new Set<string>();

  for (const rep of (repayments || [])) {
    const loan = rep.loan_applications;
    if (!loan?.phone) continue;

    const key = `${loan.phone}-${rep.due_date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isToday = rep.due_date === todayStr;
    const msg = isToday
      ? TEMPLATES.reminder_due_today(loan.full_name, String(rep.amount_due))
      : TEMPLATES.reminder_2days(loan.full_name, String(rep.amount_due), rep.due_date);

    const result = await sendSMS(loan.phone, msg);

    await recordSMS(supabase, {
      phone: loan.phone, name: loan.full_name, userId: loan.user_id,
      loanId: rep.loan_id, body: msg, status: result.success ? 'sent' : 'failed',
      messageId: result.messageId, error: result.error, campaignType: 'reminder',
    });

    if (result.success) sent++; else failed++;
  }

  return { sent, failed, total: (repayments || []).length };
}

async function handleRecoveryEscalation(supabase: any) {
  const today = new Date();

  const { data: overdue } = await supabase
    .from('loan_repayments')
    .select('id, loan_id, amount_due, due_date, week_number, loan_applications(full_name, phone, user_id)')
    .eq('status', 'overdue')
    .limit(500);

  let sent = 0, failed = 0;
  const seen = new Set<string>();

  for (const rep of (overdue || [])) {
    const loan = rep.loan_applications;
    if (!loan?.phone) continue;

    const key = loan.phone;
    if (seen.has(key)) continue;
    seen.add(key);

    const dueDate = new Date(rep.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let msg: string;
    if (daysOverdue <= 3) {
      msg = TEMPLATES.overdue_mild(loan.full_name, String(rep.amount_due), daysOverdue);
    } else if (daysOverdue <= 7) {
      msg = TEMPLATES.overdue_warning(loan.full_name, String(rep.amount_due), daysOverdue);
    } else if (daysOverdue <= 14) {
      msg = TEMPLATES.overdue_escalation(loan.full_name, String(rep.amount_due), daysOverdue);
    } else {
      msg = TEMPLATES.overdue_final(loan.full_name, String(rep.amount_due), daysOverdue);
    }

    const result = await sendSMS(loan.phone, msg);

    await recordSMS(supabase, {
      phone: loan.phone, name: loan.full_name, userId: loan.user_id,
      loanId: rep.loan_id, body: msg, status: result.success ? 'sent' : 'failed',
      messageId: result.messageId, error: result.error, campaignType: 'recovery',
    });

    if (result.success) sent++; else failed++;
  }

  return { sent, failed, total: (overdue || []).length };
}

// ── Main Handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { trigger_type, loan_id } = body as { trigger_type?: string; loan_id?: string };

    let result: any;

    switch (trigger_type) {
      case 'approval_welcome':
        if (!loan_id) return new Response(JSON.stringify({ error: 'loan_id required' }), { status: 400, headers: corsHeaders });
        result = await handleApprovalWelcome(supabase, loan_id);
        break;

      case 'payment_reminders':
        result = await handlePaymentReminders(supabase);
        break;

      case 'recovery_escalation':
        result = await handleRecoveryEscalation(supabase);
        break;

      case 'daily_all':
        const reminders = await handlePaymentReminders(supabase);
        const recovery = await handleRecoveryEscalation(supabase);
        result = {
          reminders,
          recovery,
          total_sent: reminders.sent + recovery.sent,
          total_failed: reminders.failed + recovery.failed,
        };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid trigger_type. Use: approval_welcome, payment_reminders, recovery_escalation, daily_all' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`SMS trigger [${trigger_type}] result:`, JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, trigger_type, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sms-triggers error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
