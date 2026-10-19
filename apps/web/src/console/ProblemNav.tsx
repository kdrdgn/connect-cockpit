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

export function ProblemNav({ order, indexOf, loading }: { order: readonly string[]; indexOf: ReadonlyMap<string, number>; loading?: boolean }) {
  const n = order.length;
  return (
    <span className={styles.problems}>
      <span className={n ? styles.problemCount : styles.count}>{loading ? "– problems" : n === 1 ? "1 problem" : `${n} problems`}</span>
      <Button onClick={() => jumpToProblem(order, indexOf, 1)} disabled={n === 0} aria-keyshortcuts="n">
        Next problem <kbd className={styles.kbd}>n</kbd>
      </Button>
    </span>
  );
}
