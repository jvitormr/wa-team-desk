/* eslint-disable react-hooks/rules-of-hooks */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Baileys and helpers via ESM shim for Deno
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "https://esm.sh/@whiskeysockets/baileys@6.7.7";

// Lightweight QR encoder that outputs base64 data URLs
import QRCode from "https://esm.sh/qrcode@1.5.4";

// Logger – avoid printing sensitive data such as the raw QR string
import Pino from "https://esm.sh/pino@8.17.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Active connections per user id
const activeConnections = new Map<string, WASocket>();

// Minimal type for Boom style errors so we don't rely on `any`
interface BoomError {
  output?: { statusCode?: number };
}

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
    const logger = Pino({ level: "info" });
    logger.info({ user: userId }, "WebSocket opened");

    // If we already have a running connection, just notify the client
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

    // Helper to actually start the Baileys socket
    const startSock = async () => {
      // Each user has its own auth directory to keep sessions isolated
      const { state, saveCreds } = await useMultiFileAuthState(
        `./auth/${userId}`,
      );

      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        auth: state,
        logger, // pino instance
        printQRInTerminal: false,
        browser: ["WhatsCRM", "Chrome", "1.0"],
        version,
      });

      activeConnections.set(userId, sock);

      sock.ev.on("creds.update", saveCreds);

      // Optional pairing code fallback: if environment provides a phone
      // number and the library supports it, request a pairing code. This
      // is useful for devices that cannot scan QR codes.
      const pairingPhone = Deno.env.get("PAIRING_CODE_PHONE");
      if (pairingPhone && sock.requestPairingCode) {
        try {
          const code = await sock.requestPairingCode(pairingPhone);
          socket.send(JSON.stringify({ type: "pairing", code }));
          logger.info({ user: userId }, "Pairing code requested");
        } catch (err) {
          logger.error({ user: userId, err }, "Failed to request pairing code");
        }
      }

      // Status in DB while we connect
      await supabase
        .from("whatsapp_status")
        .upsert({ user_id: userId, status: "connecting" });

      // Listen for connection updates (QR, open/close, errors)
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr, pairingCode } = update;

        if (qr) {
          // Convert QR string to base64 PNG and send to frontend
          const qrImage = await QRCode.toDataURL(qr);

          // Send through WebSocket without logging the raw QR
          socket.send(JSON.stringify({ type: "qr", qr: qrImage }));
          logger.info({ user: userId }, "QR code generated");

          // Persist QR for HTTP polling fallback
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
        }

        // Pairing code fallback if the device supports it
        if (pairingCode) {
          socket.send(JSON.stringify({ type: "pairing", code: pairingCode }));
          logger.info({ user: userId }, "Pairing code generated");
        }

        if (connection === "open") {
          // Successfully connected
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

          socket.send(
            JSON.stringify({
              type: "status",
              status: "connected",
              message: "Successfully connected to WhatsApp!",
            }),
          );

          logger.info({ user: userId }, "WhatsApp connected");
        }

        if (connection === "close") {
          logger.info({ user: userId, err: lastDisconnect?.error }, "Connection closed");

          await supabase
            .from("whatsapp_status")
            .upsert({ user_id: userId, status: "disconnected" });

          socket.send(
            JSON.stringify({
              type: "status",
              status: "disconnected",
              message: "Disconnected from WhatsApp",
            }),
          );

          activeConnections.delete(userId);

          const shouldReconnect =
            ((lastDisconnect?.error as BoomError)?.output?.statusCode ?? 0) !==
              DisconnectReason.loggedOut;

          if (shouldReconnect) {
            // Try to reconnect after short delay
            setTimeout(() => startSock(), 5000);
          } else {
            // Logged out – clear stored session
            await supabase
              .from("whatsapp_sessions")
              .upsert({
                session_id: userId,
                qr_code: null,
                is_connected: false,
                last_ping_at: new Date().toISOString(),
              });
          }
        }
      });
    };

    try {
      await startSock();
    } catch (err) {
      logger.error({ user: userId, err }, "Failed to start WhatsApp socket");
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Failed to initialize WhatsApp connection",
        }),
      );

      await supabase
        .from("whatsapp_status")
        .upsert({ user_id: userId, status: "error" });
    }
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

