import { useEffect, useRef } from "react";
import { useUi } from "./store";
import styles from "./Table.module.css";

/** Header checkbox over every loaded row in the view; shows "some" as indeterminate. */
export function SelectAll({ ids }: { ids: readonly string[] }) {
  const count = useUi((s) => (ids.length ? ids.reduce((n, id) => n + (s.selection.has(id) ? 1 : 0), 0) : 0));
  const setSelection = useUi((s) => s.setSelection);
  const clear = useUi((s) => s.clearSelection);
  const ref = useRef<HTMLInputElement>(null);
  const all = ids.length > 0 && count === ids.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && !all;
  }, [count, all]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.checkbox}
      checked={all}
      disabled={ids.length === 0}
      aria-label={all ? `Clear selection of all ${ids.length} rows` : `Select all ${ids.length} rows`}
      onChange={() => (all ? clear() : setSelection(ids))}
    />
  );
}
