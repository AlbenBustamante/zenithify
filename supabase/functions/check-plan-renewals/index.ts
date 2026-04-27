import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PlanRenewalCheck {
  planId: string;
  userId: string;
  planName: string;
  provider: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
  daysUntilRenewal: number;
}

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const { data: plans, error } = await supabase
      .from('plans')
      .select('*, profiles(user_id, display_name)')
      .eq('is_active', true)
      .lte('next_billing_date', sevenDaysFromNow.toISOString().split('T')[0])
      .gte('next_billing_date', today.toISOString().split('T')[0]);

    if (error) throw error;

    const notifications: Array<{
      user_id: string;
      type: 'plan_renewal';
      title: string;
      body: string;
      data: Record<string, unknown>;
    }> = [];

    for (const plan of plans as PlanRenewalCheck[]) {
      const daysUntil = Math.ceil(
        (new Date(plan.nextBillingDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      notifications.push({
        user_id: plan.userId,
        type: 'plan_renewal',
        title: `Renovación próxima: ${plan.planName}`,
        body: `Tu suscripción a ${plan.provider} (${
          plan.currency === 'USD' ? '$' : 'Bs'
        }${plan.amount}) se renovará en ${daysUntil} días`,
        data: {
          planId: plan.planId,
          amount: plan.amount,
          currency: plan.currency,
          daysUntilRenewal: daysUntil,
        },
      });
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        plans: plans,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});