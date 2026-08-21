import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import PricingPlan, { FREE_FORM_LIMIT } from "@/app/_data/PricingPlan";

const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing in process.env");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (SUBSCRIPTION_EVENTS.includes(event.type)) {
    const subscription = event.data.object;
    const clerkUserId = subscription.metadata?.clerkUserId;

    if (!clerkUserId) {
      console.warn(`Stripe subscription ${subscription.id} has no clerkUserId metadata`);
    } else {
      const isActive = ["active", "trialing"].includes(subscription.status);
      const purchasedPriceId = subscription.items?.data?.[0]?.price?.id;
      const matchedPlan = PricingPlan.find((p) => p.priceId === purchasedPriceId);

      const plan = isActive && matchedPlan ? "paid" : "free";
      const formLimit = isActive && matchedPlan ? matchedPlan.formLimit : FREE_FORM_LIMIT;

      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkUserId, {
          publicMetadata: { plan, formLimit },
        });
      } catch (err) {
        console.error(`Stripe webhook: failed to sync plan for clerkUserId=${clerkUserId}, subscription=${subscription.id}:`, err);
        return NextResponse.json({ error: "Clerk update failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
