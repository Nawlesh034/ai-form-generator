import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import PricingPlan, { FREE_FORM_LIMIT } from "@/app/_data/PricingPlan";
import {db} from "@/config/index";
import {subscriptions} from "@/config/schema"
import { eq } from "drizzle-orm";

const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];




export async function POST(req) {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    return NextResponse.json(
      { error: "Server config error" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
  );

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(
      "Stripe webhook signature verification failed:",
      err.message
    );

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (SUBSCRIPTION_EVENTS.includes(event.type)) {
    const subscription = event.data.object;

    const clerkUserId =
      subscription.metadata?.clerkUserId;

    if (!clerkUserId) {
      console.warn(
        `Subscription ${subscription.id} has no clerkUserId`
      );

      return NextResponse.json({ received: true });
    }

    const stripeCustomerId = subscription.customer;
    const stripeSubscriptionId = subscription.id;
    const stripePriceId =
      subscription.items.data[0].price.id;
    const status = subscription.status;

    const matchedPlan = PricingPlan.find(
      (p) => p.priceId === stripePriceId
    );

    const isActive = ["active", "trialing"].includes(
      status
    );

    const plan =
      isActive && matchedPlan ? "paid" : "free";

    const formLimit =
      isActive && matchedPlan
        ? matchedPlan.formLimit
        : FREE_FORM_LIMIT;

    // Save subscription in Neon
    await db
      .insert(subscriptions)
      .values({
        clerkUserId,
        stripeCustomerId: String(stripeCustomerId),
        stripeSubscriptionId,
        stripePriceId,
        plan,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          stripePriceId,
          plan,
          status,
          updatedAt: new Date().toISOString(),
        },
      });

    // Update Clerk
    try {
      const client = await clerkClient();

      await client.users.updateUserMetadata(
        clerkUserId,
        {
          publicMetadata: {
            plan,
            formLimit,
          },
        }
      );
    } catch (err) {
      console.error(
        `Failed to sync Clerk for user ${clerkUserId}:`,
        err
      );

      return NextResponse.json(
        { error: "Clerk update failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
