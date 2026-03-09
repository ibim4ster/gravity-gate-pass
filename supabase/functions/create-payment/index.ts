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
    const { eventId, tierId, buyerName, buyerEmail, buyerPhone, buyerDni, buyerDob } = await req.json();

    if (!eventId || !tierId || !buyerName || !buyerEmail) {
      throw new Error("Missing required fields");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Fetch tier info
    const { data: tier, error: tierError } = await supabaseClient
      .from("price_tiers")
      .select("*")
      .eq("id", tierId)
      .single();

    if (tierError || !tier) throw new Error("Pack no encontrado");

    // Fetch event info
    const { data: event } = await supabaseClient
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: buyerEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create a Stripe Checkout session with the price embedded
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${tier.name} — ${event?.title || "Gravity"}`,
              description: tier.description || undefined,
            },
            unit_amount: Math.round(tier.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        event_id: eventId,
        tier_id: tierId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone || "",
        buyer_dni: buyerDni || "",
        buyer_dob: buyerDob || "",
        buyer_user_id: userId || "",
        tier_name: tier.name,
        price: String(tier.price),
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/${eventId}/${tierId}`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
