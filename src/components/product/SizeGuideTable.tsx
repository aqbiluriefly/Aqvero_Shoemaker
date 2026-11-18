import { SIZE_CHARTS } from "@/lib/catalog/sizes";
import type { SizeSystem } from "@/lib/catalog/types";
import { cn } from "@/lib/format";

export function SizeGuideTable({ system, highlightUs }: { system: SizeSystem; highlightUs?: number | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-center text-sm">
        <caption className="sr-only">{system === "men" ? "Men's" : "Women's"} size conversion chart</caption>
        <thead>
          <tr className="border-b border-ink">
            {["US", "UK", "EU", "Foot (cm)"].map((h) => (
              <th key={h} scope="col" className="eyebrow py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SIZE_CHARTS[system].map((r) => (
            <tr key={r.us} className={cn("border-b border-sand", highlightUs === r.us && "bg-cream font-medium")}>
              <td className="py-2.5">{r.us}</td>
              <td className="py-2.5">{r.uk}</td>
              <td className="py-2.5">{r.eu}</td>
              <td className="py-2.5">{r.cm.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HowToMeasure() {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone">
      <li>Stand on a sheet of paper with your heel against a wall, wearing the socks you&apos;d wear with boots.</li>
      <li>Mark the tip of your longest toe and measure from the wall to the mark in centimetres.</li>
      <li>Measure both feet and use the longer measurement. Pick the size whose foot length is equal or just above it.</li>
      <li>Between sizes? Engineer boots are snug at first and ease with wear — contact us and we&apos;ll advise.</li>
    </ol>
  );
}
