import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  priority: 'low' | 'medium' | 'high';
  action_type: 'notification' | 'sms' | 'email';
  template: string;
  target_roles: string[];
}

interface ClientPattern {
  user_id: string;
  full_name: string;
  segment: 'loyal' | 'growing' | 'seasonal' | 'problematic' | 'premium' | 'new';
  total_loans: number;
  avg_repayment_rate: number;
  days_since_last_loan: number;
  lifetime_value: number;
  overdue_payments: number;
  current_loan_id?: string;
  next_due_date?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    const { trigger_type = 'scheduled', loan_id, user_id } = body;

    console.log('Processing alerts with trigger:', trigger_type);

    // Analyze client patterns and generate alerts
    const clientPatterns = await analyzeClientPatterns(supabaseClient);
    const alertsGenerated = await generatePatternBasedAlerts(supabaseClient, clientPatterns, trigger_type);

    return new Response(JSON.stringify({
      success: true,
      alerts_generated: alertsGenerated,
      patterns_analyzed: clientPatterns.length,
      trigger_type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Alert processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeClientPatterns(supabase: any): Promise<ClientPattern[]> {
  // Get all loans with repayment data
  const { data: loans } = await supabase
    .from('loan_applications')
    .select(`
      *,
      loan_repayments(*)
    `)
    .not('user_id', 'is', null);

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name');

  if (!loans || !profiles) return [];

  const profileMap = profiles.reduce((acc: Record<string, string>, p: any) => {
    acc[p.user_id] = p.full_name || 'Unknown';
    return acc;
  }, {});

  // Group by client and analyze patterns
  const clientGroups = loans.reduce((acc: any, loan: any) => {
    const userId = loan.user_id;
    if (!userId) return acc;
    
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        full_name: profileMap[userId] || 'Unknown',
        loans: [],
        repayments: []
      };
    }
    
    acc[userId].loans.push(loan);
    acc[userId].repayments.push(...(loan.loan_repayments || []));
    return acc;
  }, {});

  return Object.values(clientGroups).map((client: any) => {
    const totalLoans = client.loans.length;
    const totalRepayments = client.repayments.length;
    const paidRepayments = client.repayments.filter((r: any) => r.status === 'paid').length;
    const avgRepaymentRate = totalRepayments > 0 ? (paidRepayments / totalRepayments) * 100 : 0;
    
    // Calculate overdue payments
    const now = new Date();
    const overduePayments = client.repayments.filter((r: any) => {
      const dueDate = new Date(r.due_date);
      return r.status === 'pending' && dueDate < now;
    }).length;

    // Find most recent loan and next due date
    const activeLoan = client.loans.find((l: any) => l.status === 'disbursed');
    const nextDueRepayment = client.repayments
      .filter((r: any) => r.status === 'pending')
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    // Calculate days since last loan
    const lastLoanDate = new Date(Math.max(...client.loans.map((l: any) => new Date(l.created_at).getTime())));
    const daysSinceLastLoan = Math.floor((Date.now() - lastLoanDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate lifetime value
    const lifetimeValue = client.loans.reduce((sum: number, loan: any) => 
      sum + (parseFloat(loan.financing_amount) || 0), 0);

    // Determine segment
    let segment: ClientPattern['segment'] = 'new';
    if (totalLoans >= 3 && avgRepaymentRate >= 90 && daysSinceLastLoan <= 180) {
      segment = 'loyal';
    } else if (totalLoans >= 2 && avgRepaymentRate >= 85 && daysSinceLastLoan <= 365) {
      segment = 'growing';
    } else if (lifetimeValue >= 100000 && avgRepaymentRate >= 80) {
      segment = 'premium';
    } else if (avgRepaymentRate < 70 || overduePayments > 2) {
      segment = 'problematic';
    } else if (totalLoans >= 2 && daysSinceLastLoan > 180 && daysSinceLastLoan <= 365) {
      segment = 'seasonal';
    }

    return {
      user_id: client.user_id,
      full_name: client.full_name,
      segment,
      total_loans: totalLoans,
      avg_repayment_rate: avgRepaymentRate,
      days_since_last_loan: daysSinceLastLoan,
      lifetime_value: lifetimeValue,
      overdue_payments: overduePayments,
      current_loan_id: activeLoan?.id,
      next_due_date: nextDueRepayment?.due_date
    };
  });
}

async function generatePatternBasedAlerts(
  supabase: any, 
  patterns: ClientPattern[], 
  triggerType: string
): Promise<number> {
  let alertsGenerated = 0;

  for (const pattern of patterns) {
    const alerts = await generateAlertsForPattern(supabase, pattern, triggerType);
    alertsGenerated += alerts.length;
  }

  return alertsGenerated;
}

async function generateAlertsForPattern(
  supabase: any, 
  pattern: ClientPattern, 
  triggerType: string
): Promise<any[]> {
  const alerts = [];
  const now = new Date();

  try {
    switch (pattern.segment) {
      case 'loyal':
        // Renewal reminders for loyal customers
        if (pattern.days_since_last_loan >= 30 && pattern.days_since_last_loan <= 45) {
          alerts.push({
            type: 'renewal_reminder',
            priority: 'medium',
            title: 'Renewal Opportunity - Loyal Customer',
            message: `${pattern.full_name} (loyal customer) may be ready for loan renewal. Last loan: ${pattern.days_since_last_loan} days ago.`,
            target_roles: ['loan_officer', 'branch_manager'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'proactive_outreach',
              lifetime_value: pattern.lifetime_value,
              repayment_rate: pattern.avg_repayment_rate
            }
          });
        }
        break;

      case 'growing':
        // Upselling opportunities for growing customers
        if (pattern.days_since_last_loan >= 14 && pattern.days_since_last_loan <= 30) {
          alerts.push({
            type: 'upsell_opportunity',
            priority: 'high',
            title: 'Loan Graduation Opportunity',
            message: `${pattern.full_name} shows growth potential. Consider offering larger loan amount.`,
            target_roles: ['loan_officer', 'branch_manager'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'offer_larger_loan',
              current_performance: pattern.avg_repayment_rate,
              loan_history: pattern.total_loans
            }
          });
        }
        break;

      case 'premium':
        // Premium customer retention
        if (pattern.days_since_last_loan >= 60) {
          alerts.push({
            type: 'retention_risk',
            priority: 'high',
            title: 'Premium Customer At Risk',
            message: `High-value customer ${pattern.full_name} (${pattern.lifetime_value.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}) hasn't borrowed in ${pattern.days_since_last_loan} days.`,
            target_roles: ['branch_manager', 'regional_manager'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'immediate_contact',
              lifetime_value: pattern.lifetime_value,
              risk_level: 'high'
            }
          });
        }
        break;

      case 'seasonal':
        // Seasonal pattern alerts
        const currentMonth = now.getMonth() + 1;
        if ([3, 6, 9, 12].includes(currentMonth) && pattern.days_since_last_loan >= 60) {
          alerts.push({
            type: 'seasonal_reminder',
            priority: 'medium',
            title: 'Seasonal Customer - Reactivation Time',
            message: `${pattern.full_name} follows seasonal borrowing pattern. Good time for outreach.`,
            target_roles: ['loan_officer', 'marketing_lead'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'seasonal_outreach',
              historical_pattern: 'quarterly_borrower'
            }
          });
        }
        break;

      case 'problematic':
        // Collection and risk management alerts
        if (pattern.overdue_payments > 0) {
          const priority = pattern.overdue_payments >= 3 ? 'high' : 
                          pattern.overdue_payments >= 2 ? 'medium' : 'low';
          
          alerts.push({
            type: 'collection_required',
            priority,
            title: `Collection Alert - ${pattern.overdue_payments} Overdue Payments`,
            message: `${pattern.full_name} has ${pattern.overdue_payments} overdue payments. Repayment rate: ${pattern.avg_repayment_rate.toFixed(1)}%`,
            target_roles: ['loan_officer', 'branch_manager'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: pattern.overdue_payments >= 3 ? 'escalate_collection' : 'gentle_reminder',
              overdue_count: pattern.overdue_payments,
              repayment_rate: pattern.avg_repayment_rate
            }
          });
        }

        // Long-term dormancy alert
        if (pattern.days_since_last_loan >= 365) {
          alerts.push({
            type: 'dormancy_alert',
            priority: 'low',
            title: 'Long-term Dormant Account',
            message: `${pattern.full_name} hasn't borrowed in over a year. Consider reactivation strategy.`,
            target_roles: ['marketing_lead', 'branch_manager'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'reactivation_campaign',
              dormancy_period: pattern.days_since_last_loan
            }
          });
        }
        break;

      case 'new':
        // New customer nurturing
        if (pattern.total_loans === 1 && pattern.days_since_last_loan >= 7 && pattern.days_since_last_loan <= 14) {
          alerts.push({
            type: 'new_customer_followup',
            priority: 'medium',
            title: 'New Customer Follow-up',
            message: `Check in with new customer ${pattern.full_name}. First loan experience follow-up.`,
            target_roles: ['loan_officer'],
            user_id: pattern.user_id,
            data: {
              segment: pattern.segment,
              suggested_action: 'satisfaction_check',
              first_loan_performance: pattern.avg_repayment_rate
            }
          });
        }
        break;
    }

    // Payment due reminders for all active loans
    if (pattern.next_due_date) {
      const dueDate = new Date(pattern.next_due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 3 || daysUntilDue === 1) {
        alerts.push({
          type: 'payment_reminder',
          priority: 'medium',
          title: `Payment Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
          message: `${pattern.full_name} has a payment due on ${dueDate.toLocaleDateString()}.`,
          target_roles: ['loan_officer'],
          user_id: pattern.user_id,
          data: {
            segment: pattern.segment,
            suggested_action: 'payment_reminder',
            due_date: pattern.next_due_date,
            loan_id: pattern.current_loan_id
          }
        });
      }
    }

    // Insert generated alerts into database
    for (const alert of alerts) {
      await insertAlert(supabase, alert);
    }

  } catch (error) {
    console.error('Error generating alerts for pattern:', pattern.user_id, error);
  }

  return alerts;
}

async function insertAlert(supabase: any, alert: any) {
  try {
    // Create notification for each target role
    for (const role of alert.target_roles) {
      // Get users with this role
      const { data: roleUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);

      if (roleUsers) {
        for (const roleUser of roleUsers) {
          await supabase
            .from('notifications')
            .insert({
              user_id: roleUser.user_id,
              title: alert.title,
              message: alert.message,
              type: getPriorityType(alert.priority),
              entity_type: 'alert',
              entity_id: alert.user_id
            });
        }
      }
    }

    // Also insert into internal_messages for workflow tracking
    await supabase
      .from('internal_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System sender
        subject: alert.title,
        body: `${alert.message}\n\nSuggested Action: ${alert.data.suggested_action}\nSegment: ${alert.data.segment}`,
        priority: alert.priority,
        recipient_role: alert.target_roles[0] // Primary role
      });

  } catch (error) {
    console.error('Error inserting alert:', error);
  }
}

function getPriorityType(priority: string): string {
  switch (priority) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'info';
  }
}
