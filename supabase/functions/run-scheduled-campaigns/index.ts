import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getNextRunAt(recurrence: string, fromDate: Date): string | null {
  const next = new Date(fromDate);
  switch (recurrence) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    default: return null;
  }
  return next.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Find campaigns that are due to run
    const { data: dueCampaigns, error } = await supabase
      .from('sms_campaigns')
      .select('*')
      .not('recurrence', 'is', null)
      .neq('recurrence', 'none')
      .lte('next_run_at', now)
      .not('next_run_at', 'is', null)
      .limit(20);

    if (error) throw error;
    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No campaigns due', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const campaign of dueCampaigns) {
      try {
        // Invoke the existing send-sms function via HTTP
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });
        const sendResult = await sendRes.json();

        // Calculate next run
        const nextRun = getNextRunAt(campaign.recurrence, new Date());

        // Update campaign with next_run_at and last_run_at
        await supabase.from('sms_campaigns').update({
          last_run_at: now,
          next_run_at: nextRun,
          status: 'sent',
        }).eq('id', campaign.id);

        results.push({ campaign_id: campaign.id, name: campaign.name, ...sendResult, next_run_at: nextRun });
      } catch (e) {
        console.error(`Failed to process campaign ${campaign.id}:`, e);
        results.push({ campaign_id: campaign.id, name: campaign.name, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    console.log('Scheduled campaigns processed:', JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('run-scheduled-campaigns error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
