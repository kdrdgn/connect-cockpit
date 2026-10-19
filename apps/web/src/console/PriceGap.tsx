import { gapDisplay } from "./price";
import styles from "./PriceGap.module.css";

/**
 * Direction glyph + signed %, louder the further from market: colour is reserved for "needs you". The strong tier
 * doubles the glyph, so it differs from attention by shape and not by hue alone.
 */
export function PriceGap({ price, marketPrice }: { price: number; marketPrice: number }) {
  const g = gapDisplay(price, marketPrice);
  const doubled = g.tier === "strong";
  return (
    <span className={`${styles.gap} ${styles[g.tier]}`} data-band={g.band} data-tier={g.tier}>
      <svg className={styles.glyph} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
        {g.direction === "up" && !doubled && <path d="M4 1l3.5 5h-7z" fill="currentColor" />}
        {g.direction === "down" && !doubled && <path d="M4 7L.5 2h7z" fill="currentColor" />}
        {g.direction === "up" && doubled && <path d="M4 0l3 3.5H1zM4 4.5l3 3.5H1z" fill="currentColor" />}
        {g.direction === "down" && doubled && <path d="M4 8L1 4.5h6zM4 3.5L1 0h6z" fill="currentColor" />}
        {g.direction === "flat" && <circle cx="4" cy="4" r="1.25" fill="currentColor" />}
      </svg>
      <span aria-hidden="true">{g.text}</span>
      <span className="srOnly">{g.label}</span>
    </span>
  );
}
