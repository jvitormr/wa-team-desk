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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const session = url.searchParams.get('session');
    const body = await req.json();

    console.log('WAHA webhook received:', { session, body });

    // Handle session status updates
    if (body.event === 'session.status') {
      const status = body.data?.status;
      
      // Find user by session name
      const operatorId = session?.replace('operator_', '');
      if (operatorId) {
        const { data: operator } = await supabase
          .from('operators')
          .select('user_id')
          .eq('id', operatorId)
          .single();

        if (operator) {
          let waStatus = 'disconnected';
          if (status === 'WORKING') waStatus = 'connected';
          else if (status === 'STARTING') waStatus = 'connecting';

          await supabase
            .from('whatsapp_status')
            .upsert({
              user_id: operator.user_id,
              status: waStatus,
              session_name: session,
              updated_at: new Date().toISOString()
            });

          console.log('Updated WhatsApp status:', { user_id: operator.user_id, status: waStatus });
        }
      }
    }

    // Handle incoming messages
    if (body.event === 'message' && body.data) {
      const message = body.data;
      
      // Find user by session name
      const operatorId = session?.replace('operator_', '');
      if (operatorId) {
        const { data: operator } = await supabase
          .from('operators')
          .select('user_id')
          .eq('id', operatorId)
          .single();

        if (operator) {
          // Store message in conversations table
          await supabase
            .from('conversations')
            .insert({
              contact_phone: message.from,
              contact_name: message.fromMe ? 'Você' : (message.notifyName || message.from),
              last_message: message.body || '[Mídia]',
              last_message_at: new Date().toISOString(),
              operator_id: operatorId,
              status: 'active'
            });

          console.log('Stored message:', { from: message.from, body: message.body });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in waha-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});