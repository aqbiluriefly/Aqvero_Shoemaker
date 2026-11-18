import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-32 text-center">
      <p className="eyebrow text-stone">404</p>
      <h1 className="mt-4 font-serif text-5xl">Page not found</h1>
      <p className="mt-4 text-stone">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/shop" className="btn btn-primary mt-10">Continue shopping</Link>
    </div>
  );
}
