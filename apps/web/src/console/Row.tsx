import { keys, useListing } from "@cockpit/client";
import { MARKETPLACES, type Listing, problemsOf } from "@cockpit/contract";
import { skipToken, useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { PriceGap } from "./PriceGap";
import { SyncGlyph } from "./SyncGlyph";
import { colIndex } from "./columns";
import { EditCell } from "./EditCell";
import { formatDate, formatDateLong } from "./format";
import { selectRow, useViewIds } from "./selection";
import { useBulkFailed, useIsSelected, useUi } from "./store";
import { syncKind, syncLabel } from "./sync";
import styles from "./Table.module.css";
import { useNow } from "./useNow";

const hasPending = (l: Listing) => MARKETPLACES.some((m) => l.sync[m].state === "pending");

const eventKey = (l: Listing) => `${l.event}|${l.date}`;

/**
 * The event and date of the row above, so a run of rows for the same event can show its name once and mute the
 * repeats. Selects just that string, so drift on the neighbour's prices or sync never re-renders this row.
 */
function usePreviousEventKey(previousId: string | undefined): string | undefined {
  return useQuery({
    queryKey: keys.listing(previousId ?? ""),
    queryFn: skipToken,
    staleTime: Infinity,
    enabled: previousId !== undefined,
    select: (l: Listing) => eventKey(l),
  }).data;
}

/** One listing. Subscribes to its own cache entry and selection bit, so drift on another row never renders this one. */
export const Row = memo(function Row({ id, index }: { id: string; index: number }) {
  const listing = useListing(id);
  const selected = useIsSelected(id);
  const viewIds = useViewIds();
  const bulkFailed = useBulkFailed(id);
  const open = useUi((s) => s.drawerId === id);
  const previousEvent = usePreviousEventKey(index > 0 ? viewIds[index - 1] : undefined);
  // Only rows with a pending marketplace need the clock, to notice when pending turns stale.
  const now = useNow(listing ? hasPending(listing) : false);
  if (!listing) return <PlaceholderRow index={index} />;

  const problems = problemsOf(listing, now).length;
  const cls = [styles.row, problems > 0 && styles.problem, bulkFailed && styles.failed, open && styles.open, selected && styles.selected]
    .filter(Boolean)
    .join(" ");
  return (
    <tr
      className={cls}
      aria-rowindex={index + 2}
      aria-selected={selected}
      data-index={index}
      data-id={id}
      onClick={(e) => {
        // A click anywhere but the row's own controls opens its sync details.
        if ((e.target as HTMLElement).closest("button, input, a, label")) return;
        useUi.getState().openDrawer(id, { row: index, col: 0 });
      }}
    >
      <td className={styles.center}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          onChange={() => {}}
          onClick={(e) => selectRow(viewIds, id, e.shiftKey)}
          aria-label={`Select ${listing.event}, section ${listing.section} row ${listing.row}`}
          data-row={index}
          data-col={colIndex("select")}
        />
      </td>
      <td className={previousEvent === eventKey(listing) ? `${styles.event} ${styles.repeat}` : styles.event} title={listing.event}>
        {listing.event}
        {problems > 0 && <span className={styles.srOnly}>{`, ${problems} problem${problems === 1 ? "" : "s"}`}</span>}
        {bulkFailed && <span className={styles.srOnly}>, last bulk change failed</span>}
      </td>
      <td className={styles.muted} title={formatDateLong(listing.date)}>
        {formatDate(listing.date)}
      </td>
      <td>{listing.section}</td>
      <td className={styles.muted}>{listing.row}</td>
      <td className={`${styles.num} ${styles.editCell}`}>
        <EditCell id={id} index={index} field="quantity" value={listing.quantity} version={listing.version} label="Quantity" />
      </td>
      <td className={`${styles.num} ${styles.editCell}`}>
        <EditCell
          id={id}
          index={index}
          field="price"
          value={listing.price}
          version={listing.version}
          label="Price"
          marketPrice={listing.marketPrice}
        />
      </td>
      <td className={styles.num}>
        <PriceGap price={listing.price} marketPrice={listing.marketPrice} />
      </td>
      {MARKETPLACES.map((m) => {
        const entry = listing.sync[m];
        return (
          <td key={m} className={styles.center}>
            <span className={styles.syncCell} role="img" aria-label={syncLabel(m, entry, listing.quantity, now)}>
              <SyncGlyph kind={syncKind(entry, listing.quantity, now)} />
            </span>
          </td>
        );
      })}
    </tr>
  );
});

/** Same height as a real row, so nothing shifts when the data arrives. */
export function PlaceholderRow({ index }: { index: number }) {
  return (
    <tr className={styles.placeholder} aria-rowindex={index + 2} aria-busy="true">
      <td colSpan={2}>
        <span className={styles.bar} style={{ width: `${40 + ((index * 37) % 45)}%` }} />
      </td>
      <td colSpan={10}>
        <span className={styles.bar} style={{ width: "60%" }} />
      </td>
    </tr>
  );
}
