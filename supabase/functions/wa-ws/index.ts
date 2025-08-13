import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Baileys - usando versão específica que funciona no Deno
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion 
} from "https://esm.sh/@whiskeysockets/baileys@6.7.8";

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
        const existingWASocket = activeConnections.get(user.id);
        if (existingWASocket?.user?.id) {
          socket.send(JSON.stringify({
            type: "status",
            status: "connected",
            message: "Already connected to WhatsApp"
          }));
          return;
        } else {
          // Clean up stale connection
          activeConnections.delete(user.id);
        }
      }

      // Create auth state adapter for database storage
      const authStateAdapter = {
        readData: async (file: string) => {
          try {
            const { data } = await supabase
              .from("whatsapp_auth")
              .select("data")
              .eq("user_id", user.id)
              .single();
            
            return data?.data?.[file] || null;
          } catch (error) {
            console.log(`No auth data found for ${file}:`, error.message);
            return null;
          }
        },
        writeData: async (file: string, data: any) => {
          try {
            const { data: existingData } = await supabase
              .from("whatsapp_auth")
              .select("data")
              .eq("user_id", user.id)
              .single();

            const authData = existingData?.data || {};
            authData[file] = data;

            await supabase
              .from("whatsapp_auth")
              .upsert({ 
                user_id: user.id, 
                data: authData 
              });
          } catch (error) {
            console.error(`Error writing auth data for ${file}:`, error);
          }
        },
        removeData: async (file: string) => {
          try {
            const { data: existingData } = await supabase
              .from("whatsapp_auth")
              .select("data")
              .eq("user_id", user.id)
              .single();

            if (existingData?.data) {
              delete existingData.data[file];
              await supabase
                .from("whatsapp_auth")
                .update({ data: existingData.data })
                .eq("user_id", user.id);
            }
          } catch (error) {
            console.error(`Error removing auth data for ${file}:`, error);
          }
        }
      };

      // Start WhatsApp connection
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      const waSocket = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: {
          creds: await authStateAdapter.readData("creds.json") || undefined,
          keys: await authStateAdapter.readData("app-state-sync-key") || {}
        },
        // Configurações de conexão
        browser: ["WA Team Desk", "Chrome", "1.0.0"],
        markOnlineOnConnect: true
      });

      // Store connection
      activeConnections.set(user.id, waSocket);

      waSocket.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        console.log(`Connection update for user ${user.id}:`, { connection, qr: !!qr });

        if (qr) {
          // Send QR code to client
          socket.send(JSON.stringify({
            type: "qr",
            qr: qr
          }));
          
          await supabase
            .from("whatsapp_status")
            .upsert({ user_id: user.id, status: "qr_ready" });
        }

        if (connection === "close") {
          const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          console.log(`Connection closed for user ${user.id}, shouldReconnect:`, shouldReconnect);
          
          if (shouldReconnect) {
            await supabase
              .from("whatsapp_status")
              .upsert({ user_id: user.id, status: "reconnecting" });
              
            socket.send(JSON.stringify({
              type: "status",
              status: "reconnecting",
              message: "Connection lost, attempting to reconnect..."
            }));
          } else {
            await supabase
              .from("whatsapp_status")
              .upsert({ user_id: user.id, status: "disconnected" });
              
            socket.send(JSON.stringify({
              type: "status",
              status: "disconnected",
              message: "Logged out from WhatsApp"
            }));
          }
          
          activeConnections.delete(user.id);
        } else if (connection === "open") {
          console.log(`WhatsApp connected for user ${user.id}`);
          
          await supabase
            .from("whatsapp_status")
            .upsert({ user_id: user.id, status: "connected" });
            
          socket.send(JSON.stringify({
            type: "status",
            status: "connected",
            message: "Successfully connected to WhatsApp!"
          }));
        }
      });

      waSocket.ev.on("creds.update", async (creds) => {
        await authStateAdapter.writeData("creds.json", creds);
      });

      waSocket.ev.on("auth-state.update", async ({ keys }) => {
        await authStateAdapter.writeData("app-state-sync-key", keys);
      });

      // Initial status
      await supabase
        .from("whatsapp_status")
        .upsert({ user_id: user.id, status: "connecting" });

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
        const waSocket = activeConnections.get(user.id);
        waSocket?.end();
        activeConnections.delete(user.id);
      }
    }, 30000); // 30 seconds delay
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for user ${user.id}:`, error);
  };

  return response;
});