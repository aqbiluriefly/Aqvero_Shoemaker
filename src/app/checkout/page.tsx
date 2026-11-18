import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-x pt-10 md:pt-16">
      <h1 className="font-serif text-5xl md:text-6xl">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
