import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate a placeholder QR code as an SVG data URL
    const sessionId = crypto.randomUUID();
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
  <rect width='100%' height='100%' fill='#111827'/>
  <rect x='32' y='32' width='192' height='192' fill='none' stroke='#10b981' stroke-width='8' stroke-dasharray='8 8'/>
  <text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' fill='#10b981' font-family='monospace' font-size='14'>Escaneie no WhatsApp</text>
  <text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='monospace' font-size='12'>Sessão ${sessionId.slice(0, 8)}</text>
</svg>`;
    const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const { data, error } = await supabase
      .from("whatsapp_sessions")
      .insert([
        {
          session_id: sessionId,
          is_connected: false,
          qr_code: qrDataUrl,
          last_ping_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error inserting whatsapp session", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, session: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error in whatsapp-connect", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
