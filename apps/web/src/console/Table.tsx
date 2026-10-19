import { density as densityTokens } from "@cockpit/tokens";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useRef } from "react";
import { COLUMNS, COLUMN_COUNT } from "./columns";
import { registerTable, trackRowFocus } from "./focus";
import { onTableKeyDown } from "./keyboard";
import { useViewIds } from "./selection";
import { PlaceholderRow, Row } from "./Row";
import { useUi } from "./store";
import styles from "./Table.module.css";

export const OVERSCAN = 10;
const FIRST_LOAD_PLACEHOLDERS = 30;

/**
 * A native <table> virtualized with spacer rows: one empty <tr> above and below the rendered window, sized to the
 * hidden rows. Row height is a token, so sizes are exact and nothing is measured.
 */
export function Table({
  ids,
  total,
  loading,
  dimmed,
  header,
  message,
  scrollerRef,
}: {
  ids: readonly (string | undefined)[];
  total: number;
  loading: boolean;
  dimmed: boolean;
  header: ReactNode;
  /** Shown as the only row when there is nothing to list (empty result or a failed load). */
  message?: ReactNode;
  scrollerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = scrollerRef ?? ownRef;
  const rowHeight = densityTokens[useUi((s) => s.density)].rowHeight;
  const viewIds = useViewIds();
  const count = message ? 0 : loading ? FIRST_LOAD_PLACEHOLDERS : ids.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => ref.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
  });
  useEffect(() => registerTable((i) => virtualizer.scrollToIndex(i, { align: "auto" }), loading ? 0 : ids.length), [virtualizer, loading, ids.length]);

  const items = virtualizer.getVirtualItems();
  const top = items[0]?.start ?? 0;
  const bottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);

  return (
    <div ref={ref} className={styles.scroller} data-table-scroller>
      <table
        className={dimmed ? `${styles.table} ${styles.dimmed}` : styles.table}
        aria-label="Listings"
        aria-rowcount={loading ? -1 : total + 1}
        aria-busy={loading || dimmed}
      >
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>{header}</thead>
        <tbody data-table-body onKeyDown={(e) => onTableKeyDown(e, viewIds)} onFocus={trackRowFocus}>
          {message && (
            <tr>
              <td colSpan={COLUMN_COUNT}>{message}</td>
            </tr>
          )}
          {top > 0 && (
            <tr className={styles.spacer} aria-hidden="true">
              <td colSpan={COLUMN_COUNT} style={{ height: top }} />
            </tr>
          )}
          {items.map((item) => {
            const id = loading ? undefined : ids[item.index];
            return id ? <Row key={id} id={id} index={item.index} /> : <PlaceholderRow key={`p${item.index}`} index={item.index} />;
          })}
          {bottom > 0 && (
            <tr className={styles.spacer} aria-hidden="true">
              <td colSpan={COLUMN_COUNT} style={{ height: bottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
