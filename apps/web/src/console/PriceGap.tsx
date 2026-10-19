import { gapDisplay } from "./price";
import styles from "./PriceGap.module.css";

/** Direction glyph + signed %. Quiet unless the band needs the broker: colour is reserved for "needs you". */
export function PriceGap({ price, marketPrice }: { price: number; marketPrice: number }) {
  const g = gapDisplay(price, marketPrice);
  return (
    <span className={g.attention ? `${styles.gap} ${styles.attention}` : styles.gap} data-band={g.band}>
      <svg className={styles.glyph} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
        {g.direction === "up" && <path d="M4 1l3.5 5h-7z" fill="currentColor" />}
        {g.direction === "down" && <path d="M4 7L.5 2h7z" fill="currentColor" />}
        {g.direction === "flat" && <circle cx="4" cy="4" r="1.5" fill="currentColor" />}
      </svg>
      <span aria-hidden="true">{g.text}</span>
      <span className="srOnly">{g.label}</span>
    </span>
  );
}
