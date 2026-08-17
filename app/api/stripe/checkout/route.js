import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

export async function POST(req) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is missing in process.env");
    return NextResponse.json({ error: "Server config error: STRIPE_SECRET_KEY missing" }, { status: 500 });
  }

  const body = await req.json();
  const priceId = body?.priceId;
  if (!priceId) {
    return NextResponse.json({ error: "No priceId provided" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const user = await currentUser();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer_email: user?.primaryEmailAddress?.emailAddress,
      subscription_data: {
        metadata: { clerkUserId: userId },
      },
      success_url: `${baseUrl}dashboard/upgrade?success=true`,
      cancel_url: `${baseUrl}dashboard/upgrade?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return NextResponse.json({ error: err?.message || "Could not start checkout" }, { status: 500 });
  }
}
