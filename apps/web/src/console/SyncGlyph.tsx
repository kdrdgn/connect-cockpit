import { ATTENTION_KINDS, type SyncKind } from "./sync";
import styles from "./SyncGlyph.module.css";

/**
 * One shape per kind, so state never depends on colour: dot = live, ring = pending, ring + clock = stale,
 * triangle with ! = error, diamond = quantity mismatch, dash = not listed. Decorative: the cell carries the words.
 */
export function SyncGlyph({ kind }: { kind: SyncKind }) {
  const cls = [styles.glyph, styles[kind], ATTENTION_KINDS.has(kind) && styles.attention].filter(Boolean).join(" ");
  return (
    <svg className={cls} viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      {kind === "live" && <circle cx="7" cy="7" r="2.5" fill="currentColor" />}
      {kind === "pending" && <circle cx="7" cy="7" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {kind === "stale" && (
        <>
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 4.25V7l2 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {kind === "error" && (
        <>
          <path d="M7 1.5l5.75 10.5H1.25z" fill="currentColor" />
          <path d="M7 5.25v3.25M7 10v.25" stroke="var(--color-surface)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {kind === "mismatch" && <path d="M7 1.75L12.25 7 7 12.25 1.75 7z" fill="currentColor" />}
      {kind === "not_listed" && <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}
