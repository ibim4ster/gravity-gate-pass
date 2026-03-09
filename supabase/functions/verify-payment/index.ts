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

    // Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        event_id: meta.event_id,
        price_tier_id: meta.tier_id,
        buyer_name: meta.buyer_name,
        buyer_email: meta.buyer_email,
        buyer_user_id: meta.buyer_user_id || null,
        tier_name: meta.tier_name,
        price: parseFloat(meta.price),
        buyer_phone: meta.buyer_phone || null,
        buyer_dni: meta.buyer_dni || null,
        buyer_dob: meta.buyer_dob || null,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Increment sold count
    const { data: tier } = await supabaseAdmin
      .from("price_tiers")
      .select("sold")
      .eq("id", meta.tier_id)
      .single();

    if (tier) {
      await supabaseAdmin
        .from("price_tiers")
        .update({ sold: tier.sold + 1 })
        .eq("id", meta.tier_id);
    }

    // Fetch event details for email
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title, venue, city, time, date")
      .eq("id", meta.event_id)
      .single();

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const ticketUrl = `${req.headers.get("origin")}/ticket/${ticket.id}`;
        const eventDate = event?.date ? new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${req.headers.get("origin")}/logo-sanjuan.png" alt="San Juan" style="height:60px;" />
    </div>
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#c2956b,#a67c52);padding:28px 24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px 0;">🎉 ¡Pack comprado con éxito!</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Tu entrada está lista</p>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 16px 0;">${event?.title || 'Ruta de Pinchos'}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444;">
          <tr><td style="padding:6px 0;color:#888;">📍 Lugar</td><td style="padding:6px 0;text-align:right;font-weight:500;">${event?.venue || ''}, ${event?.city || 'Logroño'}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">📅 Fecha</td><td style="padding:6px 0;text-align:right;font-weight:500;">${eventDate}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">🕐 Horario</td><td style="padding:6px 0;text-align:right;font-weight:500;">${event?.time || ''}</td></tr>
          <tr><td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;" /></td></tr>
          <tr><td style="padding:6px 0;color:#888;">🎫 Pack</td><td style="padding:6px 0;text-align:right;font-weight:600;">${meta.tier_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">💰 Precio</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#c2956b;">${meta.price}€</td></tr>
          <tr><td style="padding:6px 0;color:#888;">👤 Nombre</td><td style="padding:6px 0;text-align:right;font-weight:500;">${meta.buyer_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">🔑 Código</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;color:#c2956b;">${ticket.qr_code}</td></tr>
        </table>
      </div>
      <div style="padding:0 24px 28px;text-align:center;">
        <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#c2956b,#a67c52);color:#ffffff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Ver mi ticket con QR</a>
        <p style="color:#999;font-size:11px;margin:16px 0 0 0;">Presenta este QR en la entrada para acceder</p>
      </div>
    </div>
    <p style="color:#aaa;font-size:11px;text-align:center;margin-top:20px;">Gravity · Ruta de Pinchos Calle San Juan · Logroño</p>
  </div>
</body>
</html>`;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Gravity <onboarding@resend.dev>",
            to: [meta.buyer_email],
            subject: `🎫 Tu pack "${meta.tier_name}" — ${event?.title || 'Gravity'}`,
            html: emailHtml,
          }),
        });

        const resendData = await resendRes.json();
        console.log("Email sent:", resendData);
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(JSON.stringify({ ticketId: ticket.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
