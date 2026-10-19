import { MARKETPLACES, type Marketplace, type Sort, type SortField } from "@cockpit/contract";
import type { ReactNode } from "react";
import { MARKETPLACE_NAME, MARKETPLACE_SHORT } from "./sync";
import styles from "./Table.module.css";

type SortProps = { sort: Sort; onSort: (field: SortField) => void };

function SortHeader({ field, children, numeric, sort, onSort }: SortProps & { field: SortField; children: ReactNode; numeric?: boolean }) {
  const active = sort.field === field;
  return (
    <th
      scope="col"
      className={numeric ? styles.num : undefined}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className={styles.sortButton} onClick={() => onSort(field)}>
        {children}
        <svg className={active ? styles.sortIconActive : styles.sortIcon} width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          {active && sort.dir === "desc" ? <path d="M4 7L.5 2h7z" fill="currentColor" /> : <path d="M4 1l3.5 5h-7z" fill="currentColor" />}
        </svg>
      </button>
    </th>
  );
}

export function HeaderRow({
  selectAll,
  sort,
  onSort,
  onMarketplace,
}: SortProps & { selectAll?: ReactNode; onMarketplace: (m: Marketplace) => void }) {
  const p = { sort, onSort };
  return (
    <tr aria-rowindex={1}>
      <th scope="col" className={styles.center}>
        {selectAll ?? <span className="srOnly">Select</span>}
      </th>
      <SortHeader field="event" {...p}>Event</SortHeader>
      <SortHeader field="date" {...p}>Date</SortHeader>
      <SortHeader field="section" {...p}>
        <abbr title="Section / row">Sec / Row</abbr>
      </SortHeader>
      <SortHeader field="quantity" numeric {...p}>
        <abbr title="Quantity">Qty</abbr>
      </SortHeader>
      <SortHeader field="price" numeric {...p}>Price</SortHeader>
      <th scope="col" className={styles.num}>
        <abbr title="Gap to market price">vs mkt</abbr>
      </th>
      {MARKETPLACES.map((m) => (
        <th key={m} scope="col" className={styles.center}>
          <button
            type="button"
            className={styles.sortButton}
            title={`${MARKETPLACE_NAME[m]}: filter by sync state`}
            aria-label={`${MARKETPLACE_SHORT[m]}: ${MARKETPLACE_NAME[m]}, filter by sync state`}
            onClick={() => onMarketplace(m)}
          >
            {MARKETPLACE_SHORT[m]}
          </button>
        </th>
      ))}
    </tr>
  );
}
