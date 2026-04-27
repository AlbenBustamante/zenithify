import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DolarApiResponse {
  moneda: string;
  fuente: string;
  promedio: number;
}

serve(async (req) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dolarApiUrl = 'https://ve.dolarapi.com/v1/dolares';
    const response = await fetch(dolarApiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.status}`);
    }

    const data: DolarApiResponse[] = await response.json();
    const officialRate = data.find(
      (item) => item.moneda === 'USD' && item.fuente === 'oficial'
    );

    if (!officialRate) {
      throw new Error('Official rate not found in API response');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: exchangeRate, error } = await supabase
      .from('exchange_rates')
      .upsert({
        user_id: userId,
        from_currency: 'VES',
        to_currency: 'USD',
        rate: officialRate.promedio,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        rate: officialRate.promedio,
        exchangeRate,
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