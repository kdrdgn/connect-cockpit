import { Button } from "@/ui/Button";
import { BulkControls, LastBulkActions, resultSummary } from "./BulkActions";
import styles from "./Console.module.css";
import { useUi } from "./store";
import type { useBulkFlow } from "./useBulkFlow";

export function BulkBar({ flow }: { flow: ReturnType<typeof useBulkFlow> }) {
  const count = useUi((s) => s.selection.size);
  const clear = useUi((s) => s.clearSelection);
  const last = useUi((s) => s.lastBulk);
  return (
    <section id="bulk-actions" className={`${styles.bulk} ${styles.bulkBar}`} tabIndex={-1} aria-label="Bulk actions">
      {count === 0 ? (
        <span>Select rows to change price or delist.</span>
      ) : (
        <>
          <strong className={styles.selectedCount} aria-live="polite">
            {count} selected
          </strong>
          <BulkControls flow={flow} />
          <Button variant="ghost" onClick={clear}>
            Clear selection
          </Button>
        </>
      )}
      {last && (
        <span className={styles.lastBulk}>
          <span>Last change: {resultSummary(last)}</span>
          <LastBulkActions flow={flow} />
        </span>
      )}
    </section>
  );
}
