import type { Metadata } from "next";
import { HowToMeasure, SizeGuideTable } from "@/components/product/SizeGuideTable";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Convert between US, UK, EU and centimetre shoe sizes for AQVERO boots.",
};

export default function SizeGuidePage() {
  return (
    <div className="container-x max-w-4xl pt-10 md:pt-16">
      <p className="eyebrow text-stone">Help</p>
      <h1 className="mt-3 font-serif text-5xl md:text-6xl">Size Guide</h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
        Our boots are listed in US sizes. Use the charts below to convert from UK, EU or your foot length in
        centimetres. Unsure? Email{" "}
        <a className="underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>{" "}
        with your measurement and we&apos;ll recommend a size.
      </p>

      <section className="mt-14">
        <h2 className="font-serif text-3xl">How to measure your foot</h2>
        <div className="mt-5"><HowToMeasure /></div>
      </section>

      <section className="mt-14" id="men">
        <h2 className="font-serif text-3xl">Men&apos;s sizes</h2>
        <div className="mt-5"><SizeGuideTable system="men" /></div>
      </section>

      <section className="mt-14 scroll-mt-28" id="women">
        <h2 className="font-serif text-3xl">Women&apos;s sizes (custom orders)</h2>
        <p className="mt-2 text-sm text-stone">Women&apos;s sizing is available as a custom order on selected styles.</p>
        <div className="mt-5"><SizeGuideTable system="women" /></div>
      </section>
    </div>
  );
}
