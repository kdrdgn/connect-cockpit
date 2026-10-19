import styles from "./Console.module.css";
import type { SyncKind } from "./sync";
import { SyncGlyph } from "./SyncGlyph";

const KEY: readonly [SyncKind, string][] = [
  ["live", "Live"],
  ["pending", "Pending"],
  ["stale", "Pending too long"],
  ["error", "Error"],
  ["mismatch", "Quantity mismatch"],
  ["not_listed", "Not listed"],
];

/**
 * What the SH / SG / VV / TC shapes mean, drawn with the real glyphs. Sighted users only: every sync cell already
 * carries its state in words for screen readers.
 */
export function SyncLegend() {
  return (
    <ul className={styles.legend} aria-hidden="true">
      {KEY.map(([kind, word]) => (
        <li key={kind}>
          <SyncGlyph kind={kind} />
          {word}
        </li>
      ))}
    </ul>
  );
}
