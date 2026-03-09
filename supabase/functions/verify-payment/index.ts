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

    // Use service role to create ticket
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

    // Simple dedup: check metadata
    if (existing && existing.length > 0) {
      // Could be a duplicate call - return existing ticket
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

    // Send email with ticket
    try {
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("title, venue, city, time")
        .eq("id", meta.event_id)
        .single();

      const ticketUrl = `${req.headers.get("origin")}/ticket/${ticket.id}`;

      // Use Lovable AI to send email via edge function
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">🎉 ¡Pack comprado!</h1>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 20px 0;">
            <h2 style="color: #1a1a2e; margin: 0 0 8px 0;">${event?.title || 'Gravity'}</h2>
            <p style="color: #666; margin: 4px 0;">📍 ${event?.venue || 'Calle San Juan'}, ${event?.city || 'Logroño'}</p>
            <p style="color: #666; margin: 4px 0;">🕐 Horario: ${event?.time || ''}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;" />
            <p style="margin: 4px 0;"><strong>Pack:</strong> ${meta.tier_name}</p>
            <p style="margin: 4px 0;"><strong>Precio:</strong> ${meta.price}€</p>
            <p style="margin: 4px 0;"><strong>Nombre:</strong> ${meta.buyer_name}</p>
            <p style="margin: 4px 0;"><strong>Código:</strong> ${ticket.qr_code}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Ver mi ticket con QR</a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">Gravity · Ruta de Pinchos Calle San Juan · Logroño</p>
        </div>
      `;

      // Send via Resend or similar - for now we'll use a simple fetch to a transactional email service
      // This will be enhanced later
      console.log("Email would be sent to:", meta.buyer_email, "with ticket:", ticket.qr_code);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
      // Don't fail the payment verification if email fails
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
