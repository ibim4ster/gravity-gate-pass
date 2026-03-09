import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const meta = session.metadata!;
    const quantity = parseInt(meta.quantity || "1") || 1;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if ticket already created for this session
    const { data: existing } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("event_id", meta.event_id)
      .eq("buyer_email", meta.buyer_email)
      .eq("price_tier_id", meta.tier_id)
      .order("purchased_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ ticketId: existing[0].id, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create ticket with quantity - THIS MUST ALWAYS SUCCEED regardless of email
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        event_id: meta.event_id,
        price_tier_id: meta.tier_id,
        buyer_name: meta.buyer_name,
        buyer_email: meta.buyer_email,
        buyer_user_id: meta.buyer_user_id || null,
        tier_name: meta.tier_name,
        price: parseFloat(meta.price) * quantity,
        buyer_phone: meta.buyer_phone || null,
        buyer_dni: meta.buyer_dni || null,
        buyer_dob: meta.buyer_dob || null,
        quantity: quantity,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Increment sold count by quantity
    const { data: tier } = await supabaseAdmin
      .from("price_tiers")
      .select("sold")
      .eq("id", meta.tier_id)
      .single();

    if (tier) {
      await supabaseAdmin
        .from("price_tiers")
        .update({ sold: tier.sold + quantity })
        .eq("id", meta.tier_id);
    }

    // Fetch event details for email
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title, venue, city, time, date")
      .eq("id", meta.event_id)
      .single();

    // Send email via Resend - completely independent of ticket creation
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const origin = req.headers.get("origin") || "https://gravity-gate-pass.lovable.app";
        const ticketUrl = `${origin}/ticket/${ticket.id}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${ticket.qr_code}|${ticket.qr_signature}`)}`;
        const eventDate = event?.date ? new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const totalPrice = (parseFloat(meta.price) * quantity).toFixed(2);
        const quantityText = quantity > 1 ? ` × ${quantity}` : '';

        const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu pack</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">
    
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${origin}/logo-sanjuan.png" alt="Calle San Juan · Logroño" style="height:48px;" />
    </div>

    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      
      <div style="background:linear-gradient(135deg,#2d7a5a,#1d5c40);padding:40px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:28px;">🎫</span>
        </div>
        <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 6px 0;letter-spacing:-0.3px;">Compra confirmada</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;font-weight:400;">Tu pack está listo para usar</p>
      </div>

      <div style="padding:32px;">
        <h2 style="color:#1d1d1f;font-size:20px;font-weight:600;margin:0 0 24px 0;letter-spacing:-0.2px;">${event?.title || 'Ruta de Pinchos'}</h2>
        
        <div style="background:#f5f5f7;border-radius:12px;padding:20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#86868b;font-size:13px;font-weight:500;">Lugar</td>
              <td style="padding:8px 0;text-align:right;color:#1d1d1f;font-size:13px;font-weight:500;">${event?.venue || ''}, ${event?.city || 'Logroño'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#86868b;font-size:13px;font-weight:500;">Fecha</td>
              <td style="padding:8px 0;text-align:right;color:#1d1d1f;font-size:13px;font-weight:500;">${eventDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#86868b;font-size:13px;font-weight:500;">Horario</td>
              <td style="padding:8px 0;text-align:right;color:#1d1d1f;font-size:13px;font-weight:500;">${event?.time || ''}</td>
            </tr>
          </table>
        </div>

        <hr style="border:none;border-top:1px solid #e5e5e7;margin:0 0 24px 0;" />

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;color:#86868b;font-size:13px;font-weight:500;">Pack</td>
            <td style="padding:10px 0;text-align:right;color:#1d1d1f;font-size:14px;font-weight:600;">${meta.tier_name}${quantityText}</td>
          </tr>
          ${quantity > 1 ? `<tr>
            <td style="padding:10px 0;color:#86868b;font-size:13px;font-weight:500;">Cantidad</td>
            <td style="padding:10px 0;text-align:right;color:#1d1d1f;font-size:14px;font-weight:600;">${quantity} unidades</td>
          </tr>` : ''}
          <tr>
            <td style="padding:10px 0;color:#86868b;font-size:13px;font-weight:500;">Precio total</td>
            <td style="padding:10px 0;text-align:right;color:#2d7a5a;font-size:16px;font-weight:700;">${totalPrice} €</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#86868b;font-size:13px;font-weight:500;">Nombre</td>
            <td style="padding:10px 0;text-align:right;color:#1d1d1f;font-size:14px;font-weight:500;">${meta.buyer_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#86868b;font-size:13px;font-weight:500;">Código</td>
            <td style="padding:10px 0;text-align:right;font-family:'SF Mono',SFMono-Regular,Menlo,monospace;font-size:11px;color:#2d7a5a;letter-spacing:0.5px;">${ticket.qr_code}</td>
          </tr>
        </table>
      </div>

      <!-- QR Code section -->
      <div style="padding:0 32px 32px;text-align:center;">
        <p style="color:#86868b;font-size:12px;margin:0 0 16px 0;font-weight:500;">Tu código QR — Preséntalo en el bar</p>
        <div style="background:#ffffff;border:2px solid #e5e5e7;border-radius:16px;padding:20px;display:inline-block;">
          <img src="${qrApiUrl}" alt="Código QR" style="width:200px;height:200px;display:block;" />
        </div>
        <p style="font-family:'SF Mono',SFMono-Regular,Menlo,monospace;font-size:10px;color:#aeaeb2;margin:12px 0 0 0;letter-spacing:1px;">${ticket.qr_code}</p>
      </div>

      <div style="padding:0 32px 36px;text-align:center;">
        <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#2d7a5a,#1d5c40);color:#ffffff;padding:16px 48px;border-radius:14px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.1px;box-shadow:0 4px 12px rgba(45,122,90,0.3);">Ver mi ticket</a>
        <p style="color:#86868b;font-size:12px;margin:16px 0 0 0;font-weight:400;">También puedes presentar este email directamente</p>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0;">
      <p style="color:#86868b;font-size:11px;margin:0 0 4px 0;">Gravity · Ruta de Pinchos Calle San Juan · Logroño</p>
      <p style="color:#aeaeb2;font-size:11px;margin:0;">Este email se ha enviado automáticamente tras tu compra</p>
    </div>
  </div>
</body>
</html>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Gravity <onboarding@resend.dev>",
            to: [meta.buyer_email],
            subject: `🎫 Tu pack "${meta.tier_name}"${quantityText} — ${event?.title || 'Gravity'}`,
            html: emailHtml,
          }),
        });
        const emailBody = await emailRes.text();
        if (!emailRes.ok) {
          console.error("Email API error:", emailRes.status, emailBody);
        }
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        // Email failure does NOT affect ticket creation
      }
    }

    // Always return the ticket regardless of email success
    return new Response(JSON.stringify({ ticketId: ticket.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("verify-payment error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
