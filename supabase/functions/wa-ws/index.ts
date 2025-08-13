import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import whatsapp-web.js via ESM
import { Client as WWebClient, LocalAuth } from "https://esm.sh/whatsapp-web.js@1.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map to store active connections per user
const activeConnections = new Map();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  // Get token from query string
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Token required", { 
      status: 401,
      headers: corsHeaders 
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return new Response("Server configuration error", { 
      status: 500,
      headers: corsHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify JWT token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response("Invalid token", { 
      status: 401,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    console.log(`WebSocket opened for user ${user.id}`);
    
    try {
      // Check if connection already exists
      if (activeConnections.has(user.id)) {
        socket.send(
          JSON.stringify({
            type: "status",
            status: "connected",
            message: "Already connected to WhatsApp",
          }),
        );
        return;
      }

      // Start WhatsApp connection using whatsapp-web.js
      const waClient = new WWebClient({
        authStrategy: new LocalAuth({ clientId: user.id }),
        puppeteer: { headless: true },
      });

      // Store connection
      activeConnections.set(user.id, waClient);

      waClient.on("qr", async (qr: string) => {
        socket.send(JSON.stringify({ type: "qr", qr }));

        await supabase
          .from("whatsapp_status")
          .upsert({ user_id: user.id, status: "qr_ready" });
      });

      waClient.on("ready", async () => {
        console.log(`WhatsApp connected for user ${user.id}`);

        await supabase
          .from("whatsapp_status")
          .upsert({ user_id: user.id, status: "connected" });

        socket.send(
          JSON.stringify({
            type: "status",
            status: "connected",
            message: "Successfully connected to WhatsApp!",
          }),
        );
      });

      waClient.on("disconnected", async (reason: unknown) => {
        console.log(`Connection closed for user ${user.id}:`, reason);

        await supabase
          .from("whatsapp_status")
          .upsert({ user_id: user.id, status: "disconnected" });

        socket.send(
          JSON.stringify({
            type: "status",
            status: "disconnected",
            message: "Logged out from WhatsApp",
          }),
        );

        activeConnections.delete(user.id);
      });

      // Initial status
      await supabase
        .from("whatsapp_status")
        .upsert({ user_id: user.id, status: "connecting" });

      await waClient.initialize();

    } catch (error) {
      console.error(`Error setting up WhatsApp for user ${user.id}:`, error);
      
      socket.send(JSON.stringify({
        type: "error",
        message: "Failed to initialize WhatsApp connection"
      }));
      
      await supabase
        .from("whatsapp_status")
        .upsert({ user_id: user.id, status: "error" });
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket closed for user ${user.id}`);
    
    // Clean up connection after delay to allow reconnection
    setTimeout(() => {
      if (activeConnections.has(user.id)) {
        const client = activeConnections.get(user.id);
        client?.destroy();
        activeConnections.delete(user.id);
      }
    }, 30000); // 30 seconds delay
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for user ${user.id}:`, error);
  };

  return response;
});