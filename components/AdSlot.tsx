/**
 * AdSlot — placeholder for Google AdSense.
 *
 * Replace the inner content with the actual AdSense snippet when you
 * have an approved AdSense account. Keep the outer wrapper div as-is.
 *
 * @example
 *   <AdSlot id="room-top" />
 *   <AdSlot id="settlement-bottom" />
 */

interface Props {
  id: string;
  className?: string;
}

export default function AdSlot({ id, className = '' }: Props) {
  // ========================================================
  // 📢 AD PLACEHOLDER — Replace with AdSense code here
  // ========================================================
  return (
    <div
      id={`ad-slot-${id}`}
      aria-label="Advertisement"
      className={`w-full rounded-[var(--radius-card)] border border-dashed border-border
                  bg-surface flex items-center justify-center
                  min-h-[90px] text-muted-foreground text-xs font-mono
                  ${className}`}
    >
      {/* ADSENSE PLACEHOLDER — id: {id} */}
      <span>Ad · {id}</span>
    </div>
  );
}
