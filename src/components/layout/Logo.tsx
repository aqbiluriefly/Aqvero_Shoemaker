import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link href="/" aria-label="AQVERO home" className={cn("flex items-center gap-2.5", className)}>
      <Image src="/brand/aqvero-emblem.png" alt="" width={857} height={672} className="h-7 w-auto md:h-8" priority />
      <span
        className={cn(
          "font-serif text-[1.55rem] leading-none font-semibold tracking-[0.14em] md:text-[1.75rem]",
          tone === "dark" ? "text-espresso" : "text-cream",
        )}
      >
        AQVERO
      </span>
    </Link>
  );
}
