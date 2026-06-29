// Edge Function: stripe-webhook
// The ONLY component that grants paid credits. It verifies the Stripe signature (raw body),
// is idempotent on the event id, and writes via service-role (RLS gives clients no write).
// A forged "payment succeeded" POST is rejected at signature verification.
//
// Secrets: SUPABASE_URL, SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (test), STRIPE_WEBHOOK_SECRET (test).
// NOTE: this endpoint must be deployed with JWT verification DISABLED (Stripe has no Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@16";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no signature", { status: 400 });

  const raw = await req.text(); // RAW body required for signature verification
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits ?? "0");
  if (!userId || credits <= 0) return new Response("no metadata", { status: 200 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ATOMIC fulfillment: claim the event id AND grant the credits in ONE transaction
  // (fulfill_stripe_credits). This removes the old two-step insert-then-grant race where a
  // crash between the steps could take money but never credit. The function returns:
  //   true  -> this delivery performed the grant
  //   false -> the event was already processed (Stripe retry) -> safe to ack 200
  // On ANY error we return 500 so Stripe retries instead of silently dropping the credit.
  const { error: rpcErr } = await admin.rpc("fulfill_stripe_credits", {
    p_user: userId,
    p_credits: credits,
    p_event_id: event.id,
  });
  if (rpcErr) {
    console.error("fulfill_stripe_credits failed", rpcErr.message);
    return new Response("fulfillment error", { status: 500 }); // Stripe will retry
  }

  return new Response("ok", { status: 200 });
});
