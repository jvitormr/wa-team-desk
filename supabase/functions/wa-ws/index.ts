import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Store active connections
const activeConnections = new Map<string, any>();

// Simulate WhatsApp QR codes for demo
const generateDemoQR = async (userId: string): Promise<string> => {
  const qrData = `whatsapp-demo-${userId}-${Date.now()}`;
  return await QRCode.toDataURL(qrData);
};

serve(async (req) => {
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Token is passed via query string (?token=)
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response("Token required", { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Server configuration error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate the JWT token to obtain user info
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response("Invalid token", { status: 401, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    const userId = user.id;
    console.log(`WebSocket opened for user ${userId}`);

    // Check if already connected
    if (activeConnections.has(userId)) {
      socket.send(
        JSON.stringify({
          type: "status",
          status: "connected",
          message: "Already connected to WhatsApp",
        }),
      );
      return;
    }

    // Simulate WhatsApp connection process
    const simulateConnection = async () => {
      try {
        // Set status to connecting
        await supabase
          .from("whatsapp_status")
          .upsert({ user_id: userId, status: "connecting" });

        socket.send(
          JSON.stringify({
            type: "status",
            status: "connecting",
            message: "Initiating WhatsApp connection...",
          })
        );

        // Wait a bit then generate QR
        setTimeout(async () => {
          try {
            const qrImage = await generateDemoQR(userId);
            
            // Save QR to database
            await supabase
              .from("whatsapp_sessions")
              .upsert({
                session_id: userId,
                qr_code: qrImage,
                is_connected: false,
                last_ping_at: new Date().toISOString(),
              });

            await supabase
              .from("whatsapp_status")
              .upsert({ user_id: userId, status: "qr_ready" });

            socket.send(JSON.stringify({ 
              type: "qr", 
              qr: qrImage 
            }));

            console.log(`QR code generated for user ${userId}`);

            // Auto-connect after 10 seconds for demo
            setTimeout(async () => {
              try {
                await supabase
                  .from("whatsapp_status")
                  .upsert({ user_id: userId, status: "connected" });

                await supabase
                  .from("whatsapp_sessions")
                  .upsert({
                    session_id: userId,
                    qr_code: null,
                    is_connected: true,
                    last_ping_at: new Date().toISOString(),
                  });

                activeConnections.set(userId, { connected: true });

                socket.send(
                  JSON.stringify({
                    type: "status",
                    status: "connected",
                    message: "Successfully connected to WhatsApp!",
                  })
                );

                console.log(`WhatsApp connected for user ${userId}`);
              } catch (error) {
                console.error(`Connection error for user ${userId}:`, error);
              }
            }, 10000);

          } catch (error) {
            console.error(`QR generation error for user ${userId}:`, error);
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Failed to generate QR code",
              })
            );
          }
        }, 2000);

      } catch (error) {
        console.error(`Simulation error for user ${userId}:`, error);
        await supabase
          .from("whatsapp_status")
          .upsert({ user_id: userId, status: "error" });

        socket.send(
          JSON.stringify({
            type: "error",
            message: "Failed to initialize WhatsApp connection",
          })
        );
      }
    };

    await simulateConnection();
  };

  socket.onclose = () => {
    console.log(`WebSocket closed for user ${user.id}`);

    // Allow small grace period before destroying in case client reconnects
    setTimeout(() => {
      const conn = activeConnections.get(user.id);
      conn?.end?.();
      activeConnections.delete(user.id);
    }, 30000); // 30s
  };

  socket.onerror = (err) => {
    console.error(`WebSocket error for user ${user.id}:`, err);
  };

  return response;
});

