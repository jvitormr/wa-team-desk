import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !wahaApiUrl || !wahaApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: user, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user?.user?.id) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get operator for the user
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('user_id', user.user.id)
      .single();

    if (!operator) {
      return new Response(JSON.stringify({ error: 'Operator not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const sessionName = body.name || `operator_${operator.id}`;

    console.log('Starting WAHA session:', sessionName);

    // Call WAHA API to start session
    const response = await fetch(`${wahaApiUrl}/api/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaApiKey,
      },
      body: JSON.stringify({
        name: sessionName,
        config: {
          webhooks: [
            {
              url: `${supabaseUrl}/functions/v1/waha-webhook?session=${sessionName}`,
              events: ['message', 'session.status']
            }
          ]
        },
        ...body
      }),
    });

    const responseText = await response.text();
    console.log('WAHA response:', response.status, responseText);

    // Update WhatsApp status
    await supabase
      .from('whatsapp_status')
      .upsert({
        user_id: user.user.id,
        status: 'connecting',
        session_name: sessionName,
        updated_at: new Date().toISOString()
      });

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in waha-start-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});