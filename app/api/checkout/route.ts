import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: body.priceId, // Stripe Price ID
          quantity: 1,
        },
      ],
      success_url: `${body.origin}/dashboard?payment=success`,
      cancel_url: `${body.origin}/dashboard?payment=cancel`,
      customer_email: body.email, // Optional if you have login info
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error("Checkout error:", err.message);
    return new NextResponse(`Checkout error: ${err.message}`, { status: 500 });
  }
}
