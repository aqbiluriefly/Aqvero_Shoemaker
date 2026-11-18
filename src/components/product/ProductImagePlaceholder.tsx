export function ProductImagePlaceholder({ label = "Photo coming soon" }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-cream text-stone">
      <svg viewBox="0 0 64 40" className="w-20 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M6 34h52v-4c0-3-2-5-6-6l-14-4-6-12H14v22H6z" />
        <path d="M6 34v2h52v-2" />
      </svg>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
