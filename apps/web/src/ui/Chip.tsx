import styles from "./Chip.module.css";

/** An active filter, named in words. Removing it removes only that filter. */
export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={styles.chip}>
      {label}
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove filter: ${label}`}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </span>
  );
}
