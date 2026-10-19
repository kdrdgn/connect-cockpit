import { Button } from "@/ui/Button";
import { focusCell, lastFocusedRowId, setLastFocusedRowId } from "./focus";
import { stepProblem } from "./problems";
import styles from "./Console.module.css";

/** Jumps to the next/previous problem in ranking order, scrolling it into the virtual window first. */
export function jumpToProblem(order: readonly string[], indexOf: ReadonlyMap<string, number>, dir: 1 | -1): boolean {
  const id = stepProblem(order, lastFocusedRowId(), dir);
  const index = id ? indexOf.get(id) : undefined;
  if (!id || index === undefined) return false;
  setLastFocusedRowId(id);
  void focusCell(index, 0);
  return true;
}

/**
 * `counting`: pages are still loading, so a partial count would climb for a few seconds and read as broken.
 * Once every page is in, changes to the number are real (drift, fixes, pending turning stale).
 */
export function ProblemNav({
  order,
  indexOf,
  counting,
  onlyProblems,
  onToggleOnly,
}: {
  order: readonly string[];
  indexOf: ReadonlyMap<string, number>;
  counting?: boolean;
  /** The count is also the "Problems only" switch, so the number and the filter it controls sit together. */
  onlyProblems: boolean;
  onToggleOnly: () => void;
}) {
  const n = order.length;
  const text = counting ? "Counting…" : n === 1 ? "1 problem" : `${n} problems`;
  return (
    <span className={styles.problems}>
      <button
        type="button"
        className={[styles.problemCount, (counting || !n) && styles.quiet, onlyProblems && styles.pressed].filter(Boolean).join(" ")}
        aria-pressed={onlyProblems}
        aria-label={`${text}: show only these`}
        title={onlyProblems ? "Showing problems only. Click to show all listings" : "Show only listings with problems"}
        onClick={onToggleOnly}
      >
        {text}
      </button>
      <Button onClick={() => jumpToProblem(order, indexOf, 1)} disabled={n === 0} aria-keyshortcuts="n">
        Next problem <kbd className={styles.kbd}>n</kbd>
      </Button>
    </span>
  );
}
